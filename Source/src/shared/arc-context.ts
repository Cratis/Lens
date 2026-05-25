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
        if (depth > 6) return null;
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

    const visited = new Set<unknown>();
    const queue: unknown[] = [(root as unknown as Record<string, unknown>)[fiberKey]];

    while (queue.length > 0) {
        const node = queue.shift() as Record<string, unknown> | undefined;
        if (!node || visited.has(node)) continue;
        visited.add(node);

        const memoizedProps = node.memoizedProps as Record<string, unknown> | undefined;
        const contextValue = memoizedProps?.value;

        if (
            contextValue &&
            typeof contextValue === 'object' &&
            'reconnectQueries' in (contextValue as Record<string, unknown>)
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
        if (child && !visited.has(child)) queue.push(child);
        if (sibling && !visited.has(sibling)) queue.push(sibling);
        if (parent && !visited.has(parent)) queue.push(parent);
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
