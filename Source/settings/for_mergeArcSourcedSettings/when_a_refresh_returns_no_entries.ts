import { describe, beforeEach, it } from 'vitest';
import { aTenant, aUser, settingsWith } from '../../testing/chromeStub';
import { ExtensionSettings } from '../../shared/types';
import { mergeArcSourcedSettings, mergeArcTenants, mergeArcUsers } from '../arcDevelopmentSources';

// A rejected fetch and a host with nothing on it both produce an empty list, so the merge is told which
// happened. Getting this wrong in either direction is a real bug: treat a failure as empty and an
// unreachable host wipes the roster along with the active selection; treat empty as a failure and a host
// whose users were genuinely removed shows them forever.
describe('when a full refresh fails', () => {
    let merged: ExtensionSettings;

    beforeEach(() => {
        merged = mergeArcSourcedSettings(
            settingsWith({
                users: [aUser()],
                tenants: [aTenant()],
                activeUserId: 'user-1',
                activeTenantId: 'tenant-1',
            }),
            { users: [], tenants: [], usersFailed: true, tenantsFailed: true });
    });

    it('should keep the previously fetched users', () => {
        merged.users.should.have.lengthOf(1);
    });

    it('should keep the previously fetched tenants', () => {
        merged.tenants.should.have.lengthOf(1);
    });

    it('should keep the active selection', () => {
        merged.activeUserId.should.equal('user-1');
        merged.activeTenantId.should.equal('tenant-1');
    });
});

describe('when a full refresh succeeds and the host has nothing', () => {
    let merged: ExtensionSettings;

    beforeEach(() => {
        merged = mergeArcSourcedSettings(
            settingsWith({
                users: [aUser()],
                tenants: [aTenant()],
                activeUserId: 'user-1',
                activeTenantId: 'tenant-1',
            }),
            { users: [], tenants: [], usersFailed: false, tenantsFailed: false });
    });

    it('should clear the arc-sourced users', () => {
        merged.users.should.have.lengthOf(0);
    });

    it('should clear the arc-sourced tenants', () => {
        merged.tenants.should.have.lengthOf(0);
    });

    it('should drop the selection that no longer resolves', () => {
        merged.activeUserId.should.equal('');
        merged.activeTenantId.should.equal('');
    });
});

describe('when only the users fetch fails', () => {
    let merged: ExtensionSettings;

    beforeEach(() => {
        merged = mergeArcSourcedSettings(
            settingsWith({
                users: [aUser()],
                tenants: [aTenant()],
                activeUserId: 'user-1',
                activeTenantId: 'tenant-1',
            }),
            { users: [], tenants: [], usersFailed: true, tenantsFailed: false });
    });

    it('should keep the users it could not refresh', () => {
        merged.users.should.have.lengthOf(1);
    });

    it('should still clear the tenants it did refresh', () => {
        merged.tenants.should.have.lengthOf(0);
    });
});

describe('when a full refresh returns a new roster', () => {
    let merged: ExtensionSettings;

    beforeEach(() => {
        merged = mergeArcSourcedSettings(
            settingsWith({
                users: [aUser(), aUser({ id: 'custom-1', source: 'custom' })],
                activeUserId: 'user-1',
            }),
            { users: [aUser({ id: 'user-9' })], tenants: [], usersFailed: false, tenantsFailed: false });
    });

    it('should replace the arc-sourced users', () => {
        merged.users.filter(_ => _.source === 'arc').map(_ => _.id).should.deep.equal(['user-9']);
    });

    it('should keep hand-made users', () => {
        merged.users.filter(_ => _.source === 'custom').map(_ => _.id).should.deep.equal(['custom-1']);
    });

    it('should fall back to the first available user when the selected one is gone', () => {
        merged.activeUserId.should.equal('custom-1');
    });
});

describe('when a users-only refresh fails', () => {
    let merged: ExtensionSettings;

    beforeEach(() => {
        merged = mergeArcUsers(
            settingsWith({ users: [aUser()], activeUserId: 'user-1' }),
            { users: [], usersFailed: true });
    });

    it('should keep the previously fetched users and the selection', () => {
        merged.users.should.have.lengthOf(1);
        merged.activeUserId.should.equal('user-1');
    });
});

describe('when a users-only refresh succeeds and the host has none', () => {
    let merged: ExtensionSettings;

    beforeEach(() => {
        merged = mergeArcUsers(
            settingsWith({ users: [aUser()], activeUserId: 'user-1' }),
            { users: [], usersFailed: false });
    });

    it('should clear the users and the selection', () => {
        merged.users.should.have.lengthOf(0);
        merged.activeUserId.should.equal('');
    });
});

describe('when a tenants-only refresh fails', () => {
    let merged: ExtensionSettings;

    beforeEach(() => {
        merged = mergeArcTenants(
            settingsWith({ tenants: [aTenant()], activeTenantId: 'tenant-1' }),
            { tenants: [], tenantsFailed: true });
    });

    it('should keep the previously fetched tenants and the selection', () => {
        merged.tenants.should.have.lengthOf(1);
        merged.activeTenantId.should.equal('tenant-1');
    });
});

describe('when a tenants-only refresh succeeds and the host has none', () => {
    let merged: ExtensionSettings;

    beforeEach(() => {
        merged = mergeArcTenants(
            settingsWith({ tenants: [aTenant()], activeTenantId: 'tenant-1' }),
            { tenants: [], tenantsFailed: false });
    });

    it('should clear the tenants and the selection', () => {
        merged.tenants.should.have.lengthOf(0);
        merged.activeTenantId.should.equal('');
    });
});
