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

async function updateHeaderRules(settings: ExtensionSettings): Promise<void> {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map(r => r.id);

    const addRules: chrome.declarativeNetRequest.Rule[] = [];
    const condition = buildCondition(settings);

    const user = settings.users.find(u => u.id === settings.activeUserId);
    const tenant = settings.tenants.find(t => t.id === settings.activeTenantId);

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

    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

chrome.storage.onChanged.addListener(async (changes) => {
    if ('settings' in changes) {
        const newSettings = changes['settings'].newValue as ExtensionSettings;
        await updateHeaderRules(newSettings);
    }
});

chrome.runtime.onInstalled.addListener(async () => {
    const settings = await getSettings();
    await updateHeaderRules(settings);
});

chrome.runtime.onStartup.addListener(async () => {
    const settings = await getSettings();
    await updateHeaderRules(settings);
});

export {};
