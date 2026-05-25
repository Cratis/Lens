import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tree, TreeExpandedKeysType } from 'primereact/tree';
import { TreeNode } from 'primereact/treenode';
import { ARC_CONTEXT_UNAVAILABLE_MESSAGE } from '../arc/constants';
import { buildContextRequestHeaders } from '../shared/requestHeaders';
import { ExtensionSettings } from '../shared/types';
import {
    buildNamespaceTree,
    CommandMetadata,
    fetchCommands,
    MetadataTreeLeaf,
    tryResolveSchema,
} from '../arc/introspection';
import { findNodeByKey } from '../arc/tree';
import { CommandResultPanel } from './CommandResultPanel';
import { CommandSchemaEditor, initialValueForSchema, setValueAtPath } from './CommandSchemaEditor';
import { CommandExecutionViewModel, parseCommandExecution } from './commandExecution';

interface Props {
    arcBaseUrl: string;
    settings: ExtensionSettings | null;
    persistedExpandedKeys: Record<string, boolean>;
    persistedSelectedKey: string;
    onNavigationChanged: (expandedKeys: Record<string, boolean>, selectedKey: string) => void;
}

export function CommandsView({ arcBaseUrl, settings, persistedExpandedKeys, persistedSelectedKey, onNavigationChanged }: Props) {
    const [commands, setCommands] = useState<CommandMetadata[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedKeys, setExpandedKeys] = useState<TreeExpandedKeysType>(persistedExpandedKeys);
    const [selectedKey, setSelectedKey] = useState<string | null>(persistedSelectedKey || null);
    const [selectedCommand, setSelectedCommand] = useState<CommandMetadata | null>(null);
    const [filterText, setFilterText] = useState('');
    const [requestBody, setRequestBody] = useState<Record<string, unknown>>({});
    const [executing, setExecuting] = useState(false);
    const [result, setResult] = useState<CommandExecutionViewModel | null>(null);

    const treeNodes = useMemo<TreeNode[]>(() => buildNamespaceTree<CommandMetadata>(commands, 'pi pi-play-circle'), [commands]);
    const filteredTreeNodes = useMemo<TreeNode[]>(() => {
        const filter = filterText.trim().toLowerCase();
        if (!filter) {
            return treeNodes;
        }

        const visit = (nodes: TreeNode[]): TreeNode[] => nodes.reduce<TreeNode[]>((accumulator, node) => {
            const label = String(node.label ?? '').toLowerCase();
            const children = Array.isArray(node.children) ? visit(node.children) : [];
            if (label.includes(filter) || children.length > 0) {
                accumulator.push({ ...node, children });
            }
            return accumulator;
        }, []);

        return visit(treeNodes);
    }, [treeNodes, filterText]);

    const loadCommands = async () => {
        if (!arcBaseUrl) {
            setError(ARC_CONTEXT_UNAVAILABLE_MESSAGE);
            setCommands([]);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const fetched = await fetchCommands(arcBaseUrl);
            setCommands(fetched);
            setSelectedCommand(null);
            setResult(null);
        } catch (loadError) {
            setError(String(loadError));
            setCommands([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadCommands();
    }, [arcBaseUrl]);

    useEffect(() => {
        if (selectedKey && !selectedCommand && treeNodes.length > 0) {
            void selectNode(selectedKey);
        }
    }, [selectedKey, selectedCommand, treeNodes]);

    useEffect(() => {
        onNavigationChanged(expandedKeys as Record<string, boolean>, selectedKey ?? '');
    }, [expandedKeys, selectedKey]);

    const selectNode = async (selection: unknown) => {
        if (typeof selection !== 'string') {
            return;
        }

        setSelectedKey(selection);
        const selectedNode = findNodeByKey(treeNodes, selection);
        const leaf = selectedNode?.data as MetadataTreeLeaf<CommandMetadata> | undefined;
        if (!leaf || leaf.kind !== 'leaf') {
            return;
        }

        let resolvedCommand = leaf.metadata;
        if (!resolvedCommand.schema) {
            const resolvedSchema = await tryResolveSchema(arcBaseUrl, resolvedCommand.type);
            if (resolvedSchema) {
                resolvedCommand = { ...resolvedCommand, schema: resolvedSchema };
                setCommands(previous => previous.map(_ => _.type === resolvedCommand.type ? resolvedCommand : _));
            }
        }

        setSelectedCommand(resolvedCommand);
        const initialBody = initialValueForSchema(resolvedCommand.schema);
        setRequestBody((initialBody && typeof initialBody === 'object' && !Array.isArray(initialBody))
            ? initialBody as Record<string, unknown>
            : {});
        setResult(null);
    };

    const execute = async () => {
        if (!selectedCommand) {
            return;
        }

        const endpoint = `${arcBaseUrl.replace(/\/$/, '')}${selectedCommand.route}`;
        const body = requestBody;

        setExecuting(true);
        setResult(null);
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...buildContextRequestHeaders(settings),
                },
                body: JSON.stringify(body),
            });

            const contentType = response.headers.get('content-type') ?? '';
            const rawResult = contentType.includes('application/json')
                ? await response.json()
                : await response.text();

            setResult(parseCommandExecution(rawResult, response.status));
        } catch (executionError) {
            setResult({
                statusCode: 0,
                isSuccess: false,
                messages: [String(executionError)],
                validationErrors: [],
            });
        } finally {
            setExecuting(false);
        }
    };

    return (
        <div className="stack-gap page-layout commands-view">
            {error && <Message severity="error" text={error} />}

            <section className="split-layout fill-widget">
                <div className="tree-panel">
                    <div className="tree-toolbar">
                        <Button
                            className="tree-refresh-button"
                            icon="pi pi-refresh"
                            rounded
                            text
                            aria-label="Refresh commands"
                            onClick={loadCommands}
                            disabled={loading}
                        />
                        <InputText
                            className="tree-search"
                            placeholder="Find command"
                            value={filterText}
                            onChange={event => setFilterText(event.target.value)}
                        />
                    </div>
                    <Tree
                        value={filteredTreeNodes}
                        expandedKeys={expandedKeys}
                        onToggle={event => setExpandedKeys(event.value)}
                        selectionMode="single"
                        selectionKeys={selectedKey as unknown as string}
                        onSelectionChange={event => void selectNode(event.value)}
                    />
                </div>

                <div className="detail-panel">
                    {!selectedCommand && (
                        <div className="empty-state compact">
                            <p>Select a command from the tree to see details and execution form.</p>
                        </div>
                    )}

                    {selectedCommand && (
                        <div className="stack-gap">
                            <div>
                                <h3>{selectedCommand.name}</h3>
                                <p className="feature-note">{selectedCommand.documentationSummary || 'No command description available.'}</p>
                                <div className="route-text">POST {selectedCommand.route}</div>
                            </div>

                            {selectedCommand.schema && (
                                <div className="schema-editor">
                                    <CommandSchemaEditor
                                        schema={selectedCommand.schema}
                                        value={requestBody}
                                        label="Payload"
                                        path=""
                                        onChange={(path, value) => setRequestBody(previous => setValueAtPath(previous, path, value))}
                                    />
                                </div>
                            )}

                            {!selectedCommand.schema && (
                                <div className="empty-state compact">
                                    <p>No payload schema available. Lens will execute this command with an empty payload object.</p>
                                </div>
                            )}

                            <div className="action-row">
                                <Button label={executing ? 'Executing...' : 'Execute'} icon="pi pi-play" onClick={execute} disabled={executing} />
                            </div>

                            {result && (
                                <CommandResultPanel result={result} />
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
