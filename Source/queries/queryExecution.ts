import { QueryResult } from '@cratis/arc/queries';

export interface QueryExecutionViewModel {
    statusCode: number;
    isSuccess: boolean;
    messages: string[];
    data?: unknown;
}

export function parseQueryResult(raw: unknown, statusCode: number): QueryExecutionViewModel {
    const maybe = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw as Record<string, unknown> : {};
    const messages = [
        ...(Array.isArray(maybe.exceptionMessages) ? maybe.exceptionMessages : []),
        ...(Array.isArray(maybe.errors) ? maybe.errors : []),
    ].filter(_ => typeof _ === 'string') as string[];

    const data = (() => {
        if (Array.isArray(raw)) {
            return raw;
        }

        if (raw !== null && typeof raw !== 'object') {
            return raw;
        }

        const direct = maybe.data ?? maybe.result ?? maybe.items ?? maybe.results ?? maybe.value ?? maybe.payload ?? maybe.content;
        if (direct !== undefined) {
            return direct;
        }

        // If the response object itself looks like a row, use it directly.
        if (Object.keys(maybe).length > 0) {
            return raw;
        }

        return undefined;
    })();

    const typedResult = maybe as Partial<QueryResult<unknown>>;
    const isSuccess = typeof typedResult.isSuccess === 'boolean'
        ? typedResult.isSuccess
        : statusCode >= 200 && statusCode < 300;

    return {
        statusCode,
        isSuccess,
        messages,
        data,
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
