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
    const hasArcContext = arcContext?.isArcApplication === true;

    useEffect(() => {
        getSettings().then(setSettings);
        getArcContextSnapshot()
            .then(setArcContext)
            .finally(() => setArcContextLoading(false));
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
        { id: 'arc', label: 'Arc Settings' },
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
                {!arcContextLoading && !hasArcContext && (
                    <div className="warning-banner">
                        This is not an Arc application. Open Lens on an Arc application page to enable Commands and Queries.
                    </div>
                )}
                {resolvedActiveTab === 'users' && (
                    <UserList settings={settings} onChange={handleChange} />
                )}
                {resolvedActiveTab === 'tenants' && (
                    <TenantList settings={settings} onChange={handleChange} />
                )}
                {resolvedActiveTab === 'arc' && (
                    <ArcSettings settings={settings} onChange={handleChange} arcContext={arcContext} />
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
