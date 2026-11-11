import { describe, it } from 'vitest';
import { extractColumns, formatCellValue, normalizeRows } from '../queryExecution';

describe('when normalizing rows', () => {
    it('should keep object items and wrap others with their index', () => {
        normalizeRows([{ a: 1 }, 5, null]).should.deep.equal([{ a: 1 }, { value: 5, index: 1 }, { value: null, index: 2 }]);
    });

    it('should wrap a single object', () => {
        normalizeRows({ a: 1 }).should.deep.equal([{ a: 1 }]);
    });

    it('should be empty for undefined', () => {
        normalizeRows(undefined).should.deep.equal([]);
    });

    it('should wrap primitives and null', () => {
        normalizeRows('x').should.deep.equal([{ value: 'x' }]);
        normalizeRows(null).should.deep.equal([{ value: null }]);
    });
});

describe('when extracting columns', () => {
    it('should list distinct keys in order of first appearance', () => {
        extractColumns([{ a: 1, b: 2 }, { b: 3, c: 4 }]).should.deep.equal(['a', 'b', 'c']);
    });

    it('should be empty without rows', () => {
        extractColumns([]).should.deep.equal([]);
    });
});

describe('when formatting a cell', () => {
    it('should be empty for null and undefined', () => {
        formatCellValue(null).should.equal('');
        formatCellValue(undefined).should.equal('');
    });

    it('should serialize objects and arrays', () => {
        formatCellValue({ a: 1 }).should.equal('{"a":1}');
        formatCellValue([1]).should.equal('[1]');
    });

    it('should stringify primitives', () => {
        formatCellValue(0).should.equal('0');
        formatCellValue(false).should.equal('false');
    });
});
