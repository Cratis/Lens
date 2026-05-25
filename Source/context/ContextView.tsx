import { Dropdown } from 'primereact/dropdown';
import { ExtensionSettings } from '../shared/types';

interface Props {
    settings: ExtensionSettings | null;
    onChange: (settings: ExtensionSettings) => void;
}

export function ContextView({ settings, onChange }: Props) {
    if (!settings) {
        return <div className="loading">Loading context...</div>;
    }

    const activeUser = settings.users.find(_ => _.id === settings.activeUserId);
    const activeTenant = settings.tenants.find(_ => _.id === settings.activeTenantId);

    return (
        <div className="stack-gap">
            <section className="feature-card">
                <div className="form-grid two-col">
                    <div className="field-block">
                        <label htmlFor="active-user">Active user</label>
                        <Dropdown
                            id="active-user"
                            value={settings.activeUserId}
                            options={settings.users.map(user => ({
                                label: user.displayName || user.name,
                                value: user.id,
                            }))}
                            showClear
                            placeholder="No active user"
                            onChange={event => onChange({ ...settings, activeUserId: (event.value as string | null) ?? '' })}
                        />
                    </div>

                    <div className="field-block">
                        <label htmlFor="active-tenant">Active tenant</label>
                        <Dropdown
                            id="active-tenant"
                            value={settings.activeTenantId}
                            options={settings.tenants.map(tenant => ({
                                label: tenant.name,
                                value: tenant.id,
                            }))}
                            showClear
                            placeholder="No active tenant"
                            onChange={event => onChange({ ...settings, activeTenantId: (event.value as string | null) ?? '' })}
                        />
                    </div>
                </div>
            </section>

            <section className="feature-card">
                <div className="context-grid">
                    <div>
                        <div className="context-label">User</div>
                        <div className="context-value">{activeUser?.displayName || activeUser?.name || 'Not selected'}</div>
                        <div className="context-subvalue">{activeUser?.name || 'No user selected'}</div>
                    </div>
                    <div>
                        <div className="context-label">Tenant</div>
                        <div className="context-value">{activeTenant?.name || 'Not selected'}</div>
                        <div className="context-subvalue">{activeTenant?.id || 'No tenant selected'}</div>
                    </div>
                </div>
            </section>
        </div>
    );
}
