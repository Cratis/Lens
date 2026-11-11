import { QueryResult } from '@cratis/arc/queries';

export interface QueryExecutionViewModel {
    statusCode: number;
    isSuccess: boolean;
    messages: string[];
    data?: unknown;
}

const wrapperProperties = ['data', 'result', 'items', 'results', 'value', 'payload', 'content'];
const textProperties = ['message', 'title', 'detail'];

function asRecord(raw: unknown): Record<string, unknown> {
    return (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw as Record<string, unknown> : {};
}

function nonBlank(value: unknown): string[] {
    return typeof value === 'string' && value.trim().length > 0 ? [value.trim()] : [];
}

function collectMessages(raw: unknown, maybe: Record<string, unknown>): string[] {
    const listed = [
        ...(Array.isArray(maybe.exceptionMessages) ? maybe.exceptionMessages : []),
        ...(Array.isArray(maybe.errors) ? maybe.errors : []),
    ].filter(_ => typeof _ === 'string') as string[];

    const messages = [
        ...listed,
        ...nonBlank(raw),
        ...textProperties.flatMap(property => nonBlank(maybe[property])),
    ];

    return [...new Set(messages)];
}

function extractData(raw: unknown, maybe: Record<string, unknown>): unknown {
    if (Array.isArray(raw)) {
        return raw;
    }

    if (raw !== null && typeof raw !== 'object') {
        return raw;
    }

    const direct = wrapperProperties.reduce<unknown>((found, property) => found ?? maybe[property], undefined);
    if (direct !== undefined) {
        return direct;
    }

    // If the response object itself looks like a row, use it directly.
    return Object.keys(maybe).length > 0 ? raw : undefined;
}

function resolveSuccess(maybe: Record<string, unknown>, statusCode: number): boolean {
    const typedResult = maybe as Partial<QueryResult<unknown>>;
    return typeof typedResult.isSuccess === 'boolean'
        ? typedResult.isSuccess
        : statusCode >= 200 && statusCode < 300;
}

export function parseQueryResult(raw: unknown, statusCode: number): QueryExecutionViewModel {
    const maybe = asRecord(raw);

    return {
        statusCode,
        isSuccess: resolveSuccess(maybe, statusCode),
        messages: collectMessages(raw, maybe),
        data: extractData(raw, maybe),
    };
}

export function normalizeRows(data: unknown): Record<string, unknown>[] {
    if (Array.isArray(data)) {
        return data.map((item, index) => {
            if (item && typeof item === 'object') {
                return item as Record<string, unknown>;
            }
            return { value: item, index };
        });
    }

    if (data && typeof data === 'object') {
        return [data as Record<string, unknown>];
    }

    return data === undefined ? [] : [{ value: data }];
}

export function extractColumns(rows: Record<string, unknown>[]): string[] {
    const keys = new Set<string>();
    for (const row of rows) {
        for (const key of Object.keys(row)) {
            keys.add(key);
        }
    }
    return [...keys];
}

export function formatCellValue(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}
