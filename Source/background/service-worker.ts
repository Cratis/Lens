import { getSettings } from '../shared/storage';
import { ExtensionSettings, UserProfile } from '../shared/types';

const RULE_USER_HEADERS = 1;
const RULE_TENANT_HEADER = 2;

function buildClientPrincipal(user: UserProfile): string {
    const principal = {
        identityProvider: user.identityProvider || 'aad',
        userId: user.id,
        userDetails: user.name,
        userRoles: user.roles.length > 0 ? user.roles : ['authenticated', 'anonymous'],
        claims: user.claims.map(c => ({ typ: c.type, val: c.value })),
        ...user.applicationProperties,
    };
    return btoa(JSON.stringify(principal));
}

function buildUrlFilter(settings: ExtensionSettings): string {
    if (settings.arcBaseUrl) {
        try {
            const url = new URL(settings.arcBaseUrl);
            return `||${url.host}`;
        } catch {
            // fall through to wildcard
        }
    }
    return '*';
}

async function updateHeaderRules(settings: ExtensionSettings): Promise<void> {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map(r => r.id);

    const addRules: chrome.declarativeNetRequest.Rule[] = [];
    const urlFilter = buildUrlFilter(settings);

    const user = settings.users.find(u => u.id === settings.activeUserId);
    const tenant = settings.tenants.find(t => t.id === settings.activeTenantId);

    if (user) {
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
                urlFilter,
                resourceTypes: [
                    chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
                ],
            },
        });
    }

    if (tenant && settings.tenantHeaderName) {
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
                urlFilter,
                resourceTypes: [
                    chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
                ],
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
