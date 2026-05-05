import { ExtensionSettings, UserProfile, Tenant } from './types';

export const DEFAULT_SETTINGS: ExtensionSettings = {
    users: [],
    tenants: [],
    activeUserId: '',
    activeTenantId: '',
    tenantHeaderName: 'x-cratis-tenant-id',
    arcBaseUrl: 'http://localhost:5000',
};

export async function getSettings(): Promise<ExtensionSettings> {
    const data = await chrome.storage.sync.get('settings');
    return { ...DEFAULT_SETTINGS, ...(data.settings as Partial<ExtensionSettings>) };
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
    await chrome.storage.sync.set({ settings });
}

export function getActiveUser(settings: ExtensionSettings): UserProfile | undefined {
    return settings.users.find(u => u.id === settings.activeUserId);
}

export function getActiveTenant(settings: ExtensionSettings): Tenant | undefined {
    return settings.tenants.find(t => t.id === settings.activeTenantId);
}
