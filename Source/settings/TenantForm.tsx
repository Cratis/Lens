import { useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Tenant } from '../shared/types';

interface Props {
    tenant: Tenant | null;
    onSave: (tenant: Tenant) => void;
    onCancel: () => void;
}

function createTenant(): Tenant {
    return {
        id: crypto.randomUUID(),
        name: '',
        description: '',
        imageUrl: '',
    };
}

export function TenantForm({ tenant, onSave, onCancel }: Props) {
    const [form, setForm] = useState<Tenant>(() => tenant ? { ...tenant } : createTenant());

    const setField = <K extends keyof Tenant>(key: K, value: Tenant[K]) => {
        setForm(previous => ({ ...previous, [key]: value }));
    };

    const isValid = form.id.trim().length > 0 && form.name.trim().length > 0;

    return (
        <div className="stack-gap">
            <h3>{tenant ? 'Edit tenant option' : 'Add tenant option'}</h3>

            <div className="form-grid two-col">
                <div className="field-block">
                    <label htmlFor="tenant-id">Tenant id</label>
                    <InputText
                        id="tenant-id"
                        value={form.id}
                        onChange={event => setField('id', event.target.value)}
                        placeholder="acme-corp"
                    />
                </div>

                <div className="field-block">
                    <label htmlFor="tenant-name">Tenant name</label>
                    <InputText
                        id="tenant-name"
                        value={form.name}
                        onChange={event => setField('name', event.target.value)}
                        placeholder="Acme Corporation"
                    />
                </div>

                <div className="field-block full-width">
                    <label htmlFor="tenant-description">Description</label>
                    <InputText
                        id="tenant-description"
                        value={form.description}
                        onChange={event => setField('description', event.target.value)}
                        placeholder="Optional description"
                    />
                </div>

                <div className="field-block full-width">
                    <label htmlFor="tenant-image-url">Image URL</label>
                    <InputText
                        id="tenant-image-url"
                        value={form.imageUrl}
                        onChange={event => setField('imageUrl', event.target.value)}
                        placeholder="https://example.com/logo.png"
                    />
                </div>
            </div>

            <div className="action-row">
                <Button label="Save tenant" icon="pi pi-check" onClick={() => onSave(form)} disabled={!isValid} />
                <Button label="Cancel" icon="pi pi-times" outlined onClick={onCancel} />
            </div>
        </div>
    );
}
