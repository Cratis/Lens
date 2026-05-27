export interface ArcContextSnapshot {
    isArcApplication: boolean;
    baseUrl: string | null;
    pageOrigin: string | null;
    configuration: Record<string, unknown> | null;
    detectionMethod?: 'context' | 'path-fallback';
    diagnostics?: ArcContextDiagnostics;
    capturedAt: number;
}

export interface ArcContextDiagnostics {
    selectedTabId: number | null;
    selectedTabUrl: string | null;
    tabSelectionStrategy: string;
    executeScriptStatus: 'not-run' | 'success' | 'empty-result' | 'error';
    errorMessage: string | null;
}

const ARC_CONTEXT_SNAPSHOT_KEY = 'arcContextSnapshot';

interface ArcContextDetectionResult {
    isArcApplication: boolean;
    baseUrl: string | null;
    pageOrigin: string;
    configuration: Record<string, unknown> | null;
    detectionMethod: 'context' | 'path-fallback';
}

function isInspectablePageUrl(url: string | undefined): boolean {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
}

interface TabResolutionResult {
    tab: chrome.tabs.Tab | undefined;
    strategy: string;
}

async function resolveBestTabForArcCapture(): Promise<TabResolutionResult> {
    const [activeLastFocused] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (isInspectablePageUrl(activeLastFocused?.url)) {
        return { tab: activeLastFocused, strategy: 'active-last-focused' };
    }

    const activeTabs = await chrome.tabs.query({ active: true });
    const activeInspectable = activeTabs.find(tab => isInspectablePageUrl(tab.url));
    if (activeInspectable) {
        return { tab: activeInspectable, strategy: 'active-any-window' };
    }

    const allTabs = await chrome.tabs.query({});
    const inspectableTabs = allTabs
        .filter(tab => isInspectablePageUrl(tab.url))
        .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));

    if (inspectableTabs[0]) {
        return { tab: inspectableTabs[0], strategy: 'most-recent-inspectable' };
    }

    return { tab: undefined, strategy: 'none' };
}

function getOrigin(url: string | undefined): string | null {
    if (!url) return null;
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
}

function toSnapshot(result: ArcContextDetectionResult, diagnostics: ArcContextDiagnostics): ArcContextSnapshot {
    return {
        isArcApplication: result.isArcApplication,
        baseUrl: result.baseUrl,
        pageOrigin: result.pageOrigin,
        configuration: result.configuration,
        detectionMethod: result.detectionMethod,
        diagnostics,
        capturedAt: Date.now(),
    };
}

function createNonArcSnapshot(pageOrigin: string | null, diagnostics?: ArcContextDiagnostics): ArcContextSnapshot {
    return {
        isArcApplication: false,
        baseUrl: null,
        pageOrigin,
        configuration: null,
        detectionMethod: 'path-fallback',
        diagnostics,
        capturedAt: Date.now(),
    };
}

function looksLikeArcApplicationPath(pathname: string): boolean {
    const guid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
    const pattern = new RegExp(`^/projects/${guid}/application/${guid}(?:/|$)`);
    return pattern.test(pathname);
}

function looksLikeArcApplicationUrl(url: string | undefined): boolean {
    if (!url) return false;
    try {
        return looksLikeArcApplicationPath(new URL(url).pathname);
    } catch {
        return false;
    }
}

