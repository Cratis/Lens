import { PopupTab } from './shared/storage';

export interface TabDefinition {
    id: PopupTab;
    label: string;
    iconClass: string;
    tooltip: string;
    disabled?: boolean;
}

function arcOnlyTooltip(hasArcContext: boolean, available: string, unavailable: string): string {
    return hasArcContext ? available : unavailable;
}

export function buildTabDefinitions(hasArcContext: boolean): TabDefinition[] {
    return [
        {
            id: 'context',
            label: 'Context',
            iconClass: 'pi-users',
            tooltip: 'Current values: choose active user and tenant for this browser profile.',
        },
        {
            id: 'commands',
            label: 'Commands',
            iconClass: 'pi-play-circle',
            tooltip: arcOnlyTooltip(
                hasArcContext,
                'Commands: browse commands by namespace and execute them with structured input.',
                'Commands are available only when the active tab is an Arc application.'),
            disabled: !hasArcContext,
        },
        {
            id: 'queries',
            label: 'Queries',
            iconClass: 'pi-search',
            tooltip: arcOnlyTooltip(
                hasArcContext,
                'Queries: browse queries by namespace and perform them with tabular results.',
                'Queries are available only when the active tab is an Arc application.'),
            disabled: !hasArcContext,
        },
        {
            id: 'observable-query-diagnostics',
            label: 'Query Diagnostics',
            iconClass: 'pi-chart-line',
            tooltip: arcOnlyTooltip(
                hasArcContext,
                'Observable query diagnostics: live status of active observable queries.',
                'Query diagnostics are available only when the active tab is an Arc application.'),
            disabled: !hasArcContext,
        },
        {
            id: 'settings',
            label: 'Settings',
            iconClass: 'pi-cog',
            tooltip: 'Manage user and tenant settings used by Lens context selection.',
        },
    ];
}

// A stored tab that is disabled (or no longer exists) falls back to the context view.
export function resolveActiveTab(tabs: TabDefinition[], activeTab: PopupTab): PopupTab {
    return tabs.some(tab => tab.id === activeTab && !tab.disabled) ? activeTab : 'context';
}
