import { afterEach, beforeEach, describe, it } from 'vitest';
import { fetchArcDevelopmentSources, fetchArcTenants, fetchArcUsers } from '../arcDevelopmentSources';

type Responder = (path: string) => Response | Error;

const originalFetch = globalThis.fetch;
const originalInfo = console.info;
const originalWarn = console.warn;
let requests: { url: string; init?: RequestInit }[];

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function install(responder: Responder) {
    requests = [];
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
        requests.push({ url, init });
        const result = responder(url.replace('http://host', ''));
        if (result instanceof Error) {
            throw result;
        }
        return result;
    }) as typeof fetch;
}

function restore() {
    globalThis.fetch = originalFetch;
    console.info = originalInfo;
    console.warn = originalWarn;
}

function silence() {
    console.info = () => { };
    console.warn = () => { };
}

const arcUser = {
    microsoftIdentity: { userId: ' u1 ', userDetails: ' Ada ', userRoles: ['admin', 1], claims: [{ typ: 'a', val: 'b' }, { Type: 'c' }, {}, 'x'] },
    details: { team: 'x' },
};

describe('when fetching users and tenants from a host', () => {
    let result: Awaited<ReturnType<typeof fetchArcDevelopmentSources>>;

    beforeEach(async () => {
        silence();
        install(path => {
            if (path === '/.cratis/users') {
                return json([arcUser, { MicrosoftIdentity: {} }, null, { MicrosoftIdentity: { UserId: 'u2' } }]);
            }
            if (path === '/.cratis/tenants') {
                return json([{ id: ' t1 ', NAME: 'Tenant' }, { Id: 't2' }, { name: 'none' }, 5]);
            }
            return json({ properties: { a: {} } });
        });
        result = await fetchArcDevelopmentSources('http://host/', { headers: { 'X-A': 'b' } });
    });
    afterEach(restore);

    it('should request each endpoint once without a double slash', () => {
        requests.map(_ => _.url).sort().should.deep.equal([
            'http://host/.cratis/identity-details/schema', 'http://host/.cratis/tenants', 'http://host/.cratis/users']);
    });

    it('should send the headers with the request options', () => {
        requests[0].init!.should.deep.equal({
            method: 'GET', credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json', 'X-A': 'b' },
        });
    });

    it('should map users that have a user id', () => {
        result.users.map(_ => _.id).should.deep.equal(['u1', 'u2']);
    });

    it('should map the user fields', () => {
        result.users[0].should.deep.equal({
            id: 'u1', name: 'Ada', displayName: 'Ada', identityProvider: 'aad', roles: ['admin', '1'],
            claims: [{ type: 'a', value: 'b' }, { type: 'c', value: '' }], applicationProperties: {},
            identityDetails: { team: 'x' }, imageUrl: '', source: 'arc',
        });
    });

    it('should fall back to the user id for the name and empty details', () => {
        result.users[1].name.should.equal('u2');
        result.users[1].identityDetails.should.deep.equal({});
    });

    it('should map tenants that have an id', () => {
        result.tenants.should.deep.equal([
            { id: 't1', name: 'Tenant', description: '', imageUrl: '', source: 'arc' },
            { id: 't2', name: 't2', description: '', imageUrl: '', source: 'arc' },
        ]);
    });

    it('should return the identity schema', () => {
        result.identityDetailsSchema!.should.deep.equal({ properties: { a: {} } });
    });

    it('should report no failures', () => {
        result.usersFailed.should.be.false;
        result.tenantsFailed.should.be.false;
    });
});

describe('when the host has no endpoints', () => {
    let result: Awaited<ReturnType<typeof fetchArcDevelopmentSources>>;

    beforeEach(async () => {
        silence();
        install(() => new Response('', { status: 404 }));
        result = await fetchArcDevelopmentSources('http://host');
    });
    afterEach(restore);

    it('should return empty lists without failure', () => {
        result.users.should.deep.equal([]);
        result.tenants.should.deep.equal([]);
        result.usersFailed.should.be.false;
        result.tenantsFailed.should.be.false;
    });

    it('should have no schema', () => {
        (result.identityDetailsSchema === undefined).should.be.true;
    });
});

