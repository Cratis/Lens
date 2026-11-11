import type { ObservableQueryDiagnosticsSnapshot } from '@cratis/arc/queries';
import { isInspectablePageUrl, resolveBestTabForArcCapture } from '../shared/activeTab';

export type { ObservableQueryDiagnosticsSnapshot };
export type {
    HealthDiagnostics,
    TransportDiagnostics,
    MultiplexerDiagnostics,
    MultiplexerConnectionState,
    CacheDiagnostics,
    CacheEntryDiagnostics,
    OwnershipDiagnostics,
} from '@cratis/arc/queries';

// This walks the fiber tree the same way Arc context detection does, and deliberately keeps its own copy:
// chrome.scripting.executeScript serializes the function source and runs it in the page, so it cannot close
// over anything from module scope. Sharing the helpers would silently produce a ReferenceError in the page.

function captureObservableQueryDiagnosticsFromPage(): ObservableQueryDiagnosticsSnapshot | null {
    const arcContextMarkerProperty = 'reconnectQueries';
    const isRecord = (value: unknown): value is Record<string, unknown> =>
        typeof value === 'object' && value !== null;

    const isArcContextValue = (value: unknown): boolean => {
        if (!isRecord(value)) return false;
        return arcContextMarkerProperty in value;
    };

    const readSnapshot = (context: Record<string, unknown>): ObservableQueryDiagnosticsSnapshot | null => {
        const diag = context.observableQueryDiagnostics as Record<string, unknown> | undefined;
        if (!diag || typeof diag.getSnapshot !== 'function') return null;
        try {
            return (diag.getSnapshot as () => ObservableQueryDiagnosticsSnapshot)();
        } catch {
            return null;
        }
    };

    const findStartNodes = (root: Record<string, unknown>): object[] => {
        const fiberKey = Object.keys(root).find(key => key.startsWith('__reactFiber'));
        const containerKey = Object.keys(root).find(key => key.startsWith('__reactContainer'));
        const fiberNode = fiberKey ? root[fiberKey] : undefined;
        const containerNode = containerKey ? root[containerKey] : undefined;
        const current = isRecord(containerNode) ? containerNode.current : undefined;

        return [fiberNode, containerNode, current].filter(isRecord);
    };

    const unvisitedNeighbours = (node: Record<string, unknown>, visited: WeakSet<object>): object[] =>
        [node.child, node.sibling, node.return].filter(_ => isRecord(_) && !visited.has(_)) as object[];

    const root = document.getElementById('root');
    if (!root) return null;

    const queue = findStartNodes(root as unknown as Record<string, unknown>);
    const visited = new WeakSet<object>();

    while (queue.length > 0) {
        const node = queue.pop() as Record<string, unknown>;
        if (visited.has(node)) continue;
        visited.add(node);

        const contextValue = (node.memoizedProps as Record<string, unknown> | undefined)?.value;
        if (isArcContextValue(contextValue)) {
            return readSnapshot(contextValue as Record<string, unknown>);
        }

        queue.push(...unvisitedNeighbours(node, visited));
    }

    return null;
}

export async function captureObservableQueryDiagnosticsForActiveTab(): Promise<ObservableQueryDiagnosticsSnapshot | null> {
    const resolution = await resolveBestTabForArcCapture();
    const activeTab = resolution.tab;

    if (!activeTab?.id || !isInspectablePageUrl(activeTab.url)) {
        return null;
    }

    try {
        const [executionResult] = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            world: 'MAIN',
            func: captureObservableQueryDiagnosticsFromPage,
        });

        return (executionResult?.result as ObservableQueryDiagnosticsSnapshot | null | undefined) ?? null;
    } catch {
        return null;
    }
}
