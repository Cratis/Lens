import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Tooltip } from 'primereact/tooltip';
import { ExtensionSettings } from './shared/types';
import {
    DEFAULT_NAVIGATION_STATE,
    DEFAULT_SETTINGS,
    getNavigationState,
    getSettings,
    saveNavigationState,
    saveSettings,
    PopupTab,
} from './shared/storage';
import { ArcContextSnapshot, captureArcContextForActiveTab, getArcContextSnapshot, saveArcContextSnapshot } from './shared/arc-context';
import { SettingsView } from './settings/SettingsView';
import { ContextView } from './context/ContextView';
import { CommandsView } from './commands/CommandsView';
import { QueriesView } from './queries/QueriesView';
import './lens-popup.css';

type Tab = PopupTab;

interface TabDefinition {
    id: Tab;
    label: string;
    iconClass: string;
    tooltip: string;
    disabled?: boolean;
}

export function LensPopup() {
    const [settings, setSettings] = useState<ExtensionSettings | null>(null);
    const [arcContext, setArcContext] = useState<ArcContextSnapshot | null>(null);
    const [arcContextLoading, setArcContextLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>(DEFAULT_NAVIGATION_STATE.activeTab);
    const [commandsExpandedKeys, setCommandsExpandedKeys] = useState<Record<string, boolean>>(DEFAULT_NAVIGATION_STATE.commandsExpandedKeys);
    const [commandsSelectedKey, setCommandsSelectedKey] = useState(DEFAULT_NAVIGATION_STATE.commandsSelectedKey);
    const [queriesExpandedKeys, setQueriesExpandedKeys] = useState<Record<string, boolean>>(DEFAULT_NAVIGATION_STATE.queriesExpandedKeys);
    const [queriesSelectedKey, setQueriesSelectedKey] = useState(DEFAULT_NAVIGATION_STATE.queriesSelectedKey);
    const [navigationHydrated, setNavigationHydrated] = useState(false);
    const [arcStatusHovered, setArcStatusHovered] = useState(false);
    const [saved, setSaved] = useState(false);
    const hasArcContext = arcContext?.isArcApplication === true;

    const refreshArcContext = async () => {
        setArcContextLoading(true);
        try {
            const freshSnapshot = await captureArcContextForActiveTab();
            await saveArcContextSnapshot(freshSnapshot);
            setArcContext(freshSnapshot);
        } finally {
            setArcContextLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            const loadedSettings = await getSettings();
            const loadedNavigationState = await getNavigationState();
            if (!cancelled) {
                setSettings(loadedSettings);
                setActiveTab(loadedNavigationState.activeTab);
                setCommandsExpandedKeys(loadedNavigationState.commandsExpandedKeys);
                setCommandsSelectedKey(loadedNavigationState.commandsSelectedKey);
                setQueriesExpandedKeys(loadedNavigationState.queriesExpandedKeys);
                setQueriesSelectedKey(loadedNavigationState.queriesSelectedKey);
                setNavigationHydrated(true);
            }

            const storedSnapshot = await getArcContextSnapshot();
            if (!cancelled && storedSnapshot) {
                setArcContext(storedSnapshot);
            }

            const freshSnapshot = await captureArcContextForActiveTab();
            await saveArcContextSnapshot(freshSnapshot);

            if (!cancelled) {
                setArcContext(freshSnapshot);
                setArcContextLoading(false);
            }
        };

        load().catch(() => {
            if (!cancelled) {
                setSettings(DEFAULT_SETTINGS);
                setNavigationHydrated(true);
                setArcContextLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const handleChange = async (updated: ExtensionSettings) => {
        setSettings(updated);
        await saveSettings(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const arcBaseUrl = arcContext?.baseUrl ?? '';

    const tabs = useMemo<TabDefinition[]>(() => ([
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
            tooltip: hasArcContext
                ? 'Commands: browse commands by namespace and execute them with structured input.'
                : 'Commands are available only when the active tab is an Arc application.',
            disabled: !hasArcContext,
        },
        {
            id: 'queries',
            label: 'Queries',
            iconClass: 'pi-search',
            tooltip: hasArcContext
                ? 'Queries: browse queries by namespace and perform them with tabular results.'
                : 'Queries are available only when the active tab is an Arc application.',
            disabled: !hasArcContext,
        },
        {
            id: 'settings',
            label: 'Settings',
            iconClass: 'pi-cog',
            tooltip: 'Manage user and tenant settings used by Lens context selection.',
        },
    ]), [hasArcContext]);

    const resolvedActiveTab = tabs.some(tab => tab.id === activeTab && !tab.disabled)
        ? activeTab
        : 'context';

    const activeTabTitle = tabs.find(_ => _.id === resolvedActiveTab)?.label ?? 'Lens';
    const shouldShowArcStatus = !arcContextLoading && !hasArcContext;
    const arcStatusTooltip = (() => {
        if (!shouldShowArcStatus) {
            return '';
        }

        const details = arcContext?.diagnostics;
        if (!details) {
            return 'Not an Arc application. Click to retry detection.';
        }

        const lines = [
            'Not an Arc application. Click to retry detection.',
            '',
            `tabSelectionStrategy: ${details.tabSelectionStrategy}`,
            `selectedTabId: ${details.selectedTabId ?? 'null'}`,
            `selectedTabUrl: ${details.selectedTabUrl ?? 'null'}`,
            `executeScriptStatus: ${details.executeScriptStatus}`,
            `detectionMethod: ${arcContext?.detectionMethod ?? 'n/a'}`,
            `pageOrigin: ${arcContext?.pageOrigin ?? 'null'}`,
        ];

        if (details.errorMessage) {
            lines.push(`errorMessage: ${details.errorMessage}`);
        }

        return lines.join('\n');
    })();

    useEffect(() => {
        if (!navigationHydrated) {
            return;
        }
        void saveNavigationState({ activeTab });
    }, [activeTab, navigationHydrated]);

    return (
        <div className="lens-settings-root">
            <Tooltip target=".lens-tab-button" position="right" showDelay={120} hideDelay={80} />
            <header className="options-header">
                <h1>Lens</h1>
                <span className="header-sub">{activeTabTitle}</span>
                {shouldShowArcStatus && (
                    <Button
                        className="arc-status-trigger"
                        text
                        rounded
                        aria-label="Arc detection status"
                        tooltip={arcStatusTooltip}
                        tooltipOptions={{ position: 'bottom', showDelay: 120, hideDelay: 80, className: 'arc-status-tooltip' }}
                        icon={arcStatusHovered ? 'pi pi-refresh' : 'pi pi-exclamation-triangle'}
                        onMouseEnter={() => setArcStatusHovered(true)}
                        onMouseLeave={() => setArcStatusHovered(false)}
                        onClick={() => void refreshArcContext()}
                    />
                )}
                {saved && <span className="saved-badge">Saved ✓</span>}
            </header>

            <div className="lens-layout">
                <nav className="left-nav" aria-label="Lens views">
                    {tabs.map(tab => (
                        <Button
                            key={tab.id}
                            className={`lens-tab-button ${tab.id === 'settings' ? 'is-settings-tab' : ''} ${resolvedActiveTab === tab.id ? 'is-active' : ''}`}
                            rounded
                            text
                            aria-label={tab.label}
                            data-pr-tooltip={tab.tooltip}
                            disabled={tab.disabled}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className={`pi ${tab.iconClass}`} aria-hidden="true" />
                        </Button>
                    ))}
                </nav>

                <main className="view-panel">
                    {resolvedActiveTab === 'settings' && (
                        <SettingsView settings={settings} onChange={handleChange} />
                    )}

                    {resolvedActiveTab === 'context' && (
                        <ContextView settings={settings} onChange={handleChange} />
                    )}

                    {resolvedActiveTab === 'commands' && hasArcContext && (
                        <CommandsView
                            arcBaseUrl={arcBaseUrl}
                            settings={settings}
                            persistedExpandedKeys={commandsExpandedKeys}
                            persistedSelectedKey={commandsSelectedKey}
                            onNavigationChanged={(expandedKeys, selectedKey) => {
                                setCommandsExpandedKeys(expandedKeys);
                                setCommandsSelectedKey(selectedKey);
                                void saveNavigationState({
                                    commandsExpandedKeys: expandedKeys,
                                    commandsSelectedKey: selectedKey,
                                });
                            }}
                        />
                    )}

                    {resolvedActiveTab === 'queries' && hasArcContext && (
                        <QueriesView
                            arcBaseUrl={arcBaseUrl}
                            settings={settings}
                            persistedExpandedKeys={queriesExpandedKeys}
                            persistedSelectedKey={queriesSelectedKey}
                            onNavigationChanged={(expandedKeys, selectedKey) => {
                                setQueriesExpandedKeys(expandedKeys);
                                setQueriesSelectedKey(selectedKey);
                                void saveNavigationState({
                                    queriesExpandedKeys: expandedKeys,
                                    queriesSelectedKey: selectedKey,
                                });
                            }}
                        />
                    )}
                </main>
            </div>
        </div>
    );
}
