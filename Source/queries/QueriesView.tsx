import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tree, TreeExpandedKeysType } from 'primereact/tree';
import { TreeNode } from 'primereact/treenode';
import { ARC_CONTEXT_UNAVAILABLE_MESSAGE } from '../arc/constants';
import {
    buildNamespaceTree,
    fetchQueries,
    MetadataTreeLeaf,
    QueryMetadata,
    tryResolveSchema,
} from '../arc/introspection';
import { findNodeByKey } from '../arc/tree';
import { QueryResultPanel } from './QueryResultPanel';
import { parseQueryResult, QueryExecutionViewModel } from './queryExecution';
import { buildResolvedUrl, extractPathParams } from './queryRoute';
import { buildContextRequestHeaders } from '../shared/requestHeaders';
import { ExtensionSettings } from '../shared/types';

interface Props {
    arcBaseUrl: string;
    settings: ExtensionSettings | null;
    persistedExpandedKeys: Record<string, boolean>;
    persistedSelectedKey: string;
    onNavigationChanged: (expandedKeys: Record<string, boolean>, selectedKey: string) => void;
}

export function QueriesView({ arcBaseUrl, settings, persistedExpandedKeys, persistedSelectedKey, onNavigationChanged }: Props) {
    const [queries, setQueries] = useState<QueryMetadata[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedKeys, setExpandedKeys] = useState<TreeExpandedKeysType>(persistedExpandedKeys);
    const [selectedKey, setSelectedKey] = useState<string | null>(persistedSelectedKey || null);
    const [selectedQuery, setSelectedQuery] = useState<QueryMetadata | null>(null);
    const [filterText, setFilterText] = useState('');
    const [pathParams, setPathParams] = useState<Record<string, string>>({});
    const [performing, setPerforming] = useState(false);
    const [result, setResult] = useState<QueryExecutionViewModel | null>(null);

    const treeNodes = useMemo<TreeNode[]>(() => buildNamespaceTree<QueryMetadata>(queries, 'pi pi-search'), [queries]);
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

    const loadQueries = async () => {
        if (!arcBaseUrl) {
            setError(ARC_CONTEXT_UNAVAILABLE_MESSAGE);
            setQueries([]);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const fetched = await fetchQueries(arcBaseUrl);
            setQueries(fetched);
            setSelectedQuery(null);
            setResult(null);
        } catch (loadError) {
            setError(String(loadError));
            setQueries([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadQueries();
    }, [arcBaseUrl]);

    useEffect(() => {
        if (selectedKey && !selectedQuery && treeNodes.length > 0) {
            void selectNode(selectedKey);
        }
    }, [selectedKey, selectedQuery, treeNodes]);

    useEffect(() => {
        onNavigationChanged(expandedKeys as Record<string, boolean>, selectedKey ?? '');
    }, [expandedKeys, selectedKey]);

    const selectNode = async (selection: unknown) => {
        if (typeof selection !== 'string') {
            return;
        }

        setSelectedKey(selection);
        const selectedNode = findNodeByKey(treeNodes, selection);
        const leaf = selectedNode?.data as MetadataTreeLeaf<QueryMetadata> | undefined;
        if (!leaf || leaf.kind !== 'leaf') {
            return;
        }

        let resolvedQuery = leaf.metadata;
        if (!resolvedQuery.schema) {
            const schema = await tryResolveSchema(arcBaseUrl, resolvedQuery.type);
            if (schema) {
                resolvedQuery = { ...resolvedQuery, schema };
                setQueries(previous => previous.map(_ => _.type === resolvedQuery.type ? resolvedQuery : _));
            }
        }

        setSelectedQuery(resolvedQuery);
        const parameters: Record<string, string> = {};
        for (const name of extractPathParams(resolvedQuery.route)) {
            parameters[name] = '';
        }
        setPathParams(parameters);
        setResult(null);
    };

    const perform = async () => {
        if (!selectedQuery) {
            return;
        }

        const endpoint = buildResolvedUrl(arcBaseUrl, selectedQuery.route, pathParams);
        setPerforming(true);
        setResult(null);
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    ...buildContextRequestHeaders(settings),
                },
            });
            const contentType = response.headers.get('content-type') ?? '';
            const raw = contentType.includes('application/json')
                ? await response.json()
                : await response.text();

            setResult(parseQueryResult(raw, response.status));
        } catch (performError) {
            setResult({
                statusCode: 0,
                isSuccess: false,
                messages: [String(performError)],
            });
        } finally {
            setPerforming(false);
        }
    };

    return (
        <div className="stack-gap page-layout queries-view">
            {error && <Message severity="error" text={error} />}

            <section className="split-layout fill-widget">
                <div className="tree-panel">
                    <div className="tree-toolbar">
                        <Button
                            className="tree-refresh-button"
                            icon="pi pi-refresh"
                            rounded
                            text
                            aria-label="Refresh queries"
                            onClick={loadQueries}
                            disabled={loading}
                        />
                        <InputText
                            className="tree-search"
                            placeholder="Find query"
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
                    {!selectedQuery && (
                        <div className="empty-state compact">
                            <p>Select a query from the tree to see details and perform it.</p>
                        </div>
                    )}

                    {selectedQuery && (
                        <div className="stack-gap">
                            <div>
                                <h3>{selectedQuery.name}</h3>
                                <p className="feature-note">{selectedQuery.documentationSummary || 'No query description available.'}</p>
                                <div className="route-text">GET {buildResolvedUrl(arcBaseUrl, selectedQuery.route, pathParams)}</div>
                            </div>

                            {extractPathParams(selectedQuery.route).length > 0 && (
                                <div className="form-grid two-col">
                                    {extractPathParams(selectedQuery.route).map(parameter => (
                                        <div className="field-block" key={parameter}>
                                            <label htmlFor={`query-param-${parameter}`}>{parameter}</label>
                                            <InputText
                                                id={`query-param-${parameter}`}
                                                value={pathParams[parameter] ?? ''}
                                                onChange={event => setPathParams(previous => ({ ...previous, [parameter]: event.target.value }))}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="action-row">
                                <Button label={performing ? 'Performing...' : 'Perform'} icon="pi pi-search" onClick={perform} disabled={performing} />
                            </div>

                            {result && (
                                <QueryResultPanel result={result} />
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
