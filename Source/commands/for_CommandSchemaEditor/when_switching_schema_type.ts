import { ReactElement } from 'react';
import { InputText } from 'primereact/inputtext';
import { describe, it } from 'vitest';
import { JsonSchema } from '../../arc/introspection';
import { CommandSchemaEditor } from '../CommandSchemaEditor';

// The editor is hook free, so it can be called directly to inspect the element tree React would reconcile.
// Every field must be a plain element at the root (a host div, not a nested component), with the input at the
// same position, so switching the schema type updates the existing input instead of remounting it.
function treeFor(schema: JsonSchema, value: unknown): ReactElement {
    return CommandSchemaEditor({ schema, value, label: 'L', path: 'p', onChange: () => { } }) as ReactElement;
}

function inputOf(root: ReactElement): ReactElement {
    return (root.props as { children: ReactElement[] }).children[1];
}

describe('when switching between text, enum and array schemas', () => {
    const text = treeFor({ type: 'string' }, 'x');
    const enumerated = treeFor({ type: 'string', enum: ['a'] }, 'x');
    const array = treeFor({ type: 'array' }, ['x']);

    it('should render a host div at the root for each', () => {
        [text, enumerated, array].map(_ => _.type).should.deep.equal(['div', 'div', 'div']);
    });

    it('should use the same class at the root for each', () => {
        [text, enumerated, array].map(_ => (_.props as { className: string }).className)
            .should.deep.equal(['field-block', 'field-block', 'field-block']);
    });

    it('should place an InputText at the same position for each', () => {
        [text, enumerated, array].map(_ => inputOf(_).type === InputText).should.deep.equal([true, true, true]);
    });

    it('should not key the inputs differently', () => {
        [text, enumerated, array].map(_ => inputOf(_).key).should.deep.equal([null, null, null]);
    });
});
