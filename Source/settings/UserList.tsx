import { useState } from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { ExtensionSettings, UserProfile } from '../shared/types';
import { UserForm } from './UserForm';

interface Props {
    settings: ExtensionSettings;
    onChange: (settings: ExtensionSettings) => void;
}

type Mode = 'list' | 'add' | 'edit';

export function UserList({ settings, onChange }: Props) {
    const [mode, setMode] = useState<Mode>('list');
    const [editUser, setEditUser] = useState<UserProfile | null>(null);

    const save = (user: UserProfile) => {
        const users = mode === 'add'
            ? [...settings.users, user]
            : settings.users.map(_ => _.id === user.id ? user : _);

        onChange({ ...settings, users });
        setMode('list');
    };

    const remove = (userId: string) => {
        const users = settings.users.filter(_ => _.id !== userId);
        const activeUserId = settings.activeUserId === userId ? '' : settings.activeUserId;
        onChange({ ...settings, users, activeUserId });
    };

    if (mode === 'add' || mode === 'edit') {
        return (
            <UserForm
                user={editUser}
                onSave={save}
                onCancel={() => setMode('list')}
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
                        <div className="option-item" key={user.id}>
                            <div>
                                <div className="option-item-title">{user.displayName || user.name}</div>
                                <div className="option-item-subtitle">{user.name}</div>
                            </div>
                            <div className="option-item-actions">
                                {settings.activeUserId === user.id && <Tag value="Active" severity="success" />}
                                <Button icon="pi pi-pencil" rounded text onClick={() => {
                                    setEditUser(user);
                                    setMode('edit');
                                }} />
                                <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => remove(user.id)} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
