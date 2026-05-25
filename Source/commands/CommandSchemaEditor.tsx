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

function getSchemaType(schema?: JsonSchema): string {
    if (!schema) {
        return 'object';
    }
    if (schema.type) {
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

export function setValueAtPath(target: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
    const clone: Record<string, unknown> = Array.isArray(target)
        ? [...target] as unknown as Record<string, unknown>
        : { ...target };
    const parts = path.split('.').filter(Boolean);

    let cursor: Record<string, unknown> = clone;
    for (let index = 0; index < parts.length - 1; index++) {
        const part = parts[index];
        const next = cursor[part];
        if (!next || typeof next !== 'object' || Array.isArray(next)) {
            cursor[part] = {};
        }
        cursor = cursor[part] as Record<string, unknown>;
    }

    cursor[parts[parts.length - 1]] = value;
    return clone;
}

export function CommandSchemaEditor({ schema, value, label, path, onChange }: SchemaFieldEditorProps) {
    const schemaType = getSchemaType(schema);

    if (schemaType === 'object') {
        const objectValue = (value && typeof value === 'object' && !Array.isArray(value))
            ? value as Record<string, unknown>
            : {};

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
                        />
                    );
                })}
            </div>
        );
    }

    if (schemaType === 'boolean') {
        return (
            <div className="field-block inline-field">
                <label>{label}</label>
                <InputSwitch checked={Boolean(value)} onChange={event => onChange(path, event.value)} />
            </div>
        );
    }

    if (schemaType === 'number' || schemaType === 'integer') {
        return (
            <div className="field-block">
                <label>{label}</label>
                <InputNumber
                    value={typeof value === 'number' ? value : Number(value ?? 0)}
                    onValueChange={event => onChange(path, event.value ?? 0)}
                    useGrouping={false}
                />
            </div>
        );
    }

    if (schemaType === 'array') {
        const itemType = schema?.items?.type;
        return (
            <div className="field-block">
                <label>{label} (comma separated)</label>
                <InputText
                    value={formatArrayValue(value)}
                    onChange={event => onChange(path, parseArrayValue(event.target.value, itemType))}
                />
            </div>
        );
    }

    if ((schema?.enum?.length ?? 0) > 0) {
        return (
            <div className="field-block">
                <label>{label}</label>
                <InputText
                    value={String(value ?? '')}
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

    return (
        <div className="field-block">
            <label>{label}</label>
            <InputText value={String(value ?? '')} onChange={event => onChange(path, event.target.value)} />
        </div>
    );
}
