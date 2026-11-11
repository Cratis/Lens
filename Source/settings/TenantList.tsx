import { useState } from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { ExtensionSettings, Tenant } from '../shared/types';
import { TenantForm } from './TenantForm';

interface Props {
    settings: ExtensionSettings;
    onChange: (settings: ExtensionSettings) => void;
    onRefreshTenants: () => void;
    isRefreshingTenants: boolean;
}

type Mode = 'list' | 'add' | 'edit' | 'view';

function getSource(tenant: Tenant): 'custom' | 'arc' {
    return tenant.source === 'arc' ? 'arc' : 'custom';
}

function isSameTenant(first: Tenant, second: Tenant): boolean {
    return first.id === second.id && getSource(first) === getSource(second);
}

interface HeaderProps {
    isRefreshing: boolean;
    onAdd: () => void;
    onRefresh: () => void;
}

function TenantListHeader({ isRefreshing, onAdd, onRefresh }: HeaderProps) {
    return (
        <div className="panel-header">
            <h3>Tenant options</h3>
            <div className="option-item-actions">
                <Button
                    icon="pi pi-plus"
                    rounded
                    text
                    aria-label="Add tenant"
                    tooltip="Add tenant"
                    tooltipOptions={{ position: 'left' }}
                    onClick={onAdd}
                />
                <Button
                    className="tree-refresh-button"
                    icon={isRefreshing ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'}
                    rounded
                    text
                    disabled={isRefreshing}
                    aria-label="Refresh tenants from Arc"
                    tooltip="Refresh tenants from Arc"
                    tooltipOptions={{ position: 'left' }}
                    onClick={onRefresh}
                />
            </div>
        </div>
    );
}

interface RowProps {
    tenant: Tenant;
    isActive: boolean;
    onView: () => void;
    onEdit: () => void;
    onRemove: () => void;
}

function TenantRow({ tenant, isActive, onView, onEdit, onRemove }: RowProps) {
    const isArc = getSource(tenant) === 'arc';

    return (
        <div className="option-item">
            <div>
                <div className="option-item-title">{tenant.name}</div>
                <div className="option-item-subtitle">{tenant.id}</div>
            </div>
            <div className="option-item-actions">
                {isActive && <Tag value="Active" severity="success" />}
                {isArc && <Tag value="Arc" severity="info" />}
                {isArc && <Button icon="pi pi-eye" rounded text onClick={onView} />}
                {!isArc && <Button icon="pi pi-pencil" rounded text onClick={onEdit} />}
                {!isArc && <Button icon="pi pi-trash" rounded text severity="danger" onClick={onRemove} />}
            </div>
        </div>
    );
}

export function TenantList({ settings, onChange, onRefreshTenants, isRefreshingTenants }: Props) {
    const [mode, setMode] = useState<Mode>('list');
    const [editTenant, setEditTenant] = useState<Tenant | null>(null);

    const save = (tenant: Tenant) => {
        const tenants = mode === 'add'
            ? [...settings.tenants, { ...tenant, source: 'custom' as const }]
            : settings.tenants.map(_ => isSameTenant(_, tenant) ? tenant : _);

        onChange({ ...settings, tenants });
        setMode('list');
    };

    const remove = (tenant: Tenant) => {
        if (getSource(tenant) === 'arc') {
            return;
        }

        const tenants = settings.tenants.filter(_ => !isSameTenant(_, tenant));
        const activeTenantId = settings.activeTenantId === tenant.id ? '' : settings.activeTenantId;
        onChange({ ...settings, tenants, activeTenantId });
    };

    const open = (tenant: Tenant | null, nextMode: Mode) => {
        setEditTenant(tenant);
        setMode(nextMode);
    };

    if (mode !== 'list') {
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
            <TenantListHeader isRefreshing={isRefreshingTenants} onAdd={() => open(null, 'add')} onRefresh={onRefreshTenants} />

            {settings.tenants.length === 0 && (
                <div className="empty-state compact">
                    <p>No tenant options configured yet.</p>
                </div>
            )}

            {settings.tenants.length > 0 && (
                <div className="option-list">
                    {settings.tenants.map(tenant => (
                        <TenantRow
                            key={`${getSource(tenant)}:${tenant.id}`}
                            tenant={tenant}
                            isActive={settings.activeTenantId === tenant.id}
                            onView={() => open(tenant, 'view')}
                            onEdit={() => open(tenant, 'edit')}
                            onRemove={() => remove(tenant)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
