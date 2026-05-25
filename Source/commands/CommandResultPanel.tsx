import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Message } from 'primereact/message';
import { columnsFromRows, CommandExecutionViewModel, formatCellValue, normalizeDataRows } from './commandExecution';

interface Props {
    result: CommandExecutionViewModel;
}

export function CommandResultPanel({ result }: Props) {
    const rows = normalizeDataRows(result.payload);
    const columns = columnsFromRows(rows);

    return (
        <div className="result-section">
            <Message
                severity={result.isSuccess ? 'success' : 'error'}
                text={result.isSuccess
                    ? `Command succeeded (HTTP ${result.statusCode}).`
                    : `Command failed (HTTP ${result.statusCode}).`}
            />

            {result.messages.length > 0 && (
                <ul className="inline-list">
                    {result.messages.map(message => <li key={message}>{message}</li>)}
                </ul>
            )}

            {result.validationErrors.length > 0 && (
                <DataTable value={result.validationErrors} size="small" stripedRows>
                    <Column field="path" header="Field" />
                    <Column field="severity" header="Severity" />
                    <Column field="message" header="Message" />
                </DataTable>
            )}

            {result.payload !== undefined && columns.length > 0 && (
                <DataTable value={rows} size="small" stripedRows>
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
