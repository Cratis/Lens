import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Tooltip } from 'primereact/tooltip';
import { JsonSchema } from './arc/introspection';
import { buildContextRequestHeaders } from './shared/requestHeaders';
import { ExtensionSettings } from './shared/types';
import {
    DEFAULT_NAVIGATION_STATE,
    DEFAULT_SETTINGS,
    getNavigationState,
    getSettings,
    saveNavigationState,
    PopupTab,
} from './shared/storage';
import { persistSettings } from './shared/settingsPersistence';
import { ArcContextSnapshot, captureArcContextForActiveTab, getArcContextSnapshot, saveArcContextSnapshot } from './shared/arc-context';
import { SettingsView } from './settings/SettingsView';
import { ContextView } from './context/ContextView';
import { CommandsView } from './commands/CommandsView';
import { QueriesView } from './queries/QueriesView';
import { ObservableQueryDiagnosticsView } from './observable-query-diagnostics/ObservableQueryDiagnosticsView';
import {
    fetchArcDevelopmentSources,
    fetchArcTenants,
    fetchArcUsers,
    mergeArcSourcedSettings,
    mergeArcTenants,
    mergeArcUsers,
} from './settings/arcDevelopmentSources';
import { buildArcStatusTooltip } from './arcStatusTooltip';
import { buildTabDefinitions, resolveActiveTab, TabDefinition } from './lensPopupTabs';
import './lens-popup.css';

type Tab = PopupTab;

interface PopupHeaderProps {
    title: string;
    showArcStatus: boolean;
    arcStatusTooltip: string;
    saved: boolean;
    persistError: string | null;
    onRefreshArcContext: () => void;
}

function PopupHeader({ title, showArcStatus, arcStatusTooltip, saved, persistError, onRefreshArcContext }: PopupHeaderProps) {
    const [arcStatusHovered, setArcStatusHovered] = useState(false);

    return (
        <header className="options-header">
            <img className="lens-header-logo" src="/icons/cratis-symbol-white.svg" alt="Cratis" />
            <h1>Lens</h1>
            <span className="header-sub">{title}</span>
            {showArcStatus && (
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
                    onClick={onRefreshArcContext}
                />
            )}
            {saved && <span className="saved-badge">Saved ✓</span>}
            {persistError && (
                <span className="persist-error-badge" role="alert" title={persistError}>
                    <span className="pi pi-exclamation-triangle" aria-hidden="true" />
                    Not saved
                </span>
            )}
        </header>
    );
}

interface TabNavigationProps {
    tabs: TabDefinition[];
    activeTab: Tab;
    onSelect: (tab: Tab) => void;
}

