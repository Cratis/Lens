import { afterEach, describe, it } from 'vitest';
import {
    applyAvailabilityOverrides,
    AvailabilityToolsUnavailableError,
    fetchAvailabilityModel,
    fetchStructure,
    NO_OVERRIDES,
    withAudienceSwitch,
} from '../availability';

const originalFetch = globalThis.fetch;
let requests: { url: string; init?: RequestInit }[] = [];

function respond(status: number, body: unknown) {
    requests = [];
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
        requests.push({ url, init });
        return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;
}

async function failure(call: () => Promise<unknown>): Promise<unknown> {
    try {
        await call();
        return undefined;
    } catch (error) {
        return error;
    }
}

afterEach(() => {
    globalThis.fetch = originalFetch;
});

describe('when fetching the structure', () => {
    it('should read it from the structure endpoint, sending the headers', async () => {
        respond(200, { modules: [{ name: 'Fleet', path: 'Fleet', features: [], slices: [] }] });
        const structure = await fetchStructure('http://host/', { 'x-tenant': 'acme' });

        requests[0].url.should.equal('http://host/.cratis/structure');
        (requests[0].init!.headers as Record<string, string>)['x-tenant'].should.equal('acme');
        structure.modules.map(_ => _.name).should.deep.equal(['Fleet']);
    });

    it('should fail on an error status', async () => {
        respond(500, {});
        String(await failure(() => fetchStructure('http://host'))).should.contain('HTTP 500');
    });
});

describe('when fetching the availability model', () => {
    it('should read the overrides and the audiences', async () => {
        respond(200, { overrides: { enabledAudiences: ['Plus'] }, audiences: [{ name: 'Plus', description: 'Paid' }] });
        const model = await fetchAvailabilityModel('http://host');

        requests[0].url.should.equal('http://host/.cratis/availability/model');
        model.overrides.enabledAudiences.should.deep.equal(['Plus']);
        model.audiences.should.deep.equal([{ name: 'Plus', description: 'Paid', source: '' }]);
    });

    it('should say the tools are unavailable when the application does not map them', async () => {
        respond(404, {});
        ((await failure(() => fetchAvailabilityModel('http://host'))) instanceof AvailabilityToolsUnavailableError).should.be.true;
    });
});

describe('when applying overrides', () => {
    it('should post them as JSON and return what is now in force', async () => {
        const overrides = withAudienceSwitch(NO_OVERRIDES, 'Plus', 'on');
        respond(200, overrides);
        const applied = await applyAvailabilityOverrides('http://host', overrides, { 'x-tenant': 'acme' });

        requests[0].url.should.equal('http://host/.cratis/availability/overrides');
        requests[0].init!.method!.should.equal('POST');
        JSON.parse(String(requests[0].init!.body)).should.deep.equal(overrides);
        (requests[0].init!.headers as Record<string, string>)['Content-Type'].should.equal('application/json');
        applied.should.deep.equal(overrides);
    });

    it('should say the tools are unavailable when the application does not map them', async () => {
        respond(404, {});
        ((await failure(() => applyAvailabilityOverrides('http://host', NO_OVERRIDES))) instanceof AvailabilityToolsUnavailableError).should.be.true;
    });
});
