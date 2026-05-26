import { ChangeEvent, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tenant } from '../shared/types';

interface Props {
    tenant: Tenant | null;
    onSave: (tenant: Tenant) => void;
    onCancel: () => void;
    readOnly?: boolean;
}

function createTenant(): Tenant {
    return {
        id: crypto.randomUUID(),
        name: '',
        description: '',
        imageUrl: '',
        source: 'custom',
    };
}

export function TenantForm({ tenant, onSave, onCancel, readOnly = false }: Props) {
    const [form, setForm] = useState<Tenant>(() => tenant ? { ...tenant } : createTenant());
    const [imageError, setImageError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const setField = <K extends keyof Tenant>(key: K, value: Tenant[K]) => {
        setForm(previous => ({ ...previous, [key]: value }));
    };

    const selectImage = () => {
        fileInputRef.current?.click();
    };

    const onImageSelected = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            setImageError('Selected file must be an image.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = typeof reader.result === 'string' ? reader.result : '';
            setField('imageUrl', dataUrl);
            setImageError(null);
        };
        reader.onerror = () => {
            setImageError('Unable to read the selected image file.');
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const clearImage = () => {
        setField('imageUrl', '');
        setImageError(null);
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
                        disabled={readOnly}
                        onChange={event => setField('id', event.target.value)}
                        placeholder="acme-corp"
                    />
                </div>

                <div className="field-block">
                    <label htmlFor="tenant-name">Tenant name</label>
                    <InputText
                        id="tenant-name"
                        value={form.name}
                        disabled={readOnly}
                        onChange={event => setField('name', event.target.value)}
                        placeholder="Acme Corporation"
                    />
                </div>

                <div className="field-block full-width">
                    <label htmlFor="tenant-description">Description</label>
                    <InputText
                        id="tenant-description"
                        value={form.description}
                        disabled={readOnly}
                        onChange={event => setField('description', event.target.value)}
                        placeholder="Optional description"
                    />
                </div>

                <div className="field-block full-width">
                    <label>Tenant image</label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="image-file-input"
                        onChange={onImageSelected}
                    />
                    <div className="action-row">
                        <Button label="Upload image" icon="pi pi-upload" outlined onClick={selectImage} disabled={readOnly} />
                        {form.imageUrl && !readOnly && (
                            <Button label="Remove image" icon="pi pi-trash" severity="danger" outlined onClick={clearImage} />
                        )}
                    </div>
                    {imageError && <Message severity="error" text={imageError} />}
                    {form.imageUrl && (
                        <img className="image-preview" src={form.imageUrl} alt="Tenant" />
                    )}
                </div>
            </div>

            <div className="action-row">
                {!readOnly && <Button label="Save tenant" icon="pi pi-check" onClick={() => onSave(form)} disabled={!isValid} />}
                <Button label={readOnly ? 'Close' : 'Cancel'} icon="pi pi-times" outlined onClick={onCancel} />
            </div>
        </div>
    );
}
