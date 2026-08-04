import { beforeEach, describe, it } from 'vitest';
import { aTenant, aUser, settingsWith } from '../../testing/chromeStub';
import { buildContextRequestHeaders } from '../requestHeaders';

describe('when a user and tenant are active', () => {
    let headers: Record<string, string>;

    beforeEach(() => {
        headers = buildContextRequestHeaders(settingsWith({
            users: [aUser()],
            tenants: [aTenant()],
            activeUserId: 'user-1',
            activeTenantId: 'tenant-1',
        }));
    });

    it('should carry the identity and the tenancy', () => {
        headers['X-MS-CLIENT-PRINCIPAL-ID'].should.equal('user-1');
        headers['x-cratis-tenant-id'].should.equal('tenant-1');
    });

    it('should encode application properties into the principal', () => {
        const principal = JSON.parse(atob(headers['X-MS-CLIENT-PRINCIPAL']));
        principal.identityProvider.should.equal('aad');
        principal.claims.should.deep.equal([{ typ: 'role', val: 'admin' }]);
    });
});

describe('when a user carries no roles', () => {
    let principal: { userRoles: string[] };

    beforeEach(() => {
        const headers = buildContextRequestHeaders(settingsWith({
            users: [aUser({ roles: [] })],
            activeUserId: 'user-1',
        }));
        principal = JSON.parse(atob(headers['X-MS-CLIENT-PRINCIPAL']));
    });

    it('should fall back to the anonymous role set', () => {
        principal.userRoles.should.deep.equal(['authenticated', 'anonymous']);
    });
});

describe('when there are no settings at all', () => {
    it('should produce no headers', () => {
        Object.keys(buildContextRequestHeaders(null)).should.have.lengthOf(0);
    });
});

describe('when nothing is selected', () => {
    it('should produce no headers', () => {
        Object.keys(buildContextRequestHeaders(settingsWith())).should.have.lengthOf(0);
    });
});
