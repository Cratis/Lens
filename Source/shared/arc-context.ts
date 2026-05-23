export interface ArcContextSnapshot {
    isArcApplication: boolean;
    baseUrl: string | null;
    pageOrigin: string | null;
    configuration: Record<string, unknown> | null;
    capturedAt: number;
}

const ARC_CONTEXT_SNAPSHOT_KEY = 'arcContextSnapshot';

interface ArcContextDetectionResult {
    isArcApplication: boolean;
    baseUrl: string | null;
    pageOrigin: string;
    configuration: Record<string, unknown> | null;
}

const MAX_SANITIZATION_DEPTH = 6;
const ARC_CONTEXT_MARKER_PROPERTY = 'reconnectQueries';

function isObject(value: unknown): value is object {
    return typeof value === 'object' && value !== null;
}

function getOrigin(url: string | undefined): string | null {
    if (!url) return null;
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
}

function toSnapshot(result: ArcContextDetectionResult): ArcContextSnapshot {
    return {
        isArcApplication: result.isArcApplication,
        baseUrl: result.baseUrl,
        pageOrigin: result.pageOrigin,
        configuration: result.configuration,
        capturedAt: Date.now(),
    };
}

function createNonArcSnapshot(pageOrigin: string | null): ArcContextSnapshot {
    return {
        isArcApplication: false,
        baseUrl: null,
        pageOrigin,
        configuration: null,
        capturedAt: Date.now(),
    };
}

function detectArcContextFromPage(): ArcContextDetectionResult {
    function sanitize(value: unknown, depth = 0): unknown {
        if (depth > MAX_SANITIZATION_DEPTH) return null;
        if (value === null || value === undefined) return value;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
        if (Array.isArray(value)) return value.map(item => sanitize(item, depth + 1));
        if (typeof value === 'object') {
            const source = value as Record<string, unknown>;
            const output: Record<string, unknown> = {};
            for (const [key, child] of Object.entries(source)) {
                if (typeof child === 'function') continue;
                output[key] = sanitize(child, depth + 1);
            }
            return output;
        }
        return null;
    }

    function toAbsoluteBaseUrl(value: unknown, pageOrigin: string): string | null {
        if (typeof value !== 'string' || !value.trim()) return null;
        try {
            return new URL(value, pageOrigin).origin;
        } catch {
            return null;
        }
    }

    function getConfiguredBaseUrl(configuration: Record<string, unknown> | null, pageOrigin: string): string | null {
        if (!configuration) return null;
        // Arc apps may expose base URL under different configuration names.
        // We check the most explicit/common names first.
        const candidates = [
            configuration.baseUrl,
            configuration.apiBaseUrl,
            configuration.apiSurface,
            configuration.apiSurfaceBaseUrl,
            configuration.baseUri,
            configuration.baseAddress,
        ];

        for (const candidate of candidates) {
            const resolved = toAbsoluteBaseUrl(candidate, pageOrigin);
            if (resolved) {
                return resolved;
            }
        }

        return null;
    }

    const pageOrigin = window.location.origin;
    const root = document.getElementById('root');
    if (!root) {
        return {
            isArcApplication: false,
            baseUrl: null,
            pageOrigin,
            configuration: null,
        };
    }

    const fiberKey = Object.keys(root).find(key => key.startsWith('__reactFiber'));
    if (!fiberKey) {
        return {
            isArcApplication: false,
            baseUrl: null,
            pageOrigin,
            configuration: null,
        };
    }

    const visited = new WeakSet<object>();
    const fiberNode = (root as unknown as Record<string, unknown>)[fiberKey];
    const queue: object[] = isObject(fiberNode) ? [fiberNode] : [];

    while (queue.length > 0) {
        const node = queue.pop() as Record<string, unknown> | undefined;
        if (!node) continue;
        if (visited.has(node)) continue;
        visited.add(node);

        const memoizedProps = node.memoizedProps as Record<string, unknown> | undefined;
        const contextValue = memoizedProps?.value;

        if (
            contextValue &&
            typeof contextValue === 'object' &&
            ARC_CONTEXT_MARKER_PROPERTY in (contextValue as Record<string, unknown>)
        ) {
            const context = contextValue as Record<string, unknown>;
            const configuration = sanitize(context.configuration) as Record<string, unknown> | null;
            const baseUrl = getConfiguredBaseUrl(configuration, pageOrigin) ?? pageOrigin;

            return {
                isArcApplication: true,
                baseUrl,
                pageOrigin,
                configuration,
            };
        }

        const child = node.child;
        const sibling = node.sibling;
        const parent = node.return;
        if (isObject(child) && !visited.has(child)) queue.push(child);
        if (isObject(sibling) && !visited.has(sibling)) queue.push(sibling);
        if (isObject(parent) && !visited.has(parent)) queue.push(parent);
    }

    return {
        isArcApplication: false,
        baseUrl: null,
        pageOrigin,
        configuration: null,
    };
}

export async function captureArcContextForActiveTab(): Promise<ArcContextSnapshot> {
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const pageOrigin = getOrigin(activeTab?.url);
    if (!activeTab?.id || !activeTab.url) {
        return createNonArcSnapshot(pageOrigin);
    }

    if (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://')) {
        return createNonArcSnapshot(pageOrigin);
    }

    try {
        const [executionResult] = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            // Arc context is exposed on page-owned React fiber nodes, so this needs page-world access.
            world: 'MAIN',
            func: detectArcContextFromPage,
        });

        const result = executionResult?.result as ArcContextDetectionResult | undefined;
        if (!result) {
            return createNonArcSnapshot(pageOrigin);
        }

        return toSnapshot(result);
    } catch {
        return createNonArcSnapshot(pageOrigin);
    }
}

export async function saveArcContextSnapshot(snapshot: ArcContextSnapshot): Promise<void> {
    await chrome.storage.session.set({ [ARC_CONTEXT_SNAPSHOT_KEY]: snapshot });
}

export async function getArcContextSnapshot(): Promise<ArcContextSnapshot | null> {
    const data = await chrome.storage.session.get(ARC_CONTEXT_SNAPSHOT_KEY);
    return (data[ARC_CONTEXT_SNAPSHOT_KEY] as ArcContextSnapshot | undefined) ?? null;
}
