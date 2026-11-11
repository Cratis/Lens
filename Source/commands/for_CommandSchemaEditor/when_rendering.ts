import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, beforeEach, it } from 'vitest';
import { JsonSchema } from '../../arc/introspection';
import { CommandSchemaEditor } from '../CommandSchemaEditor';

function render(schema: JsonSchema | undefined, value: unknown, path = 'field', readOnly = false): string {
    return renderToStaticMarkup(createElement(CommandSchemaEditor, {
        schema, value, label: 'Label', path, onChange: () => { }, readOnly,
    }));
}

describe('when rendering an object schema', () => {
    let markup: string;

    beforeEach(() => {
        markup = render({ type: 'object', properties: { name: { type: 'string' } } }, { name: 'Ada' }, '');
    });

    it('should render a titled block', () => {
        markup.should.contain('<div class="schema-block"><div class="schema-title">Label</div>');
    });

    it('should render the child property with its value', () => {
        markup.should.contain('<label>name</label>');
        markup.should.contain('value="Ada"');
    });
});

describe('when rendering without a schema', () => {
    it('should render an empty object block', () => {
        render(undefined, undefined).should.equal('<div class="schema-block"><div class="schema-title">Label</div></div>');
    });
});

describe('when rendering a schema with only properties', () => {
    it('should treat it as an object', () => {
        render({ properties: { a: {} } }, {}).should.contain('schema-block');
    });
});

describe('when rendering a schema whose type is a list', () => {
    it('should prefer object over every other type', () => {
        render({ type: ['string', 'object'] } as unknown as JsonSchema, {}).should.contain('schema-block');
    });

    it('should render an array type as a comma separated field', () => {
        render({ type: ['string', 'array'] } as unknown as JsonSchema, ['a', 'b']).should.contain('Label (comma separated)');
    });

    it('should render a boolean type as a switch', () => {
        render({ type: ['string', 'boolean'] } as unknown as JsonSchema, true).should.contain('inline-field');
    });

    it('should render an integer type as a number field', () => {
        const markup = render({ type: ['string', 'integer'] } as unknown as JsonSchema, 5);
        markup.should.contain('p-inputnumber');
        markup.should.contain('value="5"');
    });

    it('should render a string type as text', () => {
        render({ type: ['string'] } as unknown as JsonSchema, 'x').should.contain('value="x"');
    });

    it('should fall back to text for unknown types', () => {
        render({ type: ['null'] } as unknown as JsonSchema, 'y').should.contain('value="y"');
    });
});

describe('when rendering a boolean schema', () => {
    it('should render an inline switch', () => {
        render({ type: 'boolean' }, true).should.contain('field-block inline-field');
    });
});

describe('when rendering a number schema', () => {
    it('should render the numeric value', () => {
        const markup = render({ type: 'number' }, 12);
        markup.should.contain('p-inputnumber');
        markup.should.contain('value="12"');
    });

    it('should default a missing value to zero', () => {
        const markup = render({ type: 'integer' }, undefined);
        markup.should.contain('p-inputnumber');
        markup.should.contain('value="0"');
    });
});

describe('when rendering an array schema', () => {
    it('should join the items with commas', () => {
        render({ type: 'array', items: { type: 'string' } }, ['a', 'b']).should.contain('value="a, b"');
    });

    it('should render nothing for a non-array value', () => {
        render({ type: 'array' }, 'x').should.contain('value=""');
    });
});

describe('when rendering an enum schema', () => {
    let markup: string;

    beforeEach(() => {
        markup = render({ type: 'string', enum: ['a', 'b'] }, 'a', 'p');
    });

    it('should link the input to a datalist', () => {
        markup.should.contain('list="enum-p"');
        markup.should.contain('<datalist id="enum-p">');
    });

    it('should offer each option', () => {
        markup.should.contain('<option value="a"></option><option value="b"></option>');
    });
});

describe('when rendering a read only string schema', () => {
    it('should render a read only input', () => {
        render({ type: 'string' }, 'x', 'p', true).should.contain('readonly');
    });
});
