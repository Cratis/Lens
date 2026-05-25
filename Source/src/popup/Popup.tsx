import { useState, useEffect, useCallback } from 'react';
import { ExtensionSettings, UserProfile, Tenant } from '../shared/types';
import { getSettings, saveSettings, getActiveUser, getActiveTenant } from '../shared/storage';
import { captureArcContextForActiveTab, saveArcContextSnapshot } from '../shared/arc-context';
import './popup.css';

export function Popup() {
    const [settings, setSettings] = useState<ExtensionSettings | null>(null);

    useEffect(() => {
        getSettings().then(setSettings);
    }, []);

    useEffect(() => {
        captureArcContextForActiveTab()
            .then(saveArcContextSnapshot)
            .catch(() => undefined);
    }, []);

    const selectUser = useCallback(async (userId: string) => {
        if (!settings) return;
        const updated = { ...settings, activeUserId: userId };
        setSettings(updated);
        await saveSettings(updated);
    }, [settings]);

    const selectTenant = useCallback(async (tenantId: string) => {
        if (!settings) return;
        const updated = { ...settings, activeTenantId: tenantId };
        setSettings(updated);
        await saveSettings(updated);
    }, [settings]);

    const openOptions = () => {
        chrome.runtime.openOptionsPage();
    };

    if (!settings) {
        return <div className="popup loading">Loading…</div>;
    }

    const activeUser = getActiveUser(settings);
    const activeTenant = getActiveTenant(settings);

    return (
        <div className="popup">
            <header className="popup-header">
                <span className="popup-title">Lens</span>
                <button className="icon-btn" onClick={openOptions} title="Open settings">⚙</button>
            </header>

            <section className="popup-section">
                <label className="section-label">Active User</label>
                {settings.users.length === 0 ? (
                    <p className="empty-hint">
                        No users configured.{' '}
                        <button className="link-btn" onClick={openOptions}>Add one →</button>
                    </p>
                ) : (
                    <div className="selector-list">
                        {settings.users.map((user: UserProfile) => (
                            <button
                                key={user.id}
                                className={`selector-item ${user.id === settings.activeUserId ? 'active' : ''}`}
                                onClick={() => selectUser(user.id)}
                            >
                                <Avatar src={user.imageUrl} name={user.displayName || user.name} size={32} />
                                <span className="selector-item-label">
                                    <span className="selector-item-name">{user.displayName || user.name}</span>
                                    <span className="selector-item-sub">{user.name}</span>
                                </span>
                                {user.id === settings.activeUserId && <span className="check">✓</span>}
                            </button>
                        ))}
                        {settings.activeUserId && (
                            <button
                                className="selector-item selector-item-none"
                                onClick={() => selectUser('')}
                            >
                                <span className="selector-item-label">
                                    <span className="selector-item-name">No user</span>
                                </span>
                                {!settings.activeUserId && <span className="check">✓</span>}
                            </button>
                        )}
                    </div>
                )}
            </section>

            <section className="popup-section">
                <label className="section-label">Active Tenant</label>
                {settings.tenants.length === 0 ? (
                    <p className="empty-hint">
                        No tenants configured.{' '}
                        <button className="link-btn" onClick={openOptions}>Add one →</button>
                    </p>
                ) : (
                    <div className="selector-list">
                        {settings.tenants.map((tenant: Tenant) => (
                            <button
                                key={tenant.id}
                                className={`selector-item ${tenant.id === settings.activeTenantId ? 'active' : ''}`}
                                onClick={() => selectTenant(tenant.id)}
                            >
                                <Avatar src={tenant.imageUrl} name={tenant.name} size={32} />
                                <span className="selector-item-label">
                                    <span className="selector-item-name">{tenant.name}</span>
                                    <span className="selector-item-sub">{tenant.id}</span>
                                </span>
                                {tenant.id === settings.activeTenantId && <span className="check">✓</span>}
                            </button>
                        ))}
                        {settings.activeTenantId && (
                            <button
                                className="selector-item selector-item-none"
                                onClick={() => selectTenant('')}
                            >
                                <span className="selector-item-label">
                                    <span className="selector-item-name">No tenant</span>
                                </span>
                            </button>
                        )}
                    </div>
                )}
            </section>

            {(activeUser || activeTenant) && (
                <footer className="popup-footer">
                    <span>Injecting headers for: {activeUser?.displayName || activeUser?.name || 'none'}{activeUser && activeTenant ? ' / ' : ''}{activeTenant?.name || ''}</span>
                </footer>
            )}
        </div>
    );
}

function Avatar({ src, name, size }: { src: string; name: string; size: number }) {
    const initials = name
        .split(' ')
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() ?? '')
        .join('');

    if (src) {
        return (
            <img
                src={src}
                alt={name}
                className="avatar"
                style={{ width: size, height: size }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
        );
    }
    return (
        <div className="avatar avatar-placeholder" style={{ width: size, height: size, fontSize: size * 0.38 }}>
            {initials}
        </div>
    );
}
