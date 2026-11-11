import { afterEach, beforeEach, describe, it } from 'vitest';
import { fetchCommands, fetchQueries, JsonSchema, tryResolveSchema } from '../introspection';

const originalFetch = globalThis.fetch;
let urls: string[];

function install(responder: (url: string) => Response | Error) {
    urls = [];
    globalThis.fetch = (async (url: string) => {
        urls.push(url);
        const result = responder(url.replace('http://host', ''));
        if (result instanceof Error) {
            throw result;
        }
        return result;
    }) as typeof fetch;
}

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
    globalThis.fetch = originalFetch;
});

describe('when fetching commands and queries', () => {
    it('should read the commands endpoint', async () => {
        install(() => json([{ name: 'A' }]));
        (await fetchCommands('http://host/')).should.deep.equal([{ name: 'A' }]);
        urls.should.deep.equal(['http://host/.cratis/commands']);
    });

    it('should read the queries endpoint', async () => {
        install(() => json([{ name: 'Q' }]));
        (await fetchQueries('http://host')).should.deep.equal([{ name: 'Q' }]);
        urls.should.deep.equal(['http://host/.cratis/queries']);
    });

    it('should reject with the status when the host answers with an error', async () => {
        install(() => new Response('', { status: 503, statusText: 'Unavailable' }));
        let message = '';
        try {
            await fetchCommands('http://host');
        } catch (error) {
            message = (error as Error).message;
        }
        message.should.equal('HTTP 503: Unavailable');
    });
});

describe('when resolving a schema', () => {
    let result: JsonSchema | undefined;

    describe('and the first candidate has one wrapped in a schema property', () => {
        beforeEach(async () => {
            install(() => json({ schema: { type: 'string' } }));
            result = await tryResolveSchema('http://host/', 'A B');
        });

        it('should return the wrapped schema', () => {
            result!.should.deep.equal({ type: 'string' });
        });

        it('should stop at the first candidate with the type encoded', () => {
            urls.should.deep.equal(['http://host/.cratis/types/A%20B']);
        });
    });

    describe('and the body is the schema itself', () => {
        beforeEach(async () => {
            install(() => json({ type: 'object' }));
            result = await tryResolveSchema('http://host', 'T');
        });

        it('should return the body', () => {
            result!.should.deep.equal({ type: 'object' });
        });
    });

    describe('and the schema property is not an object', () => {
        beforeEach(async () => {
            install(() => json({ schema: 'no' }));
            result = await tryResolveSchema('http://host', 'T');
        });

        it('should return the body', () => {
            result!.should.deep.equal({ schema: 'no' });
        });
    });

    describe('and earlier candidates fail, are not ok or are not objects', () => {
        beforeEach(async () => {
            install(url => {
                if (url.startsWith('/.cratis/types/')) {
                    return new Error('down');
                }
                if (url.startsWith('/.cratis/schema/')) {
                    return json({}, 404);
                }
                if (url.startsWith('/.cratis/schemas/')) {
                    return json(null);
                }
                return json({ type: 'boolean' });
            });
            result = await tryResolveSchema('http://host', 'T');
        });

        it('should return the first usable one', () => {
            result!.should.deep.equal({ type: 'boolean' });
        });

        it('should try every candidate in order', () => {
            urls.should.deep.equal([
                'http://host/.cratis/types/T', 'http://host/.cratis/schema/T',
                'http://host/.cratis/schemas/T', 'http://host/.cratis/types?type=T']);
        });
    });

    describe('and no candidate yields anything', () => {
        beforeEach(async () => {
            install(() => json('text'));
            result = await tryResolveSchema('http://host', 'T');
        });

        it('should return undefined', () => {
            (result === undefined).should.be.true;
        });
    });
});
