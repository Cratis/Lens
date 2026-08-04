import { buildIdentityHeaders, buildTenantHeaders } from '../shared/requestHeaders';
import { ExtensionSettings } from '../shared/types';

export const RULE_USER_HEADERS = 1;
export const RULE_TENANT_HEADER = 2;

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

export function buildCondition(settings: ExtensionSettings): chrome.declarativeNetRequest.RuleCondition | null {
    const resourceTypes = [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST];

    const initiatorHost = settings.arcPageOrigin ? getHost(settings.arcPageOrigin) : null;
    if (initiatorHost) {
        return {
            urlFilter: '*',
            initiatorDomains: [initiatorHost],
            resourceTypes,
        };
    }

    const urlFilter = buildUrlFilter(settings);
    if (!urlFilter) {
        return null;
    }

    return { urlFilter, resourceTypes };
}

function toModifyHeadersRule(
    id: number,
    headers: Record<string, string>,
    condition: chrome.declarativeNetRequest.RuleCondition): chrome.declarativeNetRequest.Rule {
    return {
        id,
        priority: 1,
        action: {
            type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
            requestHeaders: Object.entries(headers).map(([header, value]) => ({
                header,
                operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                value,
            })),
        },
        condition: { ...condition },
    };
}

/**
 * The dynamic rules that carry the selected context onto the app's requests. Returns an empty list whenever
 * there is nothing safe to scope the rules to, so an unconfigured extension installs nothing at all.
 */
export function buildHeaderRules(settings: ExtensionSettings): chrome.declarativeNetRequest.Rule[] {
    const condition = buildCondition(settings);
    if (!condition) {
        return [];
    }

    const rules: chrome.declarativeNetRequest.Rule[] = [];
    const user = settings.users.find(_ => _.id === settings.activeUserId);
    const tenant = settings.tenants.find(_ => _.id === settings.activeTenantId);

    if (user) {
        rules.push(toModifyHeadersRule(RULE_USER_HEADERS, buildIdentityHeaders(user), condition));
    }

    const tenantHeaders = tenant ? buildTenantHeaders(tenant, settings.tenantHeaderName) : {};
    if (Object.keys(tenantHeaders).length > 0) {
        rules.push(toModifyHeadersRule(RULE_TENANT_HEADER, tenantHeaders, condition));
    }

    return rules;
}
