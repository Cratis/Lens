import { useState } from 'react';
import { Tenant } from '../../shared/types';

interface Props {
    tenant: Tenant | null;
    onSave: (tenant: Tenant) => void;
    onCancel: () => void;
}

function newTenant(): Tenant {
    return {
        id: crypto.randomUUID(),
        name: '',
        description: '',
        imageUrl: '',
    };
}

export function TenantForm({ tenant, onSave, onCancel }: Props) {
    const [form, setForm] = useState<Tenant>(() => tenant ? { ...tenant } : newTenant());

    const setField = <K extends keyof Tenant>(key: K, value: Tenant[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const isValid = form.id.trim() !== '' && form.name.trim() !== '';

    return (
        <div>
            <div className="section-header">
                <h2>{tenant ? 'Edit Tenant' : 'Add Tenant'}</h2>
            </div>

            <div className="card">
                <div className="form-row">
                    <label>Tenant ID *</label>
                    <input
                        type="text"
                        value={form.id}
                        onChange={e => setField('id', e.target.value)}
                        placeholder="e.g. acme-corp or a UUID"
                    />
                </div>

                <div className="form-row">
                    <label>Name *</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={e => setField('name', e.target.value)}
                        placeholder="e.g. Acme Corporation"
                    />
                </div>

                <div className="form-row">
                    <label>Description</label>
                    <input
                        type="text"
                        value={form.description}
                        onChange={e => setField('description', e.target.value)}
                        placeholder="Optional description"
                    />
                </div>

                <div className="form-row">
                    <label>Image URL</label>
                    <input
                        type="url"
                        value={form.imageUrl}
                        onChange={e => setField('imageUrl', e.target.value)}
                        placeholder="https://example.com/logo.png"
                    />
                </div>
            </div>

            <div className="btn-row">
                <button className="btn btn-primary" onClick={() => onSave(form)} disabled={!isValid}>Save Tenant</button>
                <button className="btn btn-default" onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
}
