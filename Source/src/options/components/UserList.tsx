import { useState } from 'react';
import { ExtensionSettings, UserProfile } from '../../shared/types';
import { UserForm } from './UserForm';

interface Props {
    settings: ExtensionSettings;
    onChange: (settings: ExtensionSettings) => void;
}

type Mode = 'list' | 'add' | 'edit';

export function UserList({ settings, onChange }: Props) {
    const [mode, setMode] = useState<Mode>('list');
    const [editUser, setEditUser] = useState<UserProfile | null>(null);

    const handleAdd = () => {
        setEditUser(null);
        setMode('add');
    };

    const handleEdit = (user: UserProfile) => {
        setEditUser(user);
        setMode('edit');
    };

    const handleDelete = (userId: string) => {
        const users = settings.users.filter(u => u.id !== userId);
        const activeUserId = settings.activeUserId === userId ? '' : settings.activeUserId;
        onChange({ ...settings, users, activeUserId });
    };

    const handleSave = (user: UserProfile) => {
        let users: UserProfile[];
        if (mode === 'add') {
            users = [...settings.users, user];
        } else {
            users = settings.users.map(u => u.id === user.id ? user : u);
        }
        onChange({ ...settings, users });
        setMode('list');
    };

    const handleCancel = () => {
        setMode('list');
    };

    const handleSetActive = (userId: string) => {
        const activeUserId = settings.activeUserId === userId ? '' : userId;
        onChange({ ...settings, activeUserId });
    };

    if (mode === 'add' || mode === 'edit') {
        return (
            <UserForm
                user={editUser}
                onSave={handleSave}
                onCancel={handleCancel}
            />
        );
    }

    return (
        <div>
            <div className="section-header">
                <h2>Users</h2>
                <button className="btn btn-primary" onClick={handleAdd}>+ Add User</button>
            </div>

            {settings.users.length === 0 ? (
                <div className="empty-state">
                    <p>No users configured yet.</p>
                    <button className="btn btn-primary" onClick={handleAdd}>Add your first user</button>
                </div>
            ) : (
                <div className="item-list">
                    {settings.users.map(user => (
                        <div
                            key={user.id}
                            className={`item-card ${user.id === settings.activeUserId ? 'selected' : ''}`}
                        >
                            <Avatar src={user.imageUrl} name={user.displayName || user.name} size={40} />
                            <div className="item-info">
                                <div className="item-name">{user.displayName || user.name}</div>
                                <div className="item-sub">{user.name} · {user.identityProvider || 'aad'}</div>
                                {user.claims.length > 0 && (
                                    <div className="item-sub">{user.claims.length} claim{user.claims.length !== 1 ? 's' : ''}</div>
                                )}
                            </div>
                            <div className="item-actions">
                                <button
                                    className={`btn btn-sm ${user.id === settings.activeUserId ? 'btn-primary' : 'btn-default'}`}
                                    onClick={() => handleSetActive(user.id)}
                                    title={user.id === settings.activeUserId ? 'Active – click to deactivate' : 'Set as active user'}
                                >
                                    {user.id === settings.activeUserId ? '✓ Active' : 'Set Active'}
                                </button>
                                <button className="btn btn-default btn-sm" onClick={() => handleEdit(user)}>Edit</button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(user.id)}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function Avatar({ src, name, size }: { src: string; name: string; size: number }) {
    const initials = name
        .split(' ')
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() ?? '')
        .join('');

    if (src) {
        return (
            <img
                src={src}
                alt={name}
                className="avatar"
                style={{ width: size, height: size }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
        );
    }
    return (
        <div className="avatar avatar-placeholder" style={{ width: size, height: size, fontSize: size * 0.36 }}>
            {initials}
        </div>
    );
}
