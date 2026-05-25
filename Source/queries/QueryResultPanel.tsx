import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { extractColumns, formatCellValue, normalizeRows, QueryExecutionViewModel } from './queryExecution';

interface Props {
    result: QueryExecutionViewModel;
}

export function QueryResultPanel({ result }: Props) {
    const dataRows = normalizeRows(result.data);
    const dataColumns = extractColumns(dataRows);
    const messageRows = result.messages.map(message => ({ message }));
    const rows = dataRows.length > 0 ? dataRows : messageRows;
    const columns = dataRows.length > 0 ? dataColumns : extractColumns(rows);

    return (
        <div className="result-section">
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
