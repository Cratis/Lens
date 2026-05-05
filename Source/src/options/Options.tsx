import { useState, useEffect } from 'react';
import { ExtensionSettings } from '../shared/types';
import { getSettings, saveSettings } from '../shared/storage';
import { UserList } from './components/UserList';
import { TenantList } from './components/TenantList';
import { ArcSettings } from './components/ArcSettings';
import { CommandsPanel } from './components/CommandsPanel';
import { QueriesPanel } from './components/QueriesPanel';
import './options.css';

type Tab = 'users' | 'tenants' | 'arc' | 'commands' | 'queries';

export function Options() {
    const [settings, setSettings] = useState<ExtensionSettings | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('users');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        getSettings().then(setSettings);
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

    const tabs: { id: Tab; label: string }[] = [
        { id: 'users', label: 'Users' },
        { id: 'tenants', label: 'Tenants' },
        { id: 'arc', label: 'Arc Settings' },
        { id: 'commands', label: 'Commands' },
        { id: 'queries', label: 'Queries' },
    ];

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
                {activeTab === 'users' && (
                    <UserList settings={settings} onChange={handleChange} />
                )}
                {activeTab === 'tenants' && (
                    <TenantList settings={settings} onChange={handleChange} />
                )}
                {activeTab === 'arc' && (
                    <ArcSettings settings={settings} onChange={handleChange} />
                )}
                {activeTab === 'commands' && (
                    <CommandsPanel arcBaseUrl={settings.arcBaseUrl} />
                )}
                {activeTab === 'queries' && (
                    <QueriesPanel arcBaseUrl={settings.arcBaseUrl} />
                )}
            </main>
        </div>
    );
}
