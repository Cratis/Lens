import { describe, beforeEach, it } from 'vitest';
import { aTenant, aUser, settingsWith } from '../../testing/chromeStub';
import { ExtensionSettings } from '../../shared/types';
import { mergeArcSourcedSettings, mergeArcTenants, mergeArcUsers } from '../arcDevelopmentSources';

// A refresh whose fetch rejected comes back as an empty list, not as an error -- so an unreachable Arc host
// used to look exactly like "the host has no users" and wiped the roster along with the active selection.
describe('when a full refresh returns nothing', () => {
    let merged: ExtensionSettings;

    beforeEach(() => {
        merged = mergeArcSourcedSettings(
            settingsWith({
                users: [aUser()],
                tenants: [aTenant()],
                activeUserId: 'user-1',
                activeTenantId: 'tenant-1',
            }),
            { users: [], tenants: [] });
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

describe('when a full refresh returns a new roster', () => {
    let merged: ExtensionSettings;

    beforeEach(() => {
        merged = mergeArcSourcedSettings(
            settingsWith({
                users: [aUser(), aUser({ id: 'custom-1', source: 'custom' })],
                activeUserId: 'user-1',
            }),
            { users: [aUser({ id: 'user-9' })], tenants: [] });
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

describe('when a users-only refresh returns nothing', () => {
    let merged: ExtensionSettings;

    beforeEach(() => {
        merged = mergeArcUsers(
            settingsWith({ users: [aUser()], activeUserId: 'user-1' }),
            []);
    });

    it('should keep the previously fetched users and the selection', () => {
        merged.users.should.have.lengthOf(1);
        merged.activeUserId.should.equal('user-1');
    });
});

describe('when a tenants-only refresh returns nothing', () => {
    let merged: ExtensionSettings;

    beforeEach(() => {
        merged = mergeArcTenants(
            settingsWith({ tenants: [aTenant()], activeTenantId: 'tenant-1' }),
            []);
    });

    it('should keep the previously fetched tenants and the selection', () => {
        merged.tenants.should.have.lengthOf(1);
        merged.activeTenantId.should.equal('tenant-1');
    });
});
