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

    const root = document.getElementById('root');
    if (!root) return null;

    const fiberKey = Object.keys(root).find(key => key.startsWith('__reactFiber'));
    const containerKey = Object.keys(root).find(key => key.startsWith('__reactContainer'));
    if (!fiberKey && !containerKey) return null;

    const visited = new WeakSet<object>();
    const rootObject = root as unknown as Record<string, unknown>;
    const fiberNode = fiberKey ? rootObject[fiberKey] : undefined;
    const containerNode = containerKey ? rootObject[containerKey] : undefined;
    const queue: object[] = [];
    if (isRecord(fiberNode)) queue.push(fiberNode);
    if (isRecord(containerNode)) {
        queue.push(containerNode);
        const current = (containerNode as Record<string, unknown>).current;
        if (isRecord(current)) queue.push(current);
    }

    while (queue.length > 0) {
        const node = queue.pop() as Record<string, unknown> | undefined;
        if (!node) continue;
        if (visited.has(node)) continue;
        visited.add(node);

        const memoizedProps = node.memoizedProps as Record<string, unknown> | undefined;
        const contextValue = memoizedProps?.value;

        if (isArcContextValue(contextValue)) {
            const context = contextValue as Record<string, unknown>;
            const diag = context.observableQueryDiagnostics as Record<string, unknown> | undefined;
            if (diag && typeof diag.getSnapshot === 'function') {
                try {
                    return (diag.getSnapshot as () => ObservableQueryDiagnosticsSnapshot)();
                } catch {
                    return null;
                }
            }
            return null;
        }

        const child = node.child;
        const sibling = node.sibling;
        const parent = node.return;
        if (isRecord(child) && !visited.has(child)) queue.push(child);
        if (isRecord(sibling) && !visited.has(sibling)) queue.push(sibling);
        if (isRecord(parent) && !visited.has(parent)) queue.push(parent);
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
