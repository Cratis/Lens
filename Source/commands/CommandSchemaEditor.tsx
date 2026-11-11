import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { JsonSchema } from '../arc/introspection';

interface SchemaFieldEditorProps {
    schema?: JsonSchema;
    value: unknown;
    label: string;
    path: string;
    onChange: (path: string, value: unknown) => void;
    readOnly?: boolean;
}

function parseArrayValue(input: string, itemType?: string): unknown[] {
    const tokens = input
        .split(',')
        .map(_ => _.trim())
        .filter(_ => _.length > 0);

    if (itemType === 'number' || itemType === 'integer') {
        return tokens.map(_ => Number(_)).filter(_ => !Number.isNaN(_));
    }

    if (itemType === 'boolean') {
        return tokens
            .map(_ => _.toLowerCase())
            .filter(_ => _ === 'true' || _ === 'false')
            .map(_ => _ === 'true');
    }

    return tokens;
}

function formatArrayValue(value: unknown): string {
    if (!Array.isArray(value)) {
        return '';
    }
    return value.map(_ => String(_)).join(', ');
}

const listTypePrecedence: [string[], string][] = [
    [['object'], 'object'],
    [['array'], 'array'],
    [['boolean'], 'boolean'],
    [['number', 'integer'], 'number'],
    [['string'], 'string'],
];

function getSchemaType(schema?: JsonSchema): string {
    if (!schema) {
        return 'object';
    }
    if (Array.isArray(schema.type)) {
        const listed: string[] = schema.type;
        const match = listTypePrecedence.find(([accepted]) => accepted.some(_ => listed.includes(_)));
        if (match) {
            return match[1];
        }
    }
    if (typeof schema.type === 'string') {
        return schema.type;
    }
    if (schema.properties) {
        return 'object';
    }
    return 'string';
}

export function initialValueForSchema(schema?: JsonSchema): unknown {
    if (!schema) {
        return {};
    }
    if (schema.default !== undefined) {
        return schema.default;
    }

    const schemaType = getSchemaType(schema);
    if (schemaType === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
            result[key] = initialValueForSchema(childSchema);
        }
        return result;
    }

    if (schemaType === 'array') {
        return [];
    }

    if (schemaType === 'boolean') {
        return false;
    }

    if (schemaType === 'number' || schemaType === 'integer') {
        return 0;
    }

    return '';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function setValueAtPath(target: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
    const clone: Record<string, unknown> = Array.isArray(target)
        ? [...target] as unknown as Record<string, unknown>
        : { ...target };
    const parts = path.split('.').filter(Boolean);

    let cursor: Record<string, unknown> = clone;
    for (let index = 0; index < parts.length - 1; index++) {
        const part = parts[index];
        if (!isPlainObject(cursor[part])) {
            cursor[part] = {};
        }
        cursor = cursor[part] as Record<string, unknown>;
    }

    cursor[parts[parts.length - 1]] = value;
    return clone;
}

function renderObjectField({ schema, value, label, path, onChange, readOnly }: SchemaFieldEditorProps) {
    const objectValue = isPlainObject(value) ? value : {};

    return (
        <div className="schema-block">
            <div className="schema-title">{label}</div>
            {Object.entries(schema?.properties ?? {}).map(([propertyName, propertySchema]) => {
                const nextPath = path ? `${path}.${propertyName}` : propertyName;
                return (
                    <CommandSchemaEditor
                        key={nextPath}
                        schema={propertySchema}
                        label={propertyName}
                        value={objectValue[propertyName]}
                        path={nextPath}
                        onChange={onChange}
                        readOnly={readOnly}
                    />
                );
            })}
        </div>
    );
}

function renderBooleanField({ value, label, path, onChange, readOnly }: SchemaFieldEditorProps) {
    return (
        <div className="field-block inline-field">
            <label>{label}</label>
            <InputSwitch checked={Boolean(value)} disabled={readOnly} onChange={event => onChange(path, event.value)} />
        </div>
    );
}

function renderNumberField({ value, label, path, onChange, readOnly }: SchemaFieldEditorProps) {
    return (
        <div className="field-block">
            <label>{label}</label>
            <InputNumber
                value={typeof value === 'number' ? value : Number(value ?? 0)}
                disabled={readOnly}
                onValueChange={event => onChange(path, event.value ?? 0)}
                useGrouping={false}
            />
        </div>
    );
}

function renderArrayField({ schema, value, label, path, onChange, readOnly }: SchemaFieldEditorProps) {
    const itemType = schema?.items?.type;
    return (
        <div className="field-block">
            <label>{label} (comma separated)</label>
            <InputText
                value={formatArrayValue(value)}
                readOnly={readOnly}
                onChange={event => onChange(path, parseArrayValue(event.target.value, itemType))}
            />
        </div>
    );
}

function renderEnumField({ schema, value, label, path, onChange, readOnly }: SchemaFieldEditorProps) {
    return (
        <div className="field-block">
            <label>{label}</label>
            <InputText
                value={String(value ?? '')}
                readOnly={readOnly}
                list={`enum-${path}`}
                onChange={event => onChange(path, event.target.value)}
            />
            <datalist id={`enum-${path}`}>
                {(schema?.enum ?? []).map(option => (
                    <option key={String(option)} value={String(option)} />
                ))}
            </datalist>
        </div>
    );
}

function renderTextField({ value, label, path, onChange, readOnly }: SchemaFieldEditorProps) {
    return (
        <div className="field-block">
            <label>{label}</label>
            <InputText value={String(value ?? '')} readOnly={readOnly} onChange={event => onChange(path, event.target.value)} />
        </div>
    );
}

const fieldsByType = new Map<string, (props: SchemaFieldEditorProps) => JSX.Element>([
    ['object', renderObjectField],
    ['boolean', renderBooleanField],
    ['number', renderNumberField],
    ['integer', renderNumberField],
    ['array', renderArrayField],
]);

// These are plain render functions rather than components, so the element tree keeps the original
// structure: switching schema type must not remount the inputs.
function fieldFor(schema?: JsonSchema): (props: SchemaFieldEditorProps) => JSX.Element {
    const typed = fieldsByType.get(getSchemaType(schema));
    if (typed) {
        return typed;
    }
    return (schema?.enum?.length ?? 0) > 0 ? renderEnumField : renderTextField;
}

export function CommandSchemaEditor({ schema, value, label, path, onChange, readOnly = false }: SchemaFieldEditorProps) {
    return fieldFor(schema)({ schema, value, label, path, onChange, readOnly });
}
