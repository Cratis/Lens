export interface TabResolutionResult {
    tab: chrome.tabs.Tab | undefined;
    strategy: string;
}

export function isInspectablePageUrl(url: string | undefined): boolean {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Picks the tab Lens should look at. The popup itself takes focus when it opens, and a developer may have
 * the Arc app in another window entirely, so "the active tab" is not one lookup but a preference order --
 * and the strategy that won is returned alongside, because when detection fails that is the first thing
 * worth knowing.
 */
export async function resolveBestTabForArcCapture(): Promise<TabResolutionResult> {
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
