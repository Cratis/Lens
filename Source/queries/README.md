# Queries View

## Structure
- `QueriesView.tsx`: orchestration and state for query discovery, selection, and execution.
- `QueryResultPanel.tsx`: formatted rendering of query results in a data table.
- `queryExecution.ts`: parsing and row/column normalization helpers for query responses.
- `queryRoute.ts`: path parameter extraction and URL composition helpers.

## Notes
- The view builds the namespace tree from introspection metadata.
- Query errors are displayed as structured messages instead of raw JSON output.
