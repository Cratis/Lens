import { ExtensionSettings, UserProfile, Tenant } from './types';

export type PopupTab = 'settings' | 'context' | 'commands' | 'queries' | 'observable-query-diagnostics';

export interface ExtensionNavigationState {
    activeTab: PopupTab;
    commandsExpandedKeys: Record<string, boolean>;
    commandsSelectedKey: string;
    queriesExpandedKeys: Record<string, boolean>;
    queriesSelectedKey: string;
}

const SETTINGS_KEY = 'settings';
const NAVIGATION_STATE_KEY = 'navigationState';

export const DEFAULT_NAVIGATION_STATE: ExtensionNavigationState = {
    activeTab: 'context',
    commandsExpandedKeys: {},
    commandsSelectedKey: '',
    queriesExpandedKeys: {},
    queriesSelectedKey: '',
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
    users: [],
    tenants: [],
    activeUserId: '',
    activeTenantId: '',
    tenantHeaderName: 'x-cratis-tenant-id',
    arcBaseUrl: 'http://localhost:5000',
    arcPageOrigin: '',
};

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function normalizeUser(user: Partial<UserProfile>): UserProfile {
    const identityDetails = isObject(user.identityDetails)
        ? user.identityDetails
        : user.applicationProperties ?? {};

    return {
        id: typeof user.id === 'string' ? user.id : '',
        name: typeof user.name === 'string' ? user.name : '',
        displayName: typeof user.displayName === 'string' ? user.displayName : '',
        identityProvider: typeof user.identityProvider === 'string' ? user.identityProvider : 'aad',
        roles: Array.isArray(user.roles) ? user.roles.map(_ => String(_)) : [],
        claims: Array.isArray(user.claims)
            ? user.claims
                .filter(_ => isObject(_))
                .map(_ => ({
                    type: typeof _.type === 'string' ? _.type : '',
                    value: typeof _.value === 'string' ? _.value : '',
                }))
            : [],
        applicationProperties: isObject(user.applicationProperties)
            ? Object.fromEntries(Object.entries(user.applicationProperties).map(([key, value]) => [key, String(value)]))
            : {},
        identityDetails,
        imageUrl: typeof user.imageUrl === 'string' ? user.imageUrl : '',
        source: user.source === 'arc' ? 'arc' : 'custom',
    };
}

function normalizeTenant(tenant: Partial<Tenant>): Tenant {
    return {
        id: typeof tenant.id === 'string' ? tenant.id : '',
        name: typeof tenant.name === 'string' ? tenant.name : '',
        description: typeof tenant.description === 'string' ? tenant.description : '',
        imageUrl: typeof tenant.imageUrl === 'string' ? tenant.imageUrl : '',
        source: tenant.source === 'arc' ? 'arc' : 'custom',
    };
}

function normalizeSettings(settings: Partial<ExtensionSettings>): ExtensionSettings {
    return {
        ...DEFAULT_SETTINGS,
        ...settings,
        users: Array.isArray(settings.users)
            ? settings.users.map(_ => normalizeUser(_ as Partial<UserProfile>))
            : DEFAULT_SETTINGS.users,
        tenants: Array.isArray(settings.tenants)
            ? settings.tenants.map(_ => normalizeTenant(_ as Partial<Tenant>))
            : DEFAULT_SETTINGS.tenants,
    };
}

// Settings live in chrome.storage.local, never chrome.storage.sync. Every profile is one object under one
// key, and sync enforces QUOTA_BYTES_PER_ITEM = 8192 per key -- which a real Arc roster passes at the seventh
// user, because each carries its own claims and identity details. Past that, set() rejects, nothing persists,
// and the next read falls back to the defaults: the extension presents as signed out rather than as unable to
// save. local is 10MB with no per-item cap, and impersonation settings are worth nothing on another machine.
export async function getSettings(): Promise<ExtensionSettings> {
    const data = await chrome.storage.local.get(SETTINGS_KEY);
    if (data[SETTINGS_KEY] !== undefined) {
        return normalizeSettings(data[SETTINGS_KEY] as Partial<ExtensionSettings>);
    }

    // Carry over a config small enough to have survived in sync, so upgrading keeps the roster it holds.
    const legacy = await chrome.storage.sync.get(SETTINGS_KEY);
    return normalizeSettings((legacy[SETTINGS_KEY] as Partial<ExtensionSettings>) ?? {});
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function getNavigationState(): Promise<ExtensionNavigationState> {
    const data = await chrome.storage.local.get(NAVIGATION_STATE_KEY);
    return {
        ...DEFAULT_NAVIGATION_STATE,
        ...(data[NAVIGATION_STATE_KEY] as Partial<ExtensionNavigationState> | undefined),
    };
}

export async function saveNavigationState(partial: Partial<ExtensionNavigationState>): Promise<void> {
    const existing = await getNavigationState();
    await chrome.storage.local.set({
        [NAVIGATION_STATE_KEY]: {
            ...existing,
            ...partial,
        },
    });
}

export function getActiveUser(settings: ExtensionSettings): UserProfile | undefined {
    return settings.users.find(u => u.id === settings.activeUserId);
}

export function getActiveTenant(settings: ExtensionSettings): Tenant | undefined {
    return settings.tenants.find(t => t.id === settings.activeTenantId);
}
