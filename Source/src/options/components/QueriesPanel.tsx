import { useState, useCallback } from 'react';
import { QueryIntrospectionMetadata } from '../../shared/types';

interface Props {
    arcBaseUrl: string;
}

interface InvocationResult {
    status: number;
    body: string;
    ok: boolean;
}

interface QueryState {
    expanded: boolean;
    params: Record<string, string>;
    result: InvocationResult | null;
    loading: boolean;
}

function extractPathParams(route: string): string[] {
    const matches = route.matchAll(/\{(\w+)\}/g);
    return [...matches].map(m => m[1]);
}

function buildUrl(baseUrl: string, route: string, params: Record<string, string>): string {
    let url = `${baseUrl.replace(/\/$/, '')}${route}`;
    for (const [key, value] of Object.entries(params)) {
        url = url.replace(`{${key}}`, encodeURIComponent(value));
    }
    return url;
}

export function QueriesPanel({ arcBaseUrl }: Props) {
    const [baseUrl, setBaseUrl] = useState(arcBaseUrl);
    const [queries, setQueries] = useState<QueryIntrospectionMetadata[] | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [fetching, setFetching] = useState(false);
    const [states, setStates] = useState<Record<string, QueryState>>({});

    const fetchQueries = useCallback(async () => {
        setFetching(true);
        setFetchError(null);
        try {
            const url = `${baseUrl.replace(/\/$/, '')}/.cratis/queries`;
            const res = await fetch(url);
            if (!res.ok) {
                setFetchError(`HTTP ${res.status}: ${res.statusText}`);
                return;
            }
            const data = await res.json() as QueryIntrospectionMetadata[];
            setQueries(data);
            const initial: Record<string, QueryState> = {};
            for (const q of data) {
                const paramNames = extractPathParams(q.route);
                const params: Record<string, string> = {};
                for (const p of paramNames) params[p] = '';
                initial[q.type] = { expanded: false, params, result: null, loading: false };
            }
            setStates(initial);
        } catch (err) {
            setFetchError(String(err));
        } finally {
            setFetching(false);
        }
    }, [baseUrl]);

    const toggleExpanded = (type: string) => {
        setStates(prev => ({
            ...prev,
            [type]: { ...prev[type], expanded: !prev[type].expanded },
        }));
    };

    const setParam = (type: string, param: string, value: string) => {
        setStates(prev => ({
            ...prev,
            [type]: { ...prev[type], params: { ...prev[type].params, [param]: value } },
        }));
    };

    const invoke = async (query: QueryIntrospectionMetadata) => {
        setStates(prev => ({ ...prev, [query.type]: { ...prev[query.type], loading: true, result: null } }));
        try {
            const state = states[query.type];
            const url = buildUrl(baseUrl, query.route, state.params);
            const res = await fetch(url, { method: 'GET' });
            let body = '';
            const contentType = res.headers.get('content-type') ?? '';
            if (contentType.includes('application/json')) {
                body = JSON.stringify(await res.json(), null, 2);
            } else {
                body = await res.text();
            }
            setStates(prev => ({
                ...prev,
                [query.type]: { ...prev[query.type], loading: false, result: { status: res.status, body, ok: res.ok } },
            }));
        } catch (err) {
            setStates(prev => ({
                ...prev,
                [query.type]: { ...prev[query.type], loading: false, result: { status: 0, body: String(err), ok: false } },
            }));
        }
    };

    return (
        <div>
            <div className="section-header">
                <h2>Queries</h2>
            </div>

            <div className="card">
                <div className="arc-url-row">
                    <input
                        type="url"
                        value={baseUrl}
                        onChange={e => setBaseUrl(e.target.value)}
                        placeholder="http://localhost:5000"
                    />
                    <button className="btn btn-primary" onClick={fetchQueries} disabled={fetching || !baseUrl}>
                        {fetching ? 'Loading…' : 'Fetch Queries'}
                    </button>
                </div>
                {fetchError && (
                    <p style={{ color: 'var(--accent-red)', fontSize: 13 }}>
                        Error: {fetchError}
                    </p>
                )}
            </div>

            {queries === null && !fetchError && (
                <div className="empty-state">
                    <p>Enter your Arc base URL and click &quot;Fetch Queries&quot; to discover available queries.</p>
                </div>
            )}

            {queries !== null && queries.length === 0 && (
                <div className="empty-state">
                    <p>No queries discovered from <code>{baseUrl}/.cratis/queries</code>.</p>
                </div>
            )}

            {queries !== null && queries.length > 0 && (
                <div className="endpoint-list">
                    {queries.map(query => {
                        const state = states[query.type] ?? { expanded: false, params: {}, result: null, loading: false };
                        const paramNames = extractPathParams(query.route);
                        const finalUrl = buildUrl(baseUrl, query.route, state.params);

                        return (
                            <div className="endpoint-card" key={query.type}>
                                <div className="endpoint-header" onClick={() => toggleExpanded(query.type)}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span className="tag tag-method-get">GET</span>
                                            <span className="endpoint-name">{query.name}</span>
                                        </div>
                                        <div className="endpoint-route">{query.route}</div>
                                        {query.documentationSummary && (
                                            <div className="endpoint-doc">{query.documentationSummary}</div>
                                        )}
                                        <div className="endpoint-namespace">{query.namespace}</div>
                                    </div>
                                    <span className="expand-toggle">{state.expanded ? '▲' : '▼'}</span>
                                </div>

                                {state.expanded && (
                                    <div className="endpoint-body">
                                        {paramNames.length > 0 && (
                                            <div className="form-row">
                                                <label>Path Parameters</label>
                                                {paramNames.map(param => (
                                                    <div key={param} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                                                        <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)', minWidth: 80 }}>{`{${param}}`}</span>
                                                        <input
                                                            type="text"
                                                            value={state.params[param] ?? ''}
                                                            onChange={e => setParam(query.type, param, e.target.value)}
                                                            placeholder={`Value for ${param}`}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontFamily: 'monospace' }}>
                                            GET {finalUrl}
                                        </div>
                                        <div className="btn-row">
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => invoke(query)}
                                                disabled={state.loading}
                                            >
                                                {state.loading ? 'Loading…' : '▶ Execute'}
                                            </button>
                                        </div>
                                        {state.result && (
                                            <div className={`response-box ${state.result.ok ? 'success' : 'error'}`}>
                                                <span className={`status-badge ${state.result.ok ? 'status-ok' : 'status-err'}`}>
                                                    {state.result.status || 'Error'}
                                                </span>
                                                {state.result.body || '(empty response)'}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
