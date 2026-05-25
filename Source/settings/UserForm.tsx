import { ChangeEvent, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Claim, UserProfile } from '../shared/types';

interface Props {
    user: UserProfile | null;
    onSave: (user: UserProfile) => void;
    onCancel: () => void;
}

const providerOptions = [
    { label: 'Azure Active Directory', value: 'aad' },
    { label: 'GitHub', value: 'github' },
    { label: 'Google', value: 'google' },
    { label: 'Twitter', value: 'twitter' },
    { label: 'Facebook', value: 'facebook' },
];

function createUser(): UserProfile {
    return {
        id: crypto.randomUUID(),
        name: '',
        displayName: '',
        identityProvider: 'aad',
        roles: ['authenticated', 'anonymous'],
        claims: [],
        applicationProperties: {},
        imageUrl: '',
    };
}

export function UserForm({ user, onSave, onCancel }: Props) {
    const [form, setForm] = useState<UserProfile>(() => user ? { ...user } : createUser());
    const [rolesText, setRolesText] = useState(() => (user?.roles ?? ['authenticated', 'anonymous']).join(', '));
    const [appPropsEntries, setAppPropsEntries] = useState<[string, string][]>(() =>
        Object.entries(user?.applicationProperties ?? {})
    );
    const [imageError, setImageError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const setField = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
        setForm(previous => ({ ...previous, [key]: value }));
    };

    const addClaim = () => setField('claims', [...form.claims, { type: '', value: '' }]);

    const updateClaim = (index: number, field: keyof Claim, value: string) => {
        const claims = form.claims.map((claim, claimIndex) =>
            claimIndex === index ? { ...claim, [field]: value } : claim
        );
        setField('claims', claims);
    };

    const removeClaim = (index: number) => {
        setField('claims', form.claims.filter((_, claimIndex) => claimIndex !== index));
    };

    const addAppProp = () => {
        setAppPropsEntries(previous => [...previous, ['', '']]);
    };

    const updateAppProp = (index: number, col: 0 | 1, value: string) => {
        setAppPropsEntries(previous => previous.map((entry, entryIndex) => {
            if (entryIndex !== index) {
                return entry;
            }
            return col === 0 ? [value, entry[1]] : [entry[0], value];
        }));
    };

    const removeAppProp = (index: number) => {
        setAppPropsEntries(previous => previous.filter((_, entryIndex) => entryIndex !== index));
    };

    const save = () => {
        const roles = rolesText.split(',').map(_ => _.trim()).filter(Boolean);
        const applicationProperties = Object.fromEntries(appPropsEntries.filter(([key]) => key.trim() !== ''));
        onSave({ ...form, roles, applicationProperties });
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

    const isValid = form.name.trim().length > 0;

    return (
        <div className="stack-gap">
            <h3>{user ? 'Edit user option' : 'Add user option'}</h3>

            <div className="form-grid two-col">
                <div className="field-block">
                    <label htmlFor="user-name">Username or identifier</label>
                    <InputText
                        id="user-name"
                        value={form.name}
                        onChange={event => setField('name', event.target.value)}
                        placeholder="john.doe@example.com"
                    />
                </div>

                <div className="field-block">
                    <label htmlFor="display-name">Display name</label>
                    <InputText
                        id="display-name"
                        value={form.displayName}
                        onChange={event => setField('displayName', event.target.value)}
                        placeholder="John Doe"
                    />
                </div>

                <div className="field-block">
                    <label htmlFor="identity-provider">Identity provider</label>
                    <Dropdown
                        id="identity-provider"
                        value={form.identityProvider}
                        options={providerOptions}
                        onChange={event => setField('identityProvider', event.value as string)}
                    />
                </div>

                <div className="field-block">
                    <label htmlFor="user-id">User id</label>
                    <InputText
                        id="user-id"
                        value={form.id}
                        onChange={event => setField('id', event.target.value)}
                    />
                </div>

                <div className="field-block full-width">
                    <label htmlFor="roles">Roles (comma separated)</label>
                    <InputText
                        id="roles"
                        value={rolesText}
                        onChange={event => setRolesText(event.target.value)}
                        placeholder="authenticated, anonymous"
                    />
                </div>

                <div className="field-block full-width">
                    <label>User image</label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="image-file-input"
                        onChange={onImageSelected}
                    />
                    <div className="action-row">
                        <Button label="Upload image" icon="pi pi-upload" outlined onClick={selectImage} />
                        {form.imageUrl && (
                            <Button label="Remove image" icon="pi pi-trash" severity="danger" outlined onClick={clearImage} />
                        )}
                    </div>
                    {imageError && <Message severity="error" text={imageError} />}
                    {form.imageUrl && (
                        <img className="image-preview" src={form.imageUrl} alt="User profile" />
                    )}
                </div>
            </div>

            <div className="editor-card">
                <div className="editor-card-header">
                    <h4>Claims</h4>
                    <Button icon="pi pi-plus" text rounded aria-label="Add claim" onClick={addClaim} />
                </div>
                <Message severity="info" text="Claims are included in the X-MS-CLIENT-PRINCIPAL header." />
                <div className="kv-editor">
                    {form.claims.map((claim, index) => (
                        <div className="kv-row" key={`${claim.type}-${index}`}>
                            <InputText
                                value={claim.type}
                                onChange={event => updateClaim(index, 'type', event.target.value)}
                                placeholder="type"
                            />
                            <InputText
                                value={claim.value}
                                onChange={event => updateClaim(index, 'value', event.target.value)}
                                placeholder="value"
                            />
                            <Button icon="pi pi-trash" text severity="danger" onClick={() => removeClaim(index)} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="editor-card">
                <div className="editor-card-header">
                    <h4>Application properties</h4>
                    <Button icon="pi pi-plus" text rounded aria-label="Add property" onClick={addAppProp} />
                </div>
                <div className="kv-editor">
                    {appPropsEntries.map(([key, value], index) => (
                        <div className="kv-row" key={`${key}-${index}`}>
                            <InputText
                                value={key}
                                onChange={event => updateAppProp(index, 0, event.target.value)}
                                placeholder="property"
                            />
                            <InputText
                                value={value}
                                onChange={event => updateAppProp(index, 1, event.target.value)}
                                placeholder="value"
                            />
                            <Button icon="pi pi-trash" text severity="danger" onClick={() => removeAppProp(index)} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="action-row">
                <Button label="Save user" icon="pi pi-check" onClick={save} disabled={!isValid} />
                <Button label="Cancel" icon="pi pi-times" outlined onClick={onCancel} />
            </div>
        </div>
    );
}