describe('when the endpoints answer with payloads of the wrong shape', () => {
    let result: Awaited<ReturnType<typeof fetchArcDevelopmentSources>>;

    beforeEach(async () => {
        silence();
        install(() => json({ not: 'an array' }));
        result = await fetchArcDevelopmentSources('http://host');
    });
    afterEach(restore);

    it('should treat the lists as empty without failure', () => {
        result.users.should.deep.equal([]);
        result.tenants.should.deep.equal([]);
        result.usersFailed.should.be.false;
    });

    it('should keep an object payload as the schema', () => {
        result.identityDetailsSchema!.should.deep.equal({ not: 'an array' });
    });
});

describe('when the schema payload is not an object', () => {
    it('should have no schema', async () => {
        silence();
        install(() => json('text'));
        try {
            const result = await fetchArcDevelopmentSources('http://host');
            (result.identityDetailsSchema === undefined).should.be.true;
        } finally {
            restore();
        }
    });
});

describe('when every request fails', () => {
    let result: Awaited<ReturnType<typeof fetchArcDevelopmentSources>>;
    let warnings: unknown[][];

    beforeEach(async () => {
        silence();
        warnings = [];
        console.warn = (...args: unknown[]) => { warnings.push(args); };
        install(path => path.endsWith('users') ? new Error('boom') : json('bad', 500));
        result = await fetchArcDevelopmentSources('http://host');
    });
    afterEach(restore);

    it('should flag users and tenants as failed', () => {
        result.usersFailed.should.be.true;
        result.tenantsFailed.should.be.true;
    });

    it('should return empty data', () => {
        result.users.should.deep.equal([]);
        result.tenants.should.deep.equal([]);
        (result.identityDetailsSchema === undefined).should.be.true;
    });

    it('should describe a rejected request', () => {
        (warnings[0][1] as { reason: { message: string } }).reason.message.should.equal('Users request failed for http://host: boom');
    });

    it('should describe an unexpected response', () => {
        const messages = warnings.map(_ => (_[1] as { reason: { message: string } }).reason.message);
        messages.should.contain('Tenants endpoint failed (500) [application/json] from http://host: "bad"');
        messages.should.contain('Identity details schema endpoint failed (500) [application/json] from http://host: "bad"');
    });
});

describe('when fetching only users', () => {
    afterEach(restore);

    it('should return the users and schema', async () => {
        silence();
        install(path => path.endsWith('users') ? json([{ MicrosoftIdentity: { UserId: 'u' } }]) : json({ type: 'object' }));
        const result = await fetchArcUsers('http://host');
        result.users.map(_ => _.id).should.deep.equal(['u']);
        result.identityDetailsSchema!.should.deep.equal({ type: 'object' });
        result.usersFailed.should.be.false;
    });

    it('should flag a failure but still return the schema', async () => {
        silence();
        install(path => path.endsWith('users') ? new Error('x') : json({ type: 'object' }));
        const result = await fetchArcUsers('http://host');
        result.usersFailed.should.be.true;
        result.users.should.deep.equal([]);
        result.identityDetailsSchema!.should.deep.equal({ type: 'object' });
    });
});

describe('when fetching only tenants', () => {
    afterEach(restore);

    it('should return the tenants', async () => {
        silence();
        install(() => json([{ Id: 't' }]));
        const result = await fetchArcTenants('http://host');
        result.tenants.map(_ => _.id).should.deep.equal(['t']);
        result.tenantsFailed.should.be.false;
    });

    it('should flag a failure', async () => {
        silence();
        install(() => new Error('x'));
        const result = await fetchArcTenants('http://host');
        result.tenantsFailed.should.be.true;
        result.tenants.should.deep.equal([]);
    });
});
