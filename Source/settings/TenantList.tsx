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

function getSource(tenant: Tenant): 'custom' | 'arc' {
    return tenant.source === 'arc' ? 'arc' : 'custom';
}

export function TenantList({ settings, onChange }: Props) {
    const [mode, setMode] = useState<Mode | 'view'>('list');
    const [editTenant, setEditTenant] = useState<Tenant | null>(null);

    const save = (tenant: Tenant) => {
        const source = getSource(tenant);
        const tenants = mode === 'add'
            ? [...settings.tenants, { ...tenant, source: 'custom' as const }]
            : settings.tenants.map(_ => _.id === tenant.id && getSource(_) === source ? tenant : _);

        onChange({ ...settings, tenants });
        setMode('list');
    };

    const remove = (tenant: Tenant) => {
        if (getSource(tenant) === 'arc') {
            return;
        }

        const tenants = settings.tenants.filter(_ => !(_.id === tenant.id && getSource(_) === getSource(tenant)));
        const activeTenantId = settings.activeTenantId === tenant.id ? '' : settings.activeTenantId;
        onChange({ ...settings, tenants, activeTenantId });
    };

    if (mode === 'add' || mode === 'edit' || mode === 'view') {
        return (
            <TenantForm
                tenant={editTenant}
                onSave={save}
                onCancel={() => setMode('list')}
                readOnly={mode === 'view'}
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
                        <div className="option-item" key={`${getSource(tenant)}:${tenant.id}`}>
                            <div>
                                <div className="option-item-title">{tenant.name}</div>
                                <div className="option-item-subtitle">{tenant.id}</div>
                            </div>
                            <div className="option-item-actions">
                                {settings.activeTenantId === tenant.id && <Tag value="Active" severity="success" />}
                                {getSource(tenant) === 'arc' && <Tag value="Arc" severity="info" />}
                                {getSource(tenant) === 'arc' && (
                                    <Button icon="pi pi-eye" rounded text onClick={() => {
                                        setEditTenant(tenant);
                                        setMode('view');
                                    }} />
                                )}
                                {getSource(tenant) === 'custom' && (
                                    <Button icon="pi pi-pencil" rounded text onClick={() => {
                                        setEditTenant(tenant);
                                        setMode('edit');
                                    }} />
                                )}
                                {getSource(tenant) === 'custom' && (
                                    <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => remove(tenant)} />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
