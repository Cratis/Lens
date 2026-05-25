import { useState } from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { ExtensionSettings, Tenant } from '../shared/types';
import { TenantForm } from './TenantForm';

interface Props {
    settings: ExtensionSettings;
    onChange: (settings: ExtensionSettings) => void;
}

type Mode = 'list' | 'add' | 'edit';

export function TenantList({ settings, onChange }: Props) {
    const [mode, setMode] = useState<Mode>('list');
    const [editTenant, setEditTenant] = useState<Tenant | null>(null);

    const save = (tenant: Tenant) => {
        const tenants = mode === 'add'
            ? [...settings.tenants, tenant]
            : settings.tenants.map(_ => _.id === tenant.id ? tenant : _);

        onChange({ ...settings, tenants });
        setMode('list');
    };

    const remove = (tenantId: string) => {
        const tenants = settings.tenants.filter(_ => _.id !== tenantId);
        const activeTenantId = settings.activeTenantId === tenantId ? '' : settings.activeTenantId;
        onChange({ ...settings, tenants, activeTenantId });
    };

    if (mode === 'add' || mode === 'edit') {
        return (
            <TenantForm
                tenant={editTenant}
                onSave={save}
                onCancel={() => setMode('list')}
            />
        );
    }

    return (
        <div className="stack-gap">
            <div className="panel-header">
                <h3>Tenant options</h3>
                <Button
                    label="Add tenant"
                    icon="pi pi-plus"
                    onClick={() => {
                        setEditTenant(null);
                        setMode('add');
                    }}
                />
            </div>

            {settings.tenants.length === 0 && (
                <div className="empty-state compact">
                    <p>No tenant options configured yet.</p>
                </div>
            )}

            {settings.tenants.length > 0 && (
                <div className="option-list">
                    {settings.tenants.map(tenant => (
                        <div className="option-item" key={tenant.id}>
                            <div>
                                <div className="option-item-title">{tenant.name}</div>
                                <div className="option-item-subtitle">{tenant.id}</div>
                            </div>
                            <div className="option-item-actions">
                                {settings.activeTenantId === tenant.id && <Tag value="Active" severity="success" />}
                                <Button icon="pi pi-pencil" rounded text onClick={() => {
                                    setEditTenant(tenant);
                                    setMode('edit');
                                }} />
                                <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => remove(tenant.id)} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
