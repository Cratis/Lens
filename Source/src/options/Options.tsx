import { useState, useEffect } from 'react';
import { ExtensionSettings } from '../shared/types';
import { getSettings, saveSettings } from '../shared/storage';
import { ArcContextSnapshot, getArcContextSnapshot } from '../shared/arc-context';
import { UserList } from './components/UserList';
import { TenantList } from './components/TenantList';
import { ArcSettings } from './components/ArcSettings';
import { CommandsPanel } from './components/CommandsPanel';
import { QueriesPanel } from './components/QueriesPanel';
import './options.css';

type Tab = 'users' | 'tenants' | 'arc' | 'commands' | 'queries';

export function Options() {
    const [settings, setSettings] = useState<ExtensionSettings | null>(null);
    const [arcContext, setArcContext] = useState<ArcContextSnapshot | null>(null);
    const [arcContextLoading, setArcContextLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('users');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        getSettings().then(setSettings);
        getArcContextSnapshot()
            .then(setArcContext)
            .finally(() => setArcContextLoading(false));
    }, []);

    useEffect(() => {
        const arcAvailable = arcContext?.isArcApplication === true;
        if (!arcAvailable && (activeTab === 'commands' || activeTab === 'queries')) {
            setActiveTab('arc');
        }
    }, [arcContext, activeTab]);

    const handleChange = async (updated: ExtensionSettings) => {
        setSettings(updated);
        await saveSettings(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    if (!settings) {
        return <div className="loading">Loading settings…</div>;
    }

    const hasArcContext = arcContext?.isArcApplication === true;
    const arcBaseUrl = arcContext?.baseUrl ?? '';

    const tabs: { id: Tab; label: string }[] = [
        { id: 'users', label: 'Users' },
        { id: 'tenants', label: 'Tenants' },
        { id: 'arc', label: 'Arc Settings' },
    ];
    if (hasArcContext) {
        tabs.push({ id: 'commands', label: 'Commands' });
        tabs.push({ id: 'queries', label: 'Queries' });
    }

    return (
        <div className="options-root">
            <header className="options-header">
                <h1>Lens <span className="header-sub">– Cratis Developer Tools</span></h1>
                {saved && <span className="saved-badge">Saved ✓</span>}
            </header>

            <nav className="tab-nav">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </nav>

            <main className="options-main">
                {!arcContextLoading && !hasArcContext && (
                    <div className="warning-banner">
                        This is not an Arc application. Open Lens on an Arc application page to enable Commands and Queries.
                    </div>
                )}
                {activeTab === 'users' && (
                    <UserList settings={settings} onChange={handleChange} />
                )}
                {activeTab === 'tenants' && (
                    <TenantList settings={settings} onChange={handleChange} />
                )}
                {activeTab === 'arc' && (
                    <ArcSettings settings={settings} onChange={handleChange} arcContext={arcContext} />
                )}
                {activeTab === 'commands' && (
                    <CommandsPanel arcBaseUrl={arcBaseUrl} />
                )}
                {activeTab === 'queries' && (
                    <QueriesPanel arcBaseUrl={arcBaseUrl} />
                )}
            </main>
        </div>
    );
}
