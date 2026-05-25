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
    const [showResultDetails, setShowResultDetails] = useState(false);

    const treeNodes = useMemo<TreeNode[]>(() => buildNamespaceTree<QueryMetadata>(queries, 'pi pi-search'), [queries]);
    const rootNodeKeys = useMemo(
        () => treeNodes
            .map(_ => typeof _.key === 'string' ? _.key : '')
            .filter(_ => _.length > 0),
        [treeNodes],
    );
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
            setShowResultDetails(false);
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

    useEffect(() => {
        setExpandedKeys(previous => {
            const next = { ...(previous as Record<string, boolean>) };
            let changed = false;
            for (const key of rootNodeKeys) {
                if (next[key] !== true) {
                    next[key] = true;
                    changed = true;
                }
            }
            return changed ? next : previous;
        });
    }, [rootNodeKeys]);

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
        setShowResultDetails(false);
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

            const parsed = parseQueryResult(raw, response.status);
            setResult(parsed);
            setShowResultDetails(parsed.isSuccess);
        } catch (performError) {
            const failedResult = {
                statusCode: 0,
                isSuccess: false,
                messages: [String(performError)],
            };
            setResult(failedResult);
            setShowResultDetails(false);
        } finally {
            setPerforming(false);
        }
    };

    const statusState = performing
        ? 'running'
        : result === null
            ? 'idle'
            : result.isSuccess
                ? 'success'
                : 'failed';

    const renderNode = (node: TreeNode) => {
        const label = String(node.label ?? '');
        return <span className="tree-node-label" title={label}>{label}</span>;
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
                        onToggle={event => {
                            const next = { ...(event.value as Record<string, boolean>) };
                            for (const key of rootNodeKeys) {
                                next[key] = true;
                            }
                            setExpandedKeys(next);
                        }}
                        selectionMode="single"
                        selectionKeys={selectedKey as unknown as string}
                        onSelectionChange={event => void selectNode(event.value)}
                        nodeTemplate={renderNode}
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
                                <div className="detail-header-row">
                                    <h3>{selectedQuery.name}</h3>
                                    <div className="detail-header-actions">
                                        <Button
                                            className={`result-status-button is-${statusState}`}
                                            icon={statusState === 'running'
                                                ? 'pi pi-spin pi-spinner'
                                                : statusState === 'success'
                                                    ? 'pi pi-check-circle'
                                                    : statusState === 'failed'
                                                        ? 'pi pi-times-circle'
                                                        : 'pi pi-minus-circle'}
                                            rounded
                                            text
                                            aria-label={statusState === 'failed' ? 'Toggle error details' : 'Query status'}
                                            tooltip={statusState === 'running'
                                                ? 'Performing query'
                                                : statusState === 'success'
                                                    ? `Query succeeded (HTTP ${result?.statusCode ?? 0})`
                                                    : statusState === 'failed'
                                                        ? `Query failed (HTTP ${result?.statusCode ?? 0}). Click to ${showResultDetails ? 'hide' : 'show'} details.`
                                                        : 'No query execution yet'}
                                            tooltipOptions={{ position: 'left' }}
                                            onClick={() => {
                                                if (statusState === 'failed') {
                                                    setShowResultDetails(previous => !previous);
                                                }
                                            }}
                                            disabled={statusState === 'running'}
                                        />
                                        <Button
                                            className="detail-play-button"
                                            icon={performing ? 'pi pi-spin pi-spinner' : 'pi pi-play'}
                                            rounded
                                            text
                                            aria-label="Perform query"
                                            tooltip={performing ? 'Performing query' : 'Perform query'}
                                            tooltipOptions={{ position: 'left' }}
                                            onClick={perform}
                                            disabled={performing}
                                        />
                                    </div>
                                </div>
                                <p className="feature-note">{selectedQuery.documentationSummary || 'No query description available.'}</p>
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

                            {result && showResultDetails && (
                                <QueryResultPanel result={result} />
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
