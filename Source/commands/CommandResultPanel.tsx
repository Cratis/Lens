import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { columnsFromRows, CommandExecutionViewModel, formatCellValue, normalizeDataRows } from './commandExecution';

interface Props {
    result: CommandExecutionViewModel;
}

export function CommandResultPanel({ result }: Props) {
    const rows = normalizeDataRows(result.payload);
    const columns = columnsFromRows(rows);
    const messageRows = result.messages.map(message => ({ message }));
    const shouldShowValidation = result.validationErrors.length > 0;
    const shouldShowPayload = !shouldShowValidation && result.payload !== undefined && columns.length > 0;
    const shouldShowMessages = !shouldShowValidation && !shouldShowPayload && messageRows.length > 0;

    return (
        <div className="result-section">
            {shouldShowValidation && (
                <DataTable value={result.validationErrors} size="small" stripedRows>
                    <Column field="path" header="Field" />
                    <Column field="severity" header="Severity" />
                    <Column field="message" header="Message" />
                </DataTable>
            )}

            {shouldShowPayload && (
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

            {shouldShowMessages && (
                <DataTable value={messageRows} size="small" stripedRows>
                    <Column field="message" header="Message" />
                </DataTable>
            )}
        </div>
    );
}
