import { afterEach, describe, it } from 'vitest';
import { probeArcApplication } from '../arcProbe';

const globals = globalThis as Record<string, unknown>;

function serve(answer: (path: string) => unknown) {
    globals.fetch = async (url: string) => {
        const body = answer(new URL(url).pathname);
        return body === undefined
            ? { ok: false, json: async () => { throw new Error('not found'); } }
            : { ok: true, json: async () => body };
    };
}

afterEach(() => {
    delete globals.fetch;
});

describe('when the origin serves the commands route', () => {
    it('should be an arc application', async () => {
        serve(path => path === '/.cratis/commands' ? [] : undefined);
        (await probeArcApplication('https://portal.test')).should.be.true;
    });
});

describe('when the origin serves only the queries route', () => {
    it('should be an arc application', async () => {
        serve(path => path === '/.cratis/queries' ? [{ name: 'AllAuthors' }] : undefined);
        (await probeArcApplication('https://portal.test')).should.be.true;
    });
});

describe('when the origin answers with something that is not a list', () => {
    it('should not be an arc application', async () => {
        serve(() => ({ not: 'a list' }));
        (await probeArcApplication('https://portal.test')).should.be.false;
    });
});

describe('when the origin answers with an error', () => {
    it('should not be an arc application', async () => {
        serve(() => undefined);
        (await probeArcApplication('https://portal.test')).should.be.false;
    });
});

describe('when the request fails', () => {
    it('should not be an arc application and not throw', async () => {
        globals.fetch = async () => { throw new Error('network'); };
        (await probeArcApplication('https://portal.test')).should.be.false;
    });
});

describe('when there is no http origin', () => {
    it('should not be an arc application and not ask', async () => {
        let asked = false;
        globals.fetch = async () => { asked = true; return { ok: true, json: async () => [] }; };
        (await probeArcApplication(null)).should.be.false;
        (await probeArcApplication('chrome://extensions')).should.be.false;
        asked.should.be.false;
    });
});
