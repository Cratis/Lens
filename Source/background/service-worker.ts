import { clearIdentityCookies } from '../shared/identity-cache';
import { getSettings, SETTINGS_KEY } from '../shared/storage';
import { ExtensionSettings } from '../shared/types';
import { buildHeaderRules } from './headerRules';

async function updateHeaderRules(): Promise<void> {
    const [settings, existingRules, existingSessionRules] = await Promise.all([
        getSettings(),
        chrome.declarativeNetRequest.getDynamicRules(),
        chrome.declarativeNetRequest.getSessionRules(),
    ]);

    if (existingSessionRules.length > 0) {
        await chrome.declarativeNetRequest.updateSessionRules({
            removeRuleIds: existingSessionRules.map(rule => rule.id),
        });
    }

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRules.map(rule => rule.id),
        addRules: buildHeaderRules(settings),
    });
}

function didGlobalSelectionChange(previous: ExtensionSettings | undefined, next: ExtensionSettings | undefined): boolean {
    if (!previous || !next) {
        return false;
    }

    return previous.activeUserId !== next.activeUserId ||
        previous.activeTenantId !== next.activeTenantId;
}

function getOrigin(value: string | undefined): string | null {
    if (!value) {
        return null;
    }

    try {
        return new URL(value).origin;
    } catch {
        return null;
    }
}

async function reloadTab(tabId: number): Promise<void> {
    try {
        await chrome.tabs.reload(tabId);
    } catch (error) {
        console.warn('[Lens][Context] Could not reload tab after context change', {
            tabId,
            error: String(error),
        });
    }
}

// Headers alone do not change who you are once Arc has issued a session cookie: the app keeps presenting the
// identity it was first given. Dropping the cookie and reloading the matching tabs is what actually makes the
// newly selected user or tenant take effect.
async function invalidateGlobalContext(previous: ExtensionSettings | undefined, next: ExtensionSettings | undefined): Promise<void> {
    if (!didGlobalSelectionChange(previous, next) || !next) {
        return;
    }

    const expectedOrigins = [
        getOrigin(next.arcPageOrigin),
        getOrigin(next.arcBaseUrl),
    ].filter((_): _ is string => _ !== null);

    await clearIdentityCookies({
        arcBaseUrl: next.arcBaseUrl,
        arcPageOrigin: next.arcPageOrigin,
    });

    const tabs = await chrome.tabs.query({});
    await Promise.all(tabs.map(async tab => {
        if (!tab.id || !tab.url) {
            return;
        }

        const tabOrigin = getOrigin(tab.url);
        if (!tabOrigin || !expectedOrigins.includes(tabOrigin)) {
            return;
        }

        await reloadTab(tab.id);
    }));
}

async function handleStorageChanged(
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string): Promise<void> {
    if (areaName !== 'local' || !(SETTINGS_KEY in changes)) {
        return;
    }

    // Rules first, then the cookie, then the reload -- the reloaded page must already be inside the new
    // context, otherwise it re-authenticates as the identity that was just cleared.
    await updateHeaderRules();
    await invalidateGlobalContext(
        changes[SETTINGS_KEY].oldValue as ExtensionSettings | undefined,
        changes[SETTINGS_KEY].newValue as ExtensionSettings | undefined);
}

chrome.storage.onChanged.addListener((changes, areaName) => {
    void handleStorageChanged(changes, areaName);
});

chrome.runtime.onInstalled.addListener(async () => {
    await updateHeaderRules();
});

chrome.runtime.onStartup.addListener(async () => {
    await updateHeaderRules();
});

export {};
