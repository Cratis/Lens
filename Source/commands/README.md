# Commands View

## Structure
- `CommandsView.tsx`: orchestration and state for command discovery, selection, and execution.
- `CommandSchemaEditor.tsx`: schema-driven request payload editor.
- `CommandResultPanel.tsx`: formatted rendering of command results and validation errors.
- `commandExecution.ts`: parsing and formatting helpers for command execution responses.

## Notes
- The view builds the namespace tree from introspection metadata and resolves schema per selected command when available.
- When schema is unavailable, the payload editor falls back to JSON input.