function TabNavigation({ tabs, activeTab, onSelect }: TabNavigationProps) {
    return (
        <nav className="left-nav" aria-label="Lens views">
            {tabs.map(tab => (
                <Button
                    key={tab.id}
                    className={`lens-tab-button ${tab.id === 'settings' ? 'is-settings-tab' : ''} ${activeTab === tab.id ? 'is-active' : ''}`}
                    rounded
                    text
                    aria-label={tab.label}
                    data-pr-tooltip={tab.tooltip}
                    disabled={tab.disabled}
                    onClick={() => onSelect(tab.id)}
                >
                    <span className={`pi ${tab.iconClass}`} aria-hidden="true" />
                </Button>
            ))}
        </nav>
    );
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
    const [saved, setSaved] = useState(false);
    const [persistError, setPersistError] = useState<string | null>(null);
    const [identityDetailsSchema, setIdentityDetailsSchema] = useState<JsonSchema | undefined>(undefined);
    const [settingsUsersRefreshing, setSettingsUsersRefreshing] = useState(false);
    const [settingsTenantsRefreshing, setSettingsTenantsRefreshing] = useState(false);
    const hasArcContext = arcContext?.isArcApplication === true;

    const mergeAndPersistArcSources = async (snapshot: ArcContextSnapshot, currentSettings: ExtensionSettings): Promise<ExtensionSettings> => {
        if (!snapshot.isArcApplication || !snapshot.baseUrl) {
            setIdentityDetailsSchema(undefined);
            return currentSettings;
        }

        try {
            const sources = await fetchArcDevelopmentSources(snapshot.baseUrl, {
                headers: buildContextRequestHeaders(currentSettings),
            });
            if (sources.identityDetailsSchema) {
                setIdentityDetailsSchema(sources.identityDetailsSchema);
            }

            console.info('[Lens][Settings] Full Arc refresh fetched', {
                baseUrl: snapshot.baseUrl,
                users: sources.users.length,
                tenants: sources.tenants.length,
                hasSchema: !!sources.identityDetailsSchema,
            });

            const mergedSettings = mergeArcSourcedSettings(currentSettings, sources);
            console.info('[Lens][Settings] Full Arc refresh merged', {
                usersBefore: currentSettings.users.length,
                usersAfter: mergedSettings.users.length,
                tenantsBefore: currentSettings.tenants.length,
                tenantsAfter: mergedSettings.tenants.length,
            });
            if (JSON.stringify(currentSettings) !== JSON.stringify(mergedSettings)) {
                setSettings(mergedSettings);
                setPersistError(await persistSettings(mergedSettings));
            }

            return mergedSettings;
        } catch (error) {
            // Never swallow this. A fetch that fails here leaves the popup showing whatever roster it already
            // had, so without the log there is nothing anywhere connecting an unreachable Arc host to the
            // stale view. The persist no longer lands in this catch -- it reports through setPersistError.
            console.error('[Lens][Settings] Full Arc refresh failed', error);
            return currentSettings;
        }
    };

    const syncArcRoutingSettings = async (snapshot: ArcContextSnapshot, currentSettings: ExtensionSettings): Promise<ExtensionSettings> => {
        const nextBaseUrl = snapshot.baseUrl ?? currentSettings.arcBaseUrl;
        const nextPageOrigin = snapshot.pageOrigin ?? currentSettings.arcPageOrigin;

        if (nextBaseUrl === currentSettings.arcBaseUrl && nextPageOrigin === currentSettings.arcPageOrigin) {
            return currentSettings;
        }

        const updated = {
            ...currentSettings,
            arcBaseUrl: nextBaseUrl,
            arcPageOrigin: nextPageOrigin,
        };

        setSettings(updated);
        setPersistError(await persistSettings(updated));
        return updated;
    };

    const refreshArcContext = async () => {
        setArcContextLoading(true);
        try {
            const freshSnapshot = await captureArcContextForActiveTab();
            await saveArcContextSnapshot(freshSnapshot);
            setArcContext(freshSnapshot);

            if (settings) {
                const withRouting = await syncArcRoutingSettings(freshSnapshot, settings);
                await mergeAndPersistArcSources(freshSnapshot, withRouting);
            }
        } catch (error) {
            console.error('[Lens][Settings] Arc context refresh failed', error);
        } finally {
            setArcContextLoading(false);
        }
    };

    const refreshUsers = async () => {
        if (!settings) {
            return;
        }

        setSettingsUsersRefreshing(true);
        try {
            if (!arcContext) {
                await refreshArcContext();
                return;
            }

            const freshSnapshot = await captureArcContextForActiveTab();
            await saveArcContextSnapshot(freshSnapshot);
            setArcContext(freshSnapshot);

            if (!freshSnapshot.isArcApplication || !freshSnapshot.baseUrl) {
                return;
            }

            const sources = await fetchArcUsers(freshSnapshot.baseUrl, {
                headers: buildContextRequestHeaders(settings),
            });
            if (sources.identityDetailsSchema) {
                setIdentityDetailsSchema(sources.identityDetailsSchema);
            }

            console.info('[Lens][Settings] Users refresh fetched', {
                baseUrl: freshSnapshot.baseUrl,
                users: sources.users.length,
                usersFailed: sources.usersFailed,
                hasSchema: !!sources.identityDetailsSchema,
            });

            const mergedSettings = mergeArcUsers(settings, sources);
            console.info('[Lens][Settings] Users refresh merged', {
                usersBefore: settings.users.length,
                usersAfter: mergedSettings.users.length,
            });
            setSettings(mergedSettings);
            setPersistError(await persistSettings(mergedSettings));
        } catch (error) {
            // Without this the rejection escapes unhandled: the refresh runs from a click handler as
            // `void refreshUsers()`, so nothing is awaiting it and nothing would report the failure.
            console.error('[Lens][Settings] Users refresh failed', error);
        } finally {
            setSettingsUsersRefreshing(false);
        }
    };

    const refreshTenants = async () => {
        if (!settings) {
            return;
        }

        setSettingsTenantsRefreshing(true);
        try {
            if (!arcContext) {
                await refreshArcContext();
                return;
            }

            const freshSnapshot = await captureArcContextForActiveTab();
            await saveArcContextSnapshot(freshSnapshot);
            setArcContext(freshSnapshot);

            if (!freshSnapshot.isArcApplication || !freshSnapshot.baseUrl) {
                return;
            }

            const tenantSources = await fetchArcTenants(freshSnapshot.baseUrl, {
                headers: buildContextRequestHeaders(settings),
            });
            const mergedSettings = mergeArcTenants(settings, tenantSources);
            console.info('[Lens][Settings] Tenants refresh merged', {
                baseUrl: freshSnapshot.baseUrl,
                tenantsFetched: tenantSources.tenants.length,
                tenantsFailed: tenantSources.tenantsFailed,
                tenantsBefore: settings.tenants.length,
                tenantsAfter: mergedSettings.tenants.length,
            });
            setSettings(mergedSettings);
            setPersistError(await persistSettings(mergedSettings));
        } catch (error) {
            console.error('[Lens][Settings] Tenants refresh failed', error);
        } finally {
            setSettingsTenantsRefreshing(false);
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

            const withRouting = await syncArcRoutingSettings(freshSnapshot, loadedSettings);
            const resolvedSettings = await mergeAndPersistArcSources(freshSnapshot, withRouting);

            if (!cancelled) {
                setArcContext(freshSnapshot);
                setSettings(resolvedSettings);
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

        const failure = await persistSettings(updated);
        setPersistError(failure);
        if (failure) {
            // Confirming a save that did not happen is the whole trap this guards against.
            return;
        }

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const arcBaseUrl = arcContext?.baseUrl ?? '';

    const tabs = useMemo(() => buildTabDefinitions(hasArcContext), [hasArcContext]);

    const resolvedActiveTab = resolveActiveTab(tabs, activeTab);

    const activeTabTitle = tabs.find(_ => _.id === resolvedActiveTab)?.label ?? 'Lens';
    const shouldShowArcStatus = !arcContextLoading && !hasArcContext;
    const arcStatusTooltip = shouldShowArcStatus ? buildArcStatusTooltip(arcContext) : '';

    useEffect(() => {
        if (!navigationHydrated) {
            return;
        }
        void saveNavigationState({ activeTab });
    }, [activeTab, navigationHydrated]);

    return (
        <div className="lens-settings-root">
            <Tooltip target=".lens-tab-button" position="right" showDelay={120} hideDelay={80} />
            <PopupHeader
                title={activeTabTitle}
                showArcStatus={shouldShowArcStatus}
                arcStatusTooltip={arcStatusTooltip}
                saved={saved}
                persistError={persistError}
                onRefreshArcContext={() => void refreshArcContext()}
            />

            <div className="lens-layout">
                <TabNavigation tabs={tabs} activeTab={resolvedActiveTab} onSelect={setActiveTab} />

                <main className="view-panel">
                    {resolvedActiveTab === 'settings' && (
                        <SettingsView
                            settings={settings}
                            onChange={handleChange}
                            identityDetailsSchema={identityDetailsSchema}
                            onRefreshUsers={() => void refreshUsers()}
                            isRefreshingUsers={settingsUsersRefreshing}
                            onRefreshTenants={() => void refreshTenants()}
                            isRefreshingTenants={settingsTenantsRefreshing}
                        />
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

                    {resolvedActiveTab === 'observable-query-diagnostics' && (
                        <ObservableQueryDiagnosticsView hasArcContext={hasArcContext} />
                    )}
                </main>
            </div>
        </div>
    );
}
