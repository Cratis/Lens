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
    onRefreshUsers: () => void;
    isRefreshingUsers: boolean;
}

type Mode = 'list' | 'add' | 'edit' | 'view';

function getSource(user: UserProfile): 'custom' | 'arc' {
    return user.source === 'arc' ? 'arc' : 'custom';
}

function isSameUser(first: UserProfile, second: UserProfile): boolean {
    return first.id === second.id && getSource(first) === getSource(second);
}

interface HeaderProps {
    isRefreshing: boolean;
    onAdd: () => void;
    onRefresh: () => void;
}

function UserListHeader({ isRefreshing, onAdd, onRefresh }: HeaderProps) {
    return (
        <div className="panel-header">
            <h3>User options</h3>
            <div className="option-item-actions">
                <Button
                    icon="pi pi-plus"
                    rounded
                    text
                    aria-label="Add user"
                    tooltip="Add user"
                    tooltipOptions={{ position: 'left' }}
                    onClick={onAdd}
                />
                <Button
                    className="tree-refresh-button"
                    icon={isRefreshing ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'}
                    rounded
                    text
                    disabled={isRefreshing}
                    aria-label="Refresh users from Arc"
                    tooltip="Refresh users from Arc"
                    tooltipOptions={{ position: 'left' }}
                    onClick={onRefresh}
                />
            </div>
        </div>
    );
}

interface RowProps {
    user: UserProfile;
    isActive: boolean;
    onView: () => void;
    onEdit: () => void;
    onRemove: () => void;
}

function UserRow({ user, isActive, onView, onEdit, onRemove }: RowProps) {
    const isArc = getSource(user) === 'arc';

    return (
        <div className="option-item">
            <div>
                <div className="option-item-title">{user.displayName || user.name}</div>
                <div className="option-item-subtitle">{user.name}</div>
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

export function UserList({ settings, onChange, identityDetailsSchema, onRefreshUsers, isRefreshingUsers }: Props) {
    const [mode, setMode] = useState<Mode>('list');
    const [editUser, setEditUser] = useState<UserProfile | null>(null);

    const save = (user: UserProfile) => {
        const users = mode === 'add'
            ? [...settings.users, { ...user, source: 'custom' as const }]
            : settings.users.map(_ => isSameUser(_, user) ? user : _);

        onChange({ ...settings, users });
        setMode('list');
    };

    const remove = (user: UserProfile) => {
        if (getSource(user) === 'arc') {
            return;
        }

        const users = settings.users.filter(_ => !isSameUser(_, user));
        const activeUserId = settings.activeUserId === user.id ? '' : settings.activeUserId;
        onChange({ ...settings, users, activeUserId });
    };

    const open = (user: UserProfile | null, nextMode: Mode) => {
        setEditUser(user);
        setMode(nextMode);
    };

    if (mode !== 'list') {
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
            <UserListHeader isRefreshing={isRefreshingUsers} onAdd={() => open(null, 'add')} onRefresh={onRefreshUsers} />

            {settings.users.length === 0 && (
                <div className="empty-state compact">
                    <p>No user options configured yet.</p>
                </div>
            )}

            {settings.users.length > 0 && (
                <div className="option-list">
                    {settings.users.map(user => (
                        <UserRow
                            key={`${getSource(user)}:${user.id}`}
                            user={user}
                            isActive={settings.activeUserId === user.id}
                            onView={() => open(user, 'view')}
                            onEdit={() => open(user, 'edit')}
                            onRemove={() => remove(user)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
