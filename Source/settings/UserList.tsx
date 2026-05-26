import { useState } from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { JsonSchema } from '../arc/introspection';
import { ExtensionSettings, UserProfile } from '../shared/types';
import { UserForm } from './UserForm';

interface Props {
    settings: ExtensionSettings;
    onChange: (settings: ExtensionSettings) => void;
    identityDetailsSchema?: JsonSchema;
}

type Mode = 'list' | 'add' | 'edit' | 'view';

function getSource(user: UserProfile): 'custom' | 'arc' {
    return user.source === 'arc' ? 'arc' : 'custom';
}

export function UserList({ settings, onChange, identityDetailsSchema }: Props) {
    const [mode, setMode] = useState<Mode>('list');
    const [editUser, setEditUser] = useState<UserProfile | null>(null);

    const save = (user: UserProfile) => {
        const source = getSource(user);
        const users = mode === 'add'
            ? [...settings.users, { ...user, source: 'custom' as const }]
            : settings.users.map(_ => _.id === user.id && getSource(_) === source ? user : _);

        onChange({ ...settings, users });
        setMode('list');
    };

    const remove = (user: UserProfile) => {
        if (getSource(user) === 'arc') {
            return;
        }

        const users = settings.users.filter(_ => !(_.id === user.id && getSource(_) === getSource(user)));
        const activeUserId = settings.activeUserId === user.id ? '' : settings.activeUserId;
        onChange({ ...settings, users, activeUserId });
    };

    if (mode === 'add' || mode === 'edit' || mode === 'view') {
        return (
            <UserForm
                user={editUser}
                onSave={save}
                onCancel={() => setMode('list')}
                readOnly={mode === 'view'}
                identityDetailsSchema={identityDetailsSchema}
            />
        );
    }

    return (
        <div className="stack-gap">
            <div className="panel-header">
                <h3>User options</h3>
                <Button
                    label="Add user"
                    icon="pi pi-plus"
                    onClick={() => {
                        setEditUser(null);
                        setMode('add');
                    }}
                />
            </div>

            {settings.users.length === 0 && (
                <div className="empty-state compact">
                    <p>No user options configured yet.</p>
                </div>
            )}

            {settings.users.length > 0 && (
                <div className="option-list">
                    {settings.users.map(user => (
                        <div className="option-item" key={`${getSource(user)}:${user.id}`}>
                            <div>
                                <div className="option-item-title">{user.displayName || user.name}</div>
                                <div className="option-item-subtitle">{user.name}</div>
                            </div>
                            <div className="option-item-actions">
                                {settings.activeUserId === user.id && <Tag value="Active" severity="success" />}
                                {getSource(user) === 'arc' && <Tag value="Arc" severity="info" />}
                                {getSource(user) === 'arc' && (
                                    <Button icon="pi pi-eye" rounded text onClick={() => {
                                        setEditUser(user);
                                        setMode('view');
                                    }} />
                                )}
                                {getSource(user) === 'custom' && (
                                    <Button icon="pi pi-pencil" rounded text onClick={() => {
                                        setEditUser(user);
                                        setMode('edit');
                                    }} />
                                )}
                                {getSource(user) === 'custom' && (
                                    <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => remove(user)} />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
