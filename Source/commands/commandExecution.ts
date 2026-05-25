import { CommandResult } from '@cratis/arc/commands';

export interface CommandValidationError {
    path: string;
    severity: string;
    message: string;
}

export interface CommandExecutionViewModel {
    statusCode: number;
    isSuccess: boolean;
    messages: string[];
    validationErrors: CommandValidationError[];
    payload?: unknown;
}

export function parseCommandExecution(raw: unknown, statusCode: number): CommandExecutionViewModel {
    const maybe = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};

    const messages = [
        ...(Array.isArray(maybe.exceptionMessages) ? maybe.exceptionMessages : []),
        ...(Array.isArray(maybe.errors) ? maybe.errors : []),
    ].filter(_ => typeof _ === 'string') as string[];

    if (typeof raw === 'string' && raw.trim().length > 0) {
        messages.push(raw.trim());
    }

    if (typeof maybe.message === 'string' && maybe.message.trim().length > 0) {
        messages.push(maybe.message.trim());
    }

    if (typeof maybe.title === 'string' && maybe.title.trim().length > 0) {
        messages.push(maybe.title.trim());
    }

    if (typeof maybe.detail === 'string' && maybe.detail.trim().length > 0) {
        messages.push(maybe.detail.trim());
    }

    const distinctMessages = [...new Set(messages)];

    const validationRaw = (Array.isArray(maybe.validationResults) ? maybe.validationResults : []) as Record<string, unknown>[];
    const validationErrors = validationRaw.map(validation => ({
        path: String(validation.property ?? validation.path ?? validation.member ?? 'n/a'),
        severity: String(validation.severity ?? 'Error'),
        message: String(validation.message ?? validation.errorMessage ?? ''),
    }));

    const payload = maybe.response ?? maybe.result ?? maybe.data;
    const typedResult = maybe as Partial<CommandResult<unknown>>;
    const isSuccess = typeof typedResult.isSuccess === 'boolean'
        ? typedResult.isSuccess
        : statusCode >= 200 && statusCode < 300;

    return {
        statusCode,
        isSuccess,
        messages: distinctMessages,
        validationErrors,
        payload,
    };
}

export function normalizeDataRows(payload: unknown): Record<string, unknown>[] {
    if (Array.isArray(payload)) {
        return payload.map((item, index) => {
            if (item && typeof item === 'object') {
                return item as Record<string, unknown>;
            }
            return { value: item, index };
        });
    }

    if (payload && typeof payload === 'object') {
        return [payload as Record<string, unknown>];
    }

    return [{ value: payload }];
}

export function columnsFromRows(rows: Record<string, unknown>[]): string[] {
    const keys = new Set<string>();
    for (const row of rows) {
        for (const key of Object.keys(row)) {
            keys.add(key);
        }
    }
    return [...keys];
}

export function safeParseJson(jsonText: string): unknown {
    try {
        return JSON.parse(jsonText);
    } catch {
        return {};
    }
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
