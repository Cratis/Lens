import { useState } from 'react';
import { UserProfile, Claim } from '../../shared/types';

interface Props {
    user: UserProfile | null;
    onSave: (user: UserProfile) => void;
    onCancel: () => void;
}

function newUser(): UserProfile {
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
    const [form, setForm] = useState<UserProfile>(() => user ? { ...user } : newUser());
    const [rolesText, setRolesText] = useState(() => (user?.roles ?? ['authenticated', 'anonymous']).join(', '));
    const [appPropsEntries, setAppPropsEntries] = useState<[string, string][]>(() =>
        Object.entries(user?.applicationProperties ?? {})
    );

    const setField = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const addClaim = () => {
        setField('claims', [...form.claims, { type: '', value: '' }]);
    };

    const updateClaim = (index: number, field: keyof Claim, value: string) => {
        const claims = form.claims.map((c, i) => i === index ? { ...c, [field]: value } : c);
        setField('claims', claims);
    };

    const removeClaim = (index: number) => {
        setField('claims', form.claims.filter((_, i) => i !== index));
    };

    const addAppProp = () => {
        setAppPropsEntries(prev => [...prev, ['', '']]);
    };

    const updateAppProp = (index: number, col: 0 | 1, value: string) => {
        setAppPropsEntries(prev => prev.map((entry, i) =>
            i === index ? (col === 0 ? [value, entry[1]] : [entry[0], value]) as [string, string] : entry
        ));
    };

    const removeAppProp = (index: number) => {
        setAppPropsEntries(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        const roles = rolesText.split(',').map(r => r.trim()).filter(Boolean);
        const applicationProperties = Object.fromEntries(
            appPropsEntries.filter(([k]) => k.trim() !== '')
        );
        onSave({ ...form, roles, applicationProperties });
    };

    const isValid = form.name.trim() !== '';

    return (
        <div>
            <div className="section-header">
                <h2>{user ? 'Edit User' : 'Add User'}</h2>
            </div>

            <div className="card">
                <div className="form-row">
                    <label>Username / Identifier *</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={e => setField('name', e.target.value)}
                        placeholder="e.g. john.doe@example.com"
                    />
                </div>

                <div className="form-row">
                    <label>Display Name</label>
                    <input
                        type="text"
                        value={form.displayName}
                        onChange={e => setField('displayName', e.target.value)}
                        placeholder="e.g. John Doe"
                    />
                </div>

                <div className="form-row">
                    <label>Identity Provider</label>
                    <select value={form.identityProvider} onChange={e => setField('identityProvider', e.target.value)}>
                        <option value="aad">Azure Active Directory (aad)</option>
                        <option value="github">GitHub</option>
                        <option value="twitter">Twitter</option>
                        <option value="google">Google</option>
                        <option value="facebook">Facebook</option>
                    </select>
                </div>

                <div className="form-row">
                    <label>User ID</label>
                    <input
                        type="text"
                        value={form.id}
                        onChange={e => setField('id', e.target.value)}
                        placeholder="Unique identifier (auto-generated)"
                    />
                </div>

                <div className="form-row">
                    <label>Roles (comma-separated)</label>
                    <input
                        type="text"
                        value={rolesText}
                        onChange={e => setRolesText(e.target.value)}
                        placeholder="authenticated, anonymous"
                    />
                </div>

                <div className="form-row">
                    <label>Image URL</label>
                    <input
                        type="url"
                        value={form.imageUrl}
                        onChange={e => setField('imageUrl', e.target.value)}
                        placeholder="https://example.com/avatar.png"
                    />
                </div>
            </div>

            <div className="card">
                <div className="card-title">Claims (X-MS-CLIENT-PRINCIPAL)</div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                    These are included in the <code>X-MS-CLIENT-PRINCIPAL</code> header as JWT-style claims.
                </p>
                <div className="kv-editor">
                    {form.claims.map((claim, i) => (
                        <div className="kv-row" key={i}>
                            <input
                                type="text"
                                value={claim.type}
                                onChange={e => updateClaim(i, 'type', e.target.value)}
                                placeholder="Claim type (e.g. name)"
                            />
                            <input
                                type="text"
                                value={claim.value}
                                onChange={e => updateClaim(i, 'value', e.target.value)}
                                placeholder="Value"
                            />
                            <button className="kv-del" onClick={() => removeClaim(i)} title="Remove">×</button>
                        </div>
                    ))}
                    <button className="kv-add-btn" onClick={addClaim}>+ Add Claim</button>
                </div>
            </div>

            <div className="card">
                <div className="card-title">Application Properties</div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                    Extra properties merged into the principal JSON (used by Arc&apos;s AuthProxy for application-specific identity data).
                </p>
                <div className="kv-editor">
                    {appPropsEntries.map(([key, val], i) => (
                        <div className="kv-row" key={i}>
                            <input
                                type="text"
                                value={key}
                                onChange={e => updateAppProp(i, 0, e.target.value)}
                                placeholder="Property name"
                            />
                            <input
                                type="text"
                                value={val}
                                onChange={e => updateAppProp(i, 1, e.target.value)}
                                placeholder="Value"
                            />
                            <button className="kv-del" onClick={() => removeAppProp(i)} title="Remove">×</button>
                        </div>
                    ))}
                    <button className="kv-add-btn" onClick={addAppProp}>+ Add Property</button>
                </div>
            </div>

            <div className="btn-row">
                <button className="btn btn-primary" onClick={handleSave} disabled={!isValid}>Save User</button>
                <button className="btn btn-default" onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
}
