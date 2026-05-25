import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Message } from 'primereact/message';
import { extractColumns, formatCellValue, normalizeRows, QueryExecutionViewModel } from './queryExecution';

interface Props {
    result: QueryExecutionViewModel;
}

export function QueryResultPanel({ result }: Props) {
    const rows = normalizeRows(result.data);
    const columns = extractColumns(rows);

    return (
        <div className="result-section">
            <Message
                severity={result.isSuccess ? 'success' : 'error'}
                text={result.isSuccess
                    ? `Query succeeded (HTTP ${result.statusCode}).`
                    : `Query failed (HTTP ${result.statusCode}).`}
            />

            {result.messages.length > 0 && (
                <ul className="inline-list">
                    {result.messages.map(message => <li key={message}>{message}</li>)}
                </ul>
            )}

            {!result.isSuccess && rows.length === 0 && (
                <Message severity="warn" text="No data returned due to query failure." />
            )}

            {rows.length > 0 && columns.length > 0 && (
                <DataTable value={rows} paginator rows={10} stripedRows scrollable scrollHeight="20rem">
                    {columns.map(column => (
                        <Column
                            key={column}
                            field={column}
                            header={column}
                            body={row => formatCellValue(row[column])}
                        />
                    ))}
                </DataTable>
            )}
        </div>
    );
}
