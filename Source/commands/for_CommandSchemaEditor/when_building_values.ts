import { describe, it } from 'vitest';
import { JsonSchema } from '../../arc/introspection';
import { initialValueForSchema, setValueAtPath } from '../CommandSchemaEditor';

// The value is unknown to the compiler; Object carries the chai `should` typing.
function initial(schema?: JsonSchema): Object {
    return initialValueForSchema(schema) as Object;
}

describe('when computing the initial value for a schema', () => {
    it('should be an empty object without a schema', () => {
        initial(undefined).should.deep.equal({});
    });

    it('should use the default when there is one', () => {
        initial({ type: 'string', default: 'x' }).should.equal('x');
    });

    it('should be an empty string for a string', () => {
        initial({ type: 'string' }).should.equal('');
    });

    it('should be zero for numbers and integers', () => {
        initial({ type: 'number' }).should.equal(0);
        initial({ type: 'integer' }).should.equal(0);
    });

    it('should be false for a boolean', () => {
        initial({ type: 'boolean' }).should.equal(false);
    });

    it('should be an empty list for an array', () => {
        initial({ type: 'array' }).should.deep.equal([]);
    });

    it('should recurse into object properties', () => {
        const schema: JsonSchema = { type: 'object', properties: { a: { type: 'boolean' }, b: { type: 'object', properties: { c: { type: 'number' } } } } };
        initial(schema).should.deep.equal({ a: false, b: { c: 0 } });
    });
});

describe('when setting a value at a path', () => {
    it('should set a top level value without touching the target', () => {
        const target = { a: 1 };
        setValueAtPath(target, 'b', 2).should.deep.equal({ a: 1, b: 2 });
        target.should.deep.equal({ a: 1 });
    });

    it('should create missing intermediate objects', () => {
        setValueAtPath({}, 'a.b.c', 1).should.deep.equal({ a: { b: { c: 1 } } });
    });

    it('should replace intermediate values that are not objects', () => {
        setValueAtPath({ a: 5, b: [1] }, 'a.x', 1).should.deep.equal({ a: { x: 1 }, b: [1] });
        setValueAtPath({ a: [1] }, 'a.x', 1).should.deep.equal({ a: { x: 1 } });
    });

    it('should keep sibling values of an existing intermediate object', () => {
        setValueAtPath({ a: { y: 2 } }, 'a.x', 1).should.deep.equal({ a: { y: 2, x: 1 } });
    });
});
