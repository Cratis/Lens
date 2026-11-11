import { afterEach, beforeEach, describe, it } from 'vitest';
import { captureObservableQueryDiagnosticsForActiveTab } from '../diagnosticsCapture';

type Fiber = Record<string, unknown>;

const globals = globalThis as Record<string, unknown>;
let executeFailure: Error | null;
let tabs: { id?: number; url?: string }[];

// The page function is serialized by chrome.scripting.executeScript in production; here the stub runs it
// directly against a fake document, which is the same code path minus the serialization.
function installPage(root: Record<string, unknown> | null) {
    globals.document = { getElementById: (id: string) => id === 'root' ? root : null };
}

function installChrome() {
    globals.chrome = {
        tabs: { query: async () => tabs },
        scripting: {
            executeScript: async ({ func }: { func: () => unknown }) => {
                if (executeFailure) {
                    throw executeFailure;
                }
                return [{ result: func() }];
            },
        },
    };
}

const snapshot = { marker: 'snapshot' };

function contextFiber(extra: Fiber = {}): Fiber {
    return { memoizedProps: { value: { reconnectQueries: () => { }, observableQueryDiagnostics: { getSnapshot: () => snapshot } } }, ...extra };
}

async function capture() {
    return await captureObservableQueryDiagnosticsForActiveTab();
}

beforeEach(() => {
    executeFailure = null;
    tabs = [{ id: 1, url: 'https://app.test/' }];
    installChrome();
});

afterEach(() => {
    delete globals.chrome;
    delete globals.document;
});

describe('when the page has a context in the tree below the root fiber', () => {
    it('should return the snapshot', async () => {
        installPage({ __reactFiber$x: { child: { child: contextFiber() } } });
        (await capture())!.should.equal(snapshot);
    });
});

describe('when the context is reached through the container', () => {
    it('should return the snapshot from the current fiber', async () => {
        installPage({ __reactContainer$x: { current: contextFiber() } });
        (await capture())!.should.equal(snapshot);
    });

    it('should return the snapshot from the container itself', async () => {
        installPage({ __reactContainer$x: contextFiber() });
        (await capture())!.should.equal(snapshot);
    });
});

describe('when the context is only reachable through a sibling or a parent', () => {
    it('should find it through the sibling', async () => {
        installPage({ __reactFiber$x: { child: { sibling: contextFiber() } } });
        (await capture())!.should.equal(snapshot);
    });

    it('should find it through the parent', async () => {
        const start: Fiber = { };
        start.return = { child: start, return: contextFiber() };
        installPage({ __reactFiber$x: start });
        (await capture())!.should.equal(snapshot);
    });
});

describe('when two contexts are reachable', () => {
    it('should answer from the one that is visited first, siblings before children', async () => {
        const other = { marker: 'other' };
        const sibling = contextFiber();
        (sibling.memoizedProps as { value: { observableQueryDiagnostics: { getSnapshot: () => unknown } } })
            .value.observableQueryDiagnostics.getSnapshot = () => other;
        installPage({ __reactFiber$x: { child: contextFiber(), sibling } });
        (await capture())!.should.equal(other);
    });
});

describe('when the tree loops back on itself without a context', () => {
    it('should return null', async () => {
        const a: Fiber = {};
        const b: Fiber = { return: a };
        a.child = b;
        a.sibling = a;
        installPage({ __reactFiber$x: a });
        ((await capture()) === null).should.be.true;
    });
});

describe('when the page cannot be inspected', () => {
    it('should return null without a root element', async () => {
        installPage(null);
        ((await capture()) === null).should.be.true;
    });

    it('should return null when the root has no react keys', async () => {
        installPage({ other: {} });
        ((await capture()) === null).should.be.true;
    });

    it('should return null when the keys hold no objects', async () => {
        installPage({ __reactFiber$x: 'no', __reactContainer$x: 5 });
        ((await capture()) === null).should.be.true;
    });
});

describe('when the context has no usable diagnostics', () => {
    it('should return null without diagnostics', async () => {
        installPage({ __reactFiber$x: { memoizedProps: { value: { reconnectQueries: () => { } } } } });
        ((await capture()) === null).should.be.true;
    });

    it('should return null when getSnapshot is not a function', async () => {
        installPage({ __reactFiber$x: { memoizedProps: { value: { reconnectQueries: 1, observableQueryDiagnostics: { getSnapshot: 1 } } } } });
        ((await capture()) === null).should.be.true;
    });

    it('should return null when getSnapshot throws', async () => {
        installPage({ __reactFiber$x: { memoizedProps: { value: { reconnectQueries: 1, observableQueryDiagnostics: { getSnapshot: () => { throw new Error('x'); } } } } } });
        ((await capture()) === null).should.be.true;
    });

    it('should not look further than the first context', async () => {
        installPage({ __reactFiber$x: { memoizedProps: { value: { reconnectQueries: 1 } }, child: contextFiber() } });
        ((await capture()) === null).should.be.true;
    });
});

describe('when there is no tab to inspect', () => {
    it('should return null without an inspectable tab', async () => {
        tabs = [{ id: 1, url: 'chrome://extensions' }];
        installPage({ __reactFiber$x: contextFiber() });
        ((await capture()) === null).should.be.true;
    });

    it('should return null when the tab has no id', async () => {
        tabs = [{ url: 'https://app.test/' }];
        installPage({ __reactFiber$x: contextFiber() });
        ((await capture()) === null).should.be.true;
    });

    it('should return null when the script cannot be executed', async () => {
        executeFailure = new Error('no access');
        installPage({ __reactFiber$x: contextFiber() });
        ((await capture()) === null).should.be.true;
    });
});
