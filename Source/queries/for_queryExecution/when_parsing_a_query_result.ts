import { describe, it } from 'vitest';
import { parseQueryResult, QueryExecutionViewModel } from '../queryExecution';

describe('when parsing messages', () => {
    it('should collect messages in a fixed order and drop non strings', () => {
        const result = parseQueryResult({
            exceptionMessages: ['e1', 5], errors: ['e2', null], message: ' m ', title: 't', detail: 'd',
        }, 500);
        result.messages.should.deep.equal(['e1', 'e2', 'm', 't', 'd']);
    });

    it('should trim a string payload and use it as the message and the data', () => {
        const result = parseQueryResult('  boom  ', 500);
        result.messages.should.deep.equal(['boom']);
        (result.data as string).should.equal('  boom  ');
    });

    it('should ignore blank strings', () => {
        parseQueryResult({ message: '  ', title: '', detail: ' ' }, 200).messages.should.deep.equal([]);
        parseQueryResult('   ', 200).messages.should.deep.equal([]);
    });

    it('should remove duplicates keeping the first', () => {
        parseQueryResult({ exceptionMessages: ['a'], errors: ['a', 'b'], message: 'b' }, 400).messages.should.deep.equal(['a', 'b']);
    });

    it('should ignore message fields that are not strings', () => {
        parseQueryResult({ message: 1, title: {}, detail: ['x'], errors: 'no' }, 400).messages.should.deep.equal([]);
    });

    it('should have no messages for an array payload', () => {
        parseQueryResult(['x'], 200).messages.should.deep.equal([]);
    });
});

describe('when parsing data', () => {
    const dataOf = (raw: unknown): unknown => parseQueryResult(raw, 200).data;

    it('should return arrays as they are', () => {
        const raw = [1, 2];
        (dataOf(raw) === raw).should.be.true;
    });

    it('should return primitives as they are', () => {
        (dataOf(5) as number).should.equal(5);
        (dataOf(false) as boolean).should.equal(false);
    });

    it('should have no data for null or an empty object', () => {
        (dataOf(null) === undefined).should.be.true;
        (dataOf({}) === undefined).should.be.true;
        (dataOf(undefined) === undefined).should.be.true;
    });

    it('should pick the first present wrapper property in priority order', () => {
        (dataOf({ content: 7, payload: 6, value: 5, results: 4, items: 3, result: 2, data: 1 }) as number).should.equal(1);
        (dataOf({ content: 7, payload: 6, value: 5, results: 4, items: 3, result: 2 }) as number).should.equal(2);
        (dataOf({ content: 7, payload: 6, value: 5, results: 4, items: 3 }) as number).should.equal(3);
        (dataOf({ content: 7, payload: 6, value: 5, results: 4 }) as number).should.equal(4);
        (dataOf({ content: 7, payload: 6, value: 5 }) as number).should.equal(5);
        (dataOf({ content: 7, payload: 6 }) as number).should.equal(6);
        (dataOf({ content: 7 }) as number).should.equal(7);
    });

    it('should skip null and undefined wrapper properties', () => {
        (dataOf({ data: undefined, result: 'r' }) as string).should.equal('r');
        (dataOf({ data: null, result: 'r' }) as string).should.equal('r');
    });

    it('should return null when the last wrapper property is null and nothing else is set', () => {
        (dataOf({ content: null }) === null).should.be.true;
        const row = { data: null };
        (dataOf(row) === row).should.be.true;
    });

    it('should treat an object that looks like a row as the data', () => {
        const raw = { id: 1 };
        (dataOf(raw) === raw).should.be.true;
    });
});

describe('when parsing the outcome', () => {
    const parse = (raw: unknown, status: number): QueryExecutionViewModel => parseQueryResult(raw, status);

    it('should carry the status code', () => {
        parse({}, 418).statusCode.should.equal(418);
    });

    it('should succeed for 2xx statuses', () => {
        parse({}, 200).isSuccess.should.be.true;
        parse({}, 299).isSuccess.should.be.true;
    });

    it('should fail outside 2xx', () => {
        parse({}, 199).isSuccess.should.be.false;
        parse({}, 300).isSuccess.should.be.false;
    });

    it('should prefer a boolean isSuccess in the payload', () => {
        parse({ isSuccess: false }, 200).isSuccess.should.be.false;
        parse({ isSuccess: true }, 500).isSuccess.should.be.true;
    });

    it('should ignore an isSuccess that is not a boolean', () => {
        parse({ isSuccess: 'yes' }, 500).isSuccess.should.be.false;
    });

    it('should ignore the payload isSuccess of an array', () => {
        parse([], 500).isSuccess.should.be.false;
    });
});
