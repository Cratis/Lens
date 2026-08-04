import { clearIdentityCookies } from '../shared/identity-cache';
import { getSettings } from '../shared/storage';
import { ExtensionSettings, UserProfile } from '../shared/types';

const RULE_USER_HEADERS = 1;
const RULE_TENANT_HEADER = 2;

function buildClientPrincipal(user: UserProfile): string {
    const identityDetails = user.identityDetails && typeof user.identityDetails === 'object'
        ? user.identityDetails
        : {};

    const principal = {
        identityProvider: user.identityProvider || 'aad',
        userId: user.id,
        userDetails: user.name,
        userRoles: user.roles.length > 0 ? user.roles : ['authenticated', 'anonymous'],
        claims: user.claims.map(c => ({ typ: c.type, val: c.value })),
        ...identityDetails,
        ...user.applicationProperties,
    };
    return btoa(JSON.stringify(principal));
}

// Null when no usable Arc host is configured, and the caller then installs no rules at all. Never fall back to
// a wildcard: host_permissions is <all_urls>, so a '*' filter attaches the impersonation headers to every XHR
// to every site the user browses. An unconfigured dev tool must do nothing, not broadcast an identity.
function buildUrlFilter(settings: ExtensionSettings): string | null {
    if (!settings.arcBaseUrl) {
        return null;
    }

    try {
        return `||${new URL(settings.arcBaseUrl).host}`;
    } catch {
        return null;
    }
}

function getHost(url: string): string | null {
    try {
        return new URL(url).hostname;
    } catch {
        return null;
    }
}

function buildCondition(settings: ExtensionSettings): chrome.declarativeNetRequest.RuleCondition | null {
    const initiatorHost = settings.arcPageOrigin ? getHost(settings.arcPageOrigin) : null;
    if (initiatorHost) {
        return {
            urlFilter: '*',
            initiatorDomains: [initiatorHost],
            resourceTypes: [
                chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
            ],
        };
    }

    const urlFilter = buildUrlFilter(settings);
    if (!urlFilter) {
        return null;
    }

    return {
        urlFilter,
        resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
        ],
    };
}

async function updateHeaderRules(): Promise<void> {
    const [settings, existingRules, existingSessionRules] = await Promise.all([
        getSettings(),
        chrome.declarativeNetRequest.getDynamicRules(),
        chrome.declarativeNetRequest.getSessionRules(),
    ]);
    const removeRuleIds = existingRules.map(rule => rule.id);

    const addRules: chrome.declarativeNetRequest.Rule[] = [];
    const condition = buildCondition(settings);

    const user = settings.users.find(userProfile => userProfile.id === settings.activeUserId);
    const tenant = settings.tenants.find(candidate => candidate.id === settings.activeTenantId);

    if (condition && user) {
        addRules.push({
            id: RULE_USER_HEADERS,
            priority: 1,
            action: {
                type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
                requestHeaders: [
                    {
                        header: 'X-MS-CLIENT-PRINCIPAL-ID',
                        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                        value: user.id,
                    },
                    {
                        header: 'X-MS-CLIENT-PRINCIPAL-NAME',
                        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                        value: user.name,
                    },
                    {
                        header: 'X-MS-CLIENT-PRINCIPAL',
                        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                        value: buildClientPrincipal(user),
                    },
                ],
            },
            condition: {
                ...condition,
            },
        });
    }

    if (condition && tenant && settings.tenantHeaderName) {
        addRules.push({
            id: RULE_TENANT_HEADER,
            priority: 1,
            action: {
                type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
                requestHeaders: [
                    {
                        header: settings.tenantHeaderName,
                        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                        value: tenant.id,
                    },
                ],
            },
            condition: {
                ...condition,
            },
        });
    }

    if (existingSessionRules.length > 0) {
        await chrome.declarativeNetRequest.updateSessionRules({
            removeRuleIds: existingSessionRules.map(rule => rule.id),
        });
    }

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds,
        addRules,
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

async function invalidateGlobalContext(previous: ExtensionSettings | undefined, next: ExtensionSettings | undefined): Promise<void> {
    if (!didGlobalSelectionChange(previous, next) || !next) {
        return;
    }

    const expectedOrigins = [
        getOrigin(next.arcPageOrigin),
        getOrigin(next.arcBaseUrl),
    ].filter((_) : _ is string => _ !== null);

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
    if (areaName === 'local' && 'settings' in changes) {
        await updateHeaderRules();
        await invalidateGlobalContext(
            changes.settings.oldValue as ExtensionSettings | undefined,
            changes.settings.newValue as ExtensionSettings | undefined);
    }
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
