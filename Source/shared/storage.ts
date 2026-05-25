import { ExtensionSettings, UserProfile, Tenant } from './types';

export type PopupTab = 'settings' | 'context' | 'commands' | 'queries';

export interface ExtensionNavigationState {
    activeTab: PopupTab;
    commandsExpandedKeys: Record<string, boolean>;
    commandsSelectedKey: string;
    queriesExpandedKeys: Record<string, boolean>;
    queriesSelectedKey: string;
}

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
};

export async function getSettings(): Promise<ExtensionSettings> {
    const data = await chrome.storage.sync.get('settings');
    return { ...DEFAULT_SETTINGS, ...(data.settings as Partial<ExtensionSettings>) };
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
    await chrome.storage.sync.set({ settings });
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
