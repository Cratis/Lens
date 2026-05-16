import { useState } from 'react';
import { ExtensionSettings, Tenant } from '../../shared/types';
import { TenantForm } from './TenantForm';

interface Props {
    settings: ExtensionSettings;
    onChange: (settings: ExtensionSettings) => void;
}

type Mode = 'list' | 'add' | 'edit';

export function TenantList({ settings, onChange }: Props) {
    const [mode, setMode] = useState<Mode>('list');
    const [editTenant, setEditTenant] = useState<Tenant | null>(null);

    const handleAdd = () => {
        setEditTenant(null);
        setMode('add');
    };

    const handleEdit = (tenant: Tenant) => {
        setEditTenant(tenant);
        setMode('edit');
    };

    const handleDelete = (tenantId: string) => {
        const tenants = settings.tenants.filter(t => t.id !== tenantId);
        const activeTenantId = settings.activeTenantId === tenantId ? '' : settings.activeTenantId;
        onChange({ ...settings, tenants, activeTenantId });
    };

    const handleSave = (tenant: Tenant) => {
        let tenants: Tenant[];
        if (mode === 'add') {
            tenants = [...settings.tenants, tenant];
        } else {
            tenants = settings.tenants.map(t => t.id === tenant.id ? tenant : t);
        }
        onChange({ ...settings, tenants });
        setMode('list');
    };

    const handleSetActive = (tenantId: string) => {
        const activeTenantId = settings.activeTenantId === tenantId ? '' : tenantId;
        onChange({ ...settings, activeTenantId });
    };

    if (mode === 'add' || mode === 'edit') {
        return (
            <TenantForm
                tenant={editTenant}
                onSave={handleSave}
                onCancel={() => setMode('list')}
            />
        );
    }

    return (
        <div>
            <div className="section-header">
                <h2>Tenants</h2>
                <button className="btn btn-primary" onClick={handleAdd}>+ Add Tenant</button>
            </div>

            {settings.tenants.length === 0 ? (
                <div className="empty-state">
                    <p>No tenants configured yet.</p>
                    <button className="btn btn-primary" onClick={handleAdd}>Add your first tenant</button>
                </div>
            ) : (
                <div className="item-list">
                    {settings.tenants.map(tenant => (
                        <div
                            key={tenant.id}
                            className={`item-card ${tenant.id === settings.activeTenantId ? 'selected' : ''}`}
                        >
                            <Avatar src={tenant.imageUrl} name={tenant.name} size={40} />
                            <div className="item-info">
                                <div className="item-name">{tenant.name}</div>
                                <div className="item-sub">{tenant.id}</div>
                                {tenant.description && <div className="item-sub">{tenant.description}</div>}
                            </div>
                            <div className="item-actions">
                                <button
                                    className={`btn btn-sm ${tenant.id === settings.activeTenantId ? 'btn-primary' : 'btn-default'}`}
                                    onClick={() => handleSetActive(tenant.id)}
                                    title={tenant.id === settings.activeTenantId ? 'Active – click to deactivate' : 'Set as active tenant'}
                                >
                                    {tenant.id === settings.activeTenantId ? '✓ Active' : 'Set Active'}
                                </button>
                                <button className="btn btn-default btn-sm" onClick={() => handleEdit(tenant)}>Edit</button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tenant.id)}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
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
        <div className="avatar avatar-placeholder" style={{ width: size, height: size, fontSize: size * 0.36 }}>
            {initials}
        </div>
    );
}
