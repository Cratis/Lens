import { ExtensionSettings, Tenant, UserProfile } from '../shared/types';

/**
 * The slice of the chrome extension API the specs exercise. Only what the code under test actually touches
 * is modeled -- a stub that grows past that stops being a stub and starts being a second implementation.
 */
export interface ChromeStub {
    localStore: Record<string, unknown>;
    syncStore: Record<string, unknown>;
    removedCookies: { url: string; name: string }[];
    cookiesByUrl: Record<string, chrome.cookies.Cookie[]>;
}

export function installChromeStub(): ChromeStub {
    const stub: ChromeStub = {
        localStore: {},
        syncStore: {},
        removedCookies: [],
        cookiesByUrl: {},
    };

    const readArea = (store: Record<string, unknown>) => (key: string) =>
        Promise.resolve(store[key] === undefined ? {} : { [key]: store[key] });

    const writeArea = (store: Record<string, unknown>) => (items: Record<string, unknown>) => {
        Object.assign(store, items);
        return Promise.resolve();
    };

    (globalThis as Record<string, unknown>).chrome = {
        storage: {
            local: { get: readArea(stub.localStore), set: writeArea(stub.localStore) },
            sync: { get: readArea(stub.syncStore), set: writeArea(stub.syncStore) },
        },
        cookies: {
            getAll: ({ url }: { url: string }) => Promise.resolve(stub.cookiesByUrl[url] ?? []),
            remove: ({ url, name }: { url: string; name: string }) => {
                stub.removedCookies.push({ url, name });
                return Promise.resolve(null);
            },
        },
        declarativeNetRequest: {
            ResourceType: { XMLHTTPREQUEST: 'xmlhttprequest' },
            RuleActionType: { MODIFY_HEADERS: 'modifyHeaders' },
            HeaderOperation: { SET: 'set' },
        },
    };

    return stub;
}

export function uninstallChromeStub(): void {
    delete (globalThis as Record<string, unknown>).chrome;
}

export function aUser(overrides: Partial<UserProfile> = {}): UserProfile {
    return {
        id: 'user-1',
        name: 'ada@example.com',
        displayName: 'Ada Lovelace',
        identityProvider: 'aad',
        roles: ['admin'],
        claims: [{ type: 'role', value: 'admin' }],
        applicationProperties: {},
        identityDetails: {},
        imageUrl: '',
        source: 'arc',
        ...overrides,
    };
}

export function aTenant(overrides: Partial<Tenant> = {}): Tenant {
    return {
        id: 'tenant-1',
        name: 'Contoso',
        description: '',
        imageUrl: '',
        source: 'arc',
        ...overrides,
    };
}

export function settingsWith(overrides: Partial<ExtensionSettings> = {}): ExtensionSettings {
    return {
        users: [],
        tenants: [],
        activeUserId: '',
        activeTenantId: '',
        tenantHeaderName: 'x-cratis-tenant-id',
        arcBaseUrl: 'http://localhost:5000',
        arcPageOrigin: '',
        ...overrides,
    };
}
