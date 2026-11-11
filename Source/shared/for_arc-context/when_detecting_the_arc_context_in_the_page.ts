import { afterEach, describe, it } from 'vitest';
import { captureArcContextForActiveTab } from '../arc-context';

const globals = globalThis as Record<string, unknown>;
const originalInfo = console.info;
const guid = '11111111-2222-3333-4444-555555555555';

type Detection = {
    isArcApplication: boolean;
    baseUrl: string | null;
    pageOrigin: string;
    configuration: Record<string, unknown> | null;
    detectionMethod: string;
};

// Runs the page function the way executeScript would, against a fake page.
async function detect(pathname: string, root: Record<string, unknown> | null): Promise<Detection> {
    console.info = () => { };
    globals.window = { location: { origin: 'https://app.test', pathname } };
    globals.document = { getElementById: (id: string) => id === 'root' ? root : null };
    let detection!: Detection;
    globals.chrome = {
        tabs: { query: async () => [{ id: 1, url: 'https://app.test/' }] },
        scripting: {
            executeScript: async ({ func }: { func: () => Detection }) => {
                detection = func();
                return [{ result: detection }];
            },
        },
    };
    await captureArcContextForActiveTab();
    return detection;
}

function contextRoot(value: Record<string, unknown>): Record<string, unknown> {
    return { __reactFiber$x: { child: { memoizedProps: { value } } } };
}

afterEach(() => {
    delete globals.chrome;
    delete globals.window;
    delete globals.document;
    console.info = originalInfo;
});

describe('when the page has no root element', () => {
    it('should detect by path for an arc application path', async () => {
        (await detect(`/projects/${guid}/application/${guid}`, null)).should.deep.equal({
            isArcApplication: true, baseUrl: 'https://app.test', pageOrigin: 'https://app.test', configuration: null, detectionMethod: 'path-fallback',
        });
    });

    it('should detect a different path as not arc', async () => {
        (await detect('/home', null)).should.deep.equal({
            isArcApplication: false, baseUrl: null, pageOrigin: 'https://app.test', configuration: null, detectionMethod: 'path-fallback',
        });
    });

    it('should require the application guid to be complete', async () => {
        (await detect(`/projects/${guid}/applicationx/${guid}`, null)).isArcApplication.should.be.false;
    });
});

describe('when the root has no react keys or no context', () => {
    it('should fall back to the path without react keys', async () => {
        (await detect(`/projects/${guid}/application/${guid}/`, { other: 1 })).detectionMethod.should.equal('path-fallback');
    });

    it('should fall back to the path when no context is found', async () => {
        const result = await detect('/home', { __reactFiber$x: { child: { memoizedProps: { value: { other: 1 } } } } });
        result.should.deep.equal({
            isArcApplication: false, baseUrl: null, pageOrigin: 'https://app.test', configuration: null, detectionMethod: 'path-fallback',
        });
    });
});

describe('when the page has an arc context', () => {
    it('should resolve the base url from the configuration against the page origin', async () => {
        const result = await detect('/', contextRoot({ reconnectQueries: () => { }, configuration: { baseUrl: 'https://api.test/v1', other: 1 } }));
        result.should.deep.equal({
            isArcApplication: true, baseUrl: 'https://api.test', pageOrigin: 'https://app.test',
            configuration: { baseUrl: 'https://api.test/v1', other: 1 }, detectionMethod: 'context',
        });
    });

    it('should recognise a context by its configuration keys alone', async () => {
        const result = await detect('/', contextRoot({ configuration: { apiBaseUrl: '/api' } }));
        result.detectionMethod.should.equal('context');
        result.baseUrl!.should.equal('https://app.test');
    });

    it('should not recognise a configuration without a base url key', async () => {
        (await detect('/', contextRoot({ configuration: { other: 1 } }))).detectionMethod.should.equal('path-fallback');
    });

    it('should prefer earlier configuration keys and skip blank or invalid ones', async () => {
        const result = await detect('/', contextRoot({
            reconnectQueries: 1, configuration: { baseUrl: '  ', apiBaseUrl: 5, apiSurface: 'https://[bad', apiSurfaceBaseUrl: 'https://one.test', baseUri: 'https://two.test' },
        }));
        result.baseUrl!.should.equal('https://one.test');
    });

    it('should fall back to the page origin without a configuration', async () => {
        const result = await detect('/', contextRoot({ reconnectQueries: 1 }));
        result.baseUrl!.should.equal('https://app.test');
        (result.configuration === undefined).should.be.true;
    });

    it('should use the origin when no configured base url resolves', async () => {
        (await detect('/', contextRoot({ reconnectQueries: 1, configuration: { baseUrl: 'https://[bad' } }))).baseUrl!.should.equal('https://app.test');
    });
});

describe('when the configuration is sanitized', () => {
    const nested = (depth: number): unknown => depth === 0 ? 'leaf' : { next: nested(depth - 1) };

    it('should drop functions, keep primitives and null, and map arrays', async () => {
        const result = await detect('/', contextRoot({
            reconnectQueries: 1,
            configuration: { fn: () => { }, text: 'a', num: 1, flag: false, nothing: null, list: [1, () => { }, { x: 'y' }], big: BigInt(1) },
        }));
        result.configuration!.should.deep.equal({ text: 'a', num: 1, flag: false, nothing: null, list: [1, null, { x: 'y' }], big: null });
    });

    it('should cut off values nested deeper than six levels', async () => {
        const result = await detect('/', contextRoot({ reconnectQueries: 1, configuration: nested(8) as Record<string, unknown> }));
        result.configuration!.should.deep.equal({ next: { next: { next: { next: { next: { next: { next: null } } } } } } });
    });
});
