import { useState, useEffect } from 'react';
import { ExtensionSettings } from '../shared/types';
import { getSettings, saveSettings } from '../shared/storage';
import { ArcContextSnapshot, captureArcContextForActiveTab, getArcContextSnapshot, saveArcContextSnapshot } from '../shared/arc-context';
import { UserList } from './components/UserList';
import { TenantList } from './components/TenantList';
import { CommandsPanel } from './components/CommandsPanel';
import { QueriesPanel } from './components/QueriesPanel';
import './options.css';

type Tab = 'users' | 'tenants' | 'commands' | 'queries';

export function Options() {
    const [settings, setSettings] = useState<ExtensionSettings | null>(null);
    const [arcContext, setArcContext] = useState<ArcContextSnapshot | null>(null);
    const [arcContextLoading, setArcContextLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('users');
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
            if (!cancelled) {
                setSettings(loadedSettings);
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

    if (!settings) {
        return <div className="loading">Loading settings…</div>;
    }

    const arcBaseUrl = arcContext?.baseUrl ?? '';

    const tabs: { id: Tab; label: string }[] = [
        { id: 'users', label: 'Users' },
        { id: 'tenants', label: 'Tenants' },
    ];
    if (hasArcContext) {
        tabs.push({ id: 'commands', label: 'Commands' });
        tabs.push({ id: 'queries', label: 'Queries' });
    }
    const resolvedActiveTab = tabs.some(tab => tab.id === activeTab) ? activeTab : 'users';

    return (
        <div className="options-root">
            <header className="options-header">
                <h1>Lens <span className="header-sub">– Cratis Developer Tools</span></h1>
                {saved && <span className="saved-badge">Saved ✓</span>}
            </header>

            {!arcContextLoading && !hasArcContext && (
                <div className="warning-banner">
                    <div className="warning-header-row">
                        <span>This is not an Arc application. Open Lens on an Arc application page to enable all features.</span>
                        <button className="btn btn-default btn-sm" onClick={refreshArcContext}>Retry detection</button>
                    </div>
                    {arcContext?.diagnostics && (
                        <details className="warning-details">
                            <summary>Detection details</summary>
                            <div className="warning-details-grid">
                                <div>tabSelectionStrategy: {arcContext.diagnostics.tabSelectionStrategy}</div>
                                <div>selectedTabId: {arcContext.diagnostics.selectedTabId ?? 'null'}</div>
                                <div>selectedTabUrl: {arcContext.diagnostics.selectedTabUrl ?? 'null'}</div>
                                <div>executeScriptStatus: {arcContext.diagnostics.executeScriptStatus}</div>
                                <div>detectionMethod: {arcContext.detectionMethod ?? 'n/a'}</div>
                                <div>pageOrigin: {arcContext.pageOrigin ?? 'null'}</div>
                                {arcContext.diagnostics.errorMessage && (
                                    <div>errorMessage: {arcContext.diagnostics.errorMessage}</div>
                                )}
                            </div>
                        </details>
                    )}
                </div>
            )}

            <nav className="tab-nav">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        className={`tab-btn ${resolvedActiveTab === t.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </nav>

            <main className="options-main">
                {resolvedActiveTab === 'users' && (
                    <UserList settings={settings} onChange={handleChange} />
                )}
                {resolvedActiveTab === 'tenants' && (
                    <TenantList settings={settings} onChange={handleChange} />
                )}
                {resolvedActiveTab === 'commands' && hasArcContext && (
                    <CommandsPanel arcBaseUrl={arcBaseUrl} />
                )}
                {resolvedActiveTab === 'queries' && hasArcContext && (
                    <QueriesPanel arcBaseUrl={arcBaseUrl} />
                )}
            </main>
        </div>
    );
}
