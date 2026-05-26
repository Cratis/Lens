import { ChangeEvent, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { JsonSchema } from '../arc/introspection';
import { CommandSchemaEditor, setValueAtPath } from '../commands/CommandSchemaEditor';
import { Claim, UserProfile } from '../shared/types';

interface Props {
    user: UserProfile | null;
    onSave: (user: UserProfile) => void;
    onCancel: () => void;
    identityDetailsSchema?: JsonSchema;
    readOnly?: boolean;
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
        identityDetails: {},
        imageUrl: '',
        source: 'custom',
    };
}

export function UserForm({ user, onSave, onCancel, identityDetailsSchema, readOnly = false }: Props) {
    const [form, setForm] = useState<UserProfile>(() => user ? { ...user } : createUser());
    const [rolesText, setRolesText] = useState(() => (user?.roles ?? ['authenticated', 'anonymous']).join(', '));
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

    const updateIdentityDetails = (path: string, value: unknown) => {
        if (!path) {
            setField('identityDetails', { value });
            return;
        }

        const current = form.identityDetails && typeof form.identityDetails === 'object'
            ? form.identityDetails
            : {};
        setField('identityDetails', setValueAtPath(current, path, value));
    };

    const save = () => {
        const roles = rolesText.split(',').map(_ => _.trim()).filter(Boolean);
        onSave({ ...form, roles, source: form.source ?? 'custom' });
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
                        disabled={readOnly}
                        onChange={event => setField('name', event.target.value)}
                        placeholder="john.doe@example.com"
                    />
                </div>

                <div className="field-block">
                    <label htmlFor="display-name">Display name</label>
                    <InputText
                        id="display-name"
                        value={form.displayName}
                        disabled={readOnly}
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
                        disabled={readOnly}
                        onChange={event => setField('identityProvider', event.value as string)}
                    />
                </div>

                <div className="field-block">
                    <label htmlFor="user-id">User id</label>
                    <InputText
                        id="user-id"
                        value={form.id}
                        disabled={readOnly}
                        onChange={event => setField('id', event.target.value)}
                    />
                </div>

                <div className="field-block full-width">
                    <label htmlFor="roles">Roles (comma separated)</label>
                    <InputText
                        id="roles"
                        value={rolesText}
                        disabled={readOnly}
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
                        <Button label="Upload image" icon="pi pi-upload" outlined onClick={selectImage} disabled={readOnly} />
                        {form.imageUrl && !readOnly && (
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
                    <Button icon="pi pi-plus" text rounded aria-label="Add claim" onClick={addClaim} disabled={readOnly} />
                </div>
                <Message severity="info" text="Claims are included in the X-MS-CLIENT-PRINCIPAL header." />
                <div className="kv-editor">
                    {form.claims.map((claim, index) => (
                        <div className="kv-row" key={`${claim.type}-${index}`}>
                            <InputText
                                value={claim.type}
                                readOnly={readOnly}
                                onChange={event => updateClaim(index, 'type', event.target.value)}
                                placeholder="type"
                            />
                            <InputText
                                value={claim.value}
                                readOnly={readOnly}
                                onChange={event => updateClaim(index, 'value', event.target.value)}
                                placeholder="value"
                            />
                            <Button icon="pi pi-trash" text severity="danger" disabled={readOnly} onClick={() => removeClaim(index)} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="editor-card">
                <div className="editor-card-header">
                    <h4>Identity details</h4>
                </div>
                {identityDetailsSchema && (
                    <div className="schema-editor">
                        <CommandSchemaEditor
                            schema={identityDetailsSchema}
                            value={form.identityDetails}
                            label="Details"
                            path=""
                            readOnly={readOnly}
                            onChange={updateIdentityDetails}
                        />
                    </div>
                )}
                {!identityDetailsSchema && (
                    <Message severity="warn" text="Identity details schema is unavailable for this Arc application." />
                )}
            </div>

            <div className="action-row">
                {!readOnly && <Button label="Save user" icon="pi pi-check" onClick={save} disabled={!isValid} />}
                <Button label={readOnly ? 'Close' : 'Cancel'} icon="pi pi-times" outlined onClick={onCancel} />
            </div>
        </div>
    );
}