function looksLikeLocalDevelopmentUrl(url: string | undefined): boolean {
    if (!url) {
        return false;
    }

    try {
        const parsed = new URL(url);
        if (!(parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
            return false;
        }

        return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
        return false;
    }
}

function detectArcContextFromPage(): ArcContextDetectionResult {
    const maxSanitizationDepth = 6;
    const arcContextMarkerProperty = 'reconnectQueries';
    const arcConfigurationBaseUrlKeys = [
        'baseUrl',
        'apiBaseUrl',
        'apiSurface',
        'apiSurfaceBaseUrl',
        'baseUri',
        'baseAddress',
    ];

    const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

    const looksLikeArcApplicationPathLocal = (pathname: string): boolean => {
        const guid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
        const pattern = new RegExp(`^/projects/${guid}/application/${guid}(?:/|$)`);
        return pattern.test(pathname);
    };

    const toAbsoluteBaseUrlLocal = (value: unknown, pageOrigin: string): string | null => {
        if (typeof value !== 'string' || !value.trim()) return null;
        try {
            return new URL(value, pageOrigin).origin;
        } catch {
            return null;
        }
    };

    const getConfiguredBaseUrlLocal = (configuration: Record<string, unknown> | null, pageOrigin: string): string | null => {
        if (!configuration) return null;
        for (const key of arcConfigurationBaseUrlKeys) {
            const resolved = toAbsoluteBaseUrlLocal(configuration[key], pageOrigin);
            if (resolved) {
                return resolved;
            }
        }
        return null;
    };

    const isArcContextValueLocal = (value: unknown): value is Record<string, unknown> => {
        if (!isRecord(value)) {
            return false;
        }

        const candidate = value as Record<string, unknown>;
        if (arcContextMarkerProperty in candidate) {
            return true;
        }

        const configuration = candidate.configuration;
        if (!isRecord(configuration)) {
            return false;
        }

        return arcConfigurationBaseUrlKeys.some(key => key in configuration);
    };

    function sanitize(value: unknown, depth = 0): unknown {
        if (depth > maxSanitizationDepth) return null;
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

    const pageOrigin = window.location.origin;
    const pagePathname = window.location.pathname;
    const root = document.getElementById('root');
    if (!root) {
        return {
            isArcApplication: looksLikeArcApplicationPathLocal(pagePathname),
            baseUrl: looksLikeArcApplicationPathLocal(pagePathname) ? pageOrigin : null,
            pageOrigin,
            configuration: null,
            detectionMethod: 'path-fallback',
        };
    }

    const fiberKey = Object.keys(root).find(key => key.startsWith('__reactFiber'));
    const containerKey = Object.keys(root).find(key => key.startsWith('__reactContainer'));
    if (!fiberKey && !containerKey) {
        return {
            isArcApplication: looksLikeArcApplicationPathLocal(pagePathname),
            baseUrl: looksLikeArcApplicationPathLocal(pagePathname) ? pageOrigin : null,
            pageOrigin,
            configuration: null,
            detectionMethod: 'path-fallback',
        };
    }

    const visited = new WeakSet<object>();
    const rootObject = root as unknown as Record<string, unknown>;
    const fiberNode = fiberKey ? rootObject[fiberKey] : undefined;
    const containerNode = containerKey ? rootObject[containerKey] : undefined;
    const queue: object[] = [];
    if (isRecord(fiberNode)) {
        queue.push(fiberNode);
    }
    if (isRecord(containerNode)) {
        queue.push(containerNode);
        const current = (containerNode as Record<string, unknown>).current;
        if (isRecord(current)) {
            queue.push(current);
        }
    }

    while (queue.length > 0) {
        const node = queue.pop() as Record<string, unknown> | undefined;
        if (!node) continue;
        if (visited.has(node)) continue;
        visited.add(node);

        const memoizedProps = node.memoizedProps as Record<string, unknown> | undefined;
        const contextValue = memoizedProps?.value;

        if (isArcContextValueLocal(contextValue)) {
            const context = contextValue as Record<string, unknown>;
            const configuration = sanitize(context.configuration) as Record<string, unknown> | null;
            const baseUrl = getConfiguredBaseUrlLocal(configuration, pageOrigin) ?? pageOrigin;

            return {
                isArcApplication: true,
                baseUrl,
                pageOrigin,
                configuration,
                detectionMethod: 'context',
            };
        }

        const child = node.child;
        const sibling = node.sibling;
        const parent = node.return;
        if (isRecord(child) && !visited.has(child)) queue.push(child);
        if (isRecord(sibling) && !visited.has(sibling)) queue.push(sibling);
        if (isRecord(parent) && !visited.has(parent)) queue.push(parent);
    }

    return {
        isArcApplication: looksLikeArcApplicationPathLocal(pagePathname),
        baseUrl: looksLikeArcApplicationPathLocal(pagePathname) ? pageOrigin : null,
        pageOrigin,
        configuration: null,
        detectionMethod: 'path-fallback',
    };
}

export async function captureArcContextForActiveTab(): Promise<ArcContextSnapshot> {
    const resolution = await resolveBestTabForArcCapture();
    const activeTab = resolution.tab;
    const diagnostics: ArcContextDiagnostics = {
        selectedTabId: activeTab?.id ?? null,
        selectedTabUrl: activeTab?.url ?? null,
        tabSelectionStrategy: resolution.strategy,
        executeScriptStatus: 'not-run',
        errorMessage: null,
    };

    const pageOrigin = getOrigin(activeTab?.url);
    const arcByUrl = looksLikeArcApplicationUrl(activeTab?.url) || looksLikeLocalDevelopmentUrl(activeTab?.url);
    if (!activeTab?.id || !activeTab.url) {
        console.info('[Lens][ArcContext] No inspectable tab found', diagnostics);
        return createNonArcSnapshot(pageOrigin, diagnostics);
    }

    if (!isInspectablePageUrl(activeTab.url)) {
        console.info('[Lens][ArcContext] Selected tab is not inspectable', diagnostics);
        return createNonArcSnapshot(pageOrigin, diagnostics);
    }

    console.info('[Lens][ArcContext] Capturing context', diagnostics);

    try {
        const [executionResult] = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            // Arc context is exposed on page-owned React fiber nodes, so this needs page-world access.
            world: 'MAIN',
            func: detectArcContextFromPage,
        });

        const result = executionResult?.result as ArcContextDetectionResult | undefined;
        if (!result) {
            diagnostics.executeScriptStatus = 'empty-result';
            console.info('[Lens][ArcContext] executeScript returned no result', diagnostics);
            if (arcByUrl) {
                return {
                    isArcApplication: true,
                    baseUrl: pageOrigin,
                    pageOrigin,
                    configuration: null,
                    detectionMethod: 'path-fallback',
                    diagnostics,
                    capturedAt: Date.now(),
                };
            }
            return createNonArcSnapshot(pageOrigin, diagnostics);
        }

        diagnostics.executeScriptStatus = 'success';
        console.info('[Lens][ArcContext] Context result', {
            ...diagnostics,
            isArcApplication: result.isArcApplication,
            baseUrl: result.baseUrl,
            detectionMethod: result.detectionMethod,
        });

        return toSnapshot(result, diagnostics);
    } catch (error) {
        diagnostics.executeScriptStatus = 'error';
        diagnostics.errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('[Lens][ArcContext] executeScript failed', diagnostics);
        if (arcByUrl) {
            return {
                isArcApplication: true,
                baseUrl: pageOrigin,
                pageOrigin,
                configuration: null,
                detectionMethod: 'path-fallback',
                diagnostics,
                capturedAt: Date.now(),
            };
        }
        return createNonArcSnapshot(pageOrigin, diagnostics);
    }
}

export async function saveArcContextSnapshot(snapshot: ArcContextSnapshot): Promise<void> {
    await chrome.storage.session.set({ [ARC_CONTEXT_SNAPSHOT_KEY]: snapshot });
}

export async function getArcContextSnapshot(): Promise<ArcContextSnapshot | null> {
    const data = await chrome.storage.session.get(ARC_CONTEXT_SNAPSHOT_KEY);
    return (data[ARC_CONTEXT_SNAPSHOT_KEY] as ArcContextSnapshot | undefined) ?? null;
}
