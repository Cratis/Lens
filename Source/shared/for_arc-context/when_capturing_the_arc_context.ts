import { afterEach, beforeEach, describe, it } from 'vitest';
import { ArcContextSnapshot, captureArcContextForActiveTab } from '../arc-context';

const globals = globalThis as Record<string, unknown>;
const originalInfo = console.info;
const originalWarn = console.warn;

const guid = '11111111-2222-3333-4444-555555555555';

type ExecuteScript = (options: { func: () => unknown }) => Promise<{ result?: unknown }[]>;

function install(tab: { id?: number; url?: string } | undefined, executeScript: ExecuteScript) {
    globals.chrome = {
        tabs: { query: async () => tab ? [tab] : [] },
        scripting: { executeScript },
    };
}

function withoutTime(snapshot: ArcContextSnapshot): Omit<ArcContextSnapshot, 'capturedAt'> {
    const { capturedAt, ...rest } = snapshot;
    (typeof capturedAt).should.equal('number');
    return rest;
}

function serve(routes: Record<string, unknown>) {
    globals.fetch = async (url: string) => {
        const path = new URL(url).pathname;
        return path in routes
            ? { ok: true, json: async () => routes[path] }
            : { ok: false, json: async () => { throw new Error('not found'); } };
    };
}

beforeEach(() => {
    serve({});
    console.info = () => { };
    console.warn = () => { };
});

afterEach(() => {
    delete globals.chrome;
    delete globals.fetch;
    console.info = originalInfo;
    console.warn = originalWarn;
});

describe('when there is no tab', () => {
    it('should describe a non arc page', async () => {
        install(undefined, async () => []);
        withoutTime(await captureArcContextForActiveTab()).should.deep.equal({
            isArcApplication: false, baseUrl: null, pageOrigin: null, configuration: null, detectionMethod: 'path-fallback',
            diagnostics: {
                selectedTabId: null, selectedTabUrl: null, tabSelectionStrategy: 'none', executeScriptStatus: 'not-run', errorMessage: null,
            },
        });
    });
});

describe('when the tab has no id', () => {
    it('should describe a non arc page with the origin', async () => {
        install({ url: 'https://app.test/x' }, async () => []);
        const snapshot = await captureArcContextForActiveTab();
        snapshot.isArcApplication.should.be.false;
        snapshot.pageOrigin!.should.equal('https://app.test');
        snapshot.diagnostics!.executeScriptStatus.should.equal('not-run');
    });
});

describe('when the script returns a detection result', () => {
    it('should turn it into a snapshot', async () => {
        const result = { isArcApplication: true, baseUrl: 'https://api.test', pageOrigin: 'https://app.test', configuration: { a: 1 }, detectionMethod: 'context' };
        install({ id: 7, url: 'https://app.test/' }, async () => [{ result }]);
        withoutTime(await captureArcContextForActiveTab()).should.deep.equal({
            ...result,
            diagnostics: {
                selectedTabId: 7, selectedTabUrl: 'https://app.test/', tabSelectionStrategy: 'active-last-focused',
                executeScriptStatus: 'success', errorMessage: null,
            },
        });
    });
});

describe('when the script returns nothing', () => {
    it('should fall back to arc for a local development url', async () => {
        install({ id: 7, url: 'http://localhost:5000/x' }, async () => []);
        const snapshot = await captureArcContextForActiveTab();
        withoutTime(snapshot).should.deep.equal({
            isArcApplication: true, baseUrl: 'http://localhost:5000', pageOrigin: 'http://localhost:5000', configuration: null,
            detectionMethod: 'path-fallback',
            diagnostics: {
                selectedTabId: 7, selectedTabUrl: 'http://localhost:5000/x', tabSelectionStrategy: 'active-last-focused',
                executeScriptStatus: 'empty-result', errorMessage: null,
            },
        });
    });

    it('should fall back to arc for an arc application path', async () => {
        install({ id: 7, url: `https://studio.test/projects/${guid}/application/${guid}/x` }, async () => [{}]);
        (await captureArcContextForActiveTab()).isArcApplication.should.be.true;
    });

    it('should describe other pages as non arc', async () => {
        install({ id: 7, url: 'https://app.test/' }, async () => [{}]);
        const snapshot = await captureArcContextForActiveTab();
        snapshot.isArcApplication.should.be.false;
        (snapshot.baseUrl === null).should.be.true;
        snapshot.diagnostics!.executeScriptStatus.should.equal('empty-result');
    });
});

describe('when the script fails', () => {
    it('should record the error message and fall back by url', async () => {
        install({ id: 7, url: 'http://127.0.0.1:3000/' }, async () => { throw new Error('denied'); });
        const snapshot = await captureArcContextForActiveTab();
        snapshot.isArcApplication.should.be.true;
        snapshot.baseUrl!.should.equal('http://127.0.0.1:3000');
        snapshot.diagnostics!.should.include({ executeScriptStatus: 'error', errorMessage: 'denied' });
    });

    it('should stringify a thrown value that is not an error', async () => {
        install({ id: 7, url: 'https://app.test/' }, async () => { throw 'plain'; });
        const snapshot = await captureArcContextForActiveTab();
        snapshot.isArcApplication.should.be.false;
        snapshot.diagnostics!.errorMessage!.should.equal('plain');
    });
});

describe('when the page has no arc context but its origin serves the arc discovery routes', () => {
    it('should find the application by probing the origin', async () => {
        serve({ '/.cratis/commands': [] });
        install({ id: 7, url: 'https://portal.test/settings' }, async () => [{ result: { isArcApplication: false, baseUrl: null, pageOrigin: 'https://portal.test', configuration: null, detectionMethod: 'path-fallback' } }]);
        const snapshot = await captureArcContextForActiveTab();
        snapshot.isArcApplication.should.be.true;
        snapshot.baseUrl!.should.equal('https://portal.test');
        snapshot.detectionMethod!.should.equal('probe');
        snapshot.diagnostics!.executeScriptStatus.should.equal('success');
    });

    it('should find it when the script could not run', async () => {
        serve({ '/.cratis/queries': [] });
        install({ id: 7, url: 'https://portal.test/' }, async () => { throw new Error('denied'); });
        const snapshot = await captureArcContextForActiveTab();
        snapshot.isArcApplication.should.be.true;
        snapshot.detectionMethod!.should.equal('probe');
    });
});

describe('when the page has an arc context', () => {
    it('should not probe the origin', async () => {
        let probed = false;
        globals.fetch = async () => { probed = true; return { ok: true, json: async () => [] }; };
        const result = { isArcApplication: true, baseUrl: 'https://api.test', pageOrigin: 'https://app.test', configuration: null, detectionMethod: 'context' };
        install({ id: 7, url: 'https://app.test/' }, async () => [{ result }]);
        (await captureArcContextForActiveTab()).detectionMethod!.should.equal('context');
        probed.should.be.false;
    });
});
