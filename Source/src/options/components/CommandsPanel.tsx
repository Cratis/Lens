import { useState, useCallback } from 'react';
import { CommandIntrospectionMetadata } from '../../shared/types';

interface Props {
    arcBaseUrl: string;
}

interface InvocationResult {
    status: number;
    body: string;
    ok: boolean;
}

interface CommandState {
    expanded: boolean;
    body: string;
    result: InvocationResult | null;
    loading: boolean;
}

export function CommandsPanel({ arcBaseUrl }: Props) {
    const [baseUrl, setBaseUrl] = useState(arcBaseUrl);
    const [commands, setCommands] = useState<CommandIntrospectionMetadata[] | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [fetching, setFetching] = useState(false);
    const [states, setStates] = useState<Record<string, CommandState>>({});

    const fetchCommands = useCallback(async () => {
        setFetching(true);
        setFetchError(null);
        try {
            const url = `${baseUrl.replace(/\/$/, '')}/.cratis/commands`;
            const res = await fetch(url);
            if (!res.ok) {
                setFetchError(`HTTP ${res.status}: ${res.statusText}`);
                return;
            }
            const data = await res.json() as CommandIntrospectionMetadata[];
            setCommands(data);
            const initial: Record<string, CommandState> = {};
            for (const cmd of data) {
                initial[cmd.type] = { expanded: false, body: '{}', result: null, loading: false };
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

    const setBody = (type: string, body: string) => {
        setStates(prev => ({ ...prev, [type]: { ...prev[type], body } }));
    };

    const invoke = async (cmd: CommandIntrospectionMetadata) => {
        setStates(prev => ({ ...prev, [cmd.type]: { ...prev[cmd.type], loading: true, result: null } }));
        try {
            const url = `${baseUrl.replace(/\/$/, '')}${cmd.route}`;
            const state = states[cmd.type];
            let bodyData: BodyInit | null = null;
            try {
                const parsed = JSON.parse(state.body);
                bodyData = JSON.stringify(parsed);
            } catch {
                bodyData = state.body;
            }
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: bodyData,
            });
            let body = '';
            const contentType = res.headers.get('content-type') ?? '';
            if (contentType.includes('application/json')) {
                body = JSON.stringify(await res.json(), null, 2);
            } else {
                body = await res.text();
            }
            setStates(prev => ({
                ...prev,
                [cmd.type]: { ...prev[cmd.type], loading: false, result: { status: res.status, body, ok: res.ok } },
            }));
        } catch (err) {
            setStates(prev => ({
                ...prev,
                [cmd.type]: { ...prev[cmd.type], loading: false, result: { status: 0, body: String(err), ok: false } },
            }));
        }
    };

    return (
        <div>
            <div className="section-header">
                <h2>Commands</h2>
            </div>

            <div className="card">
                <div className="arc-url-row">
                    <input
                        type="url"
                        value={baseUrl}
                        onChange={e => setBaseUrl(e.target.value)}
                        placeholder="http://localhost:5000"
                    />
                    <button className="btn btn-primary" onClick={fetchCommands} disabled={fetching || !baseUrl}>
                        {fetching ? 'Loading…' : 'Fetch Commands'}
                    </button>
                </div>
                {fetchError && (
                    <p style={{ color: 'var(--accent-red)', fontSize: 13 }}>
                        Error: {fetchError}
                    </p>
                )}
            </div>

            {commands === null && !fetchError && (
                <div className="empty-state">
                    <p>Enter your Arc base URL and click &quot;Fetch Commands&quot; to discover available commands.</p>
                </div>
            )}

            {commands !== null && commands.length === 0 && (
                <div className="empty-state">
                    <p>No commands discovered from <code>{baseUrl}/.cratis/commands</code>.</p>
                </div>
            )}

            {commands !== null && commands.length > 0 && (
                <div className="endpoint-list">
                    {commands.map(cmd => {
                        const state = states[cmd.type] ?? { expanded: false, body: '{}', result: null, loading: false };
                        return (
                            <div className="endpoint-card" key={cmd.type}>
                                <div className="endpoint-header" onClick={() => toggleExpanded(cmd.type)}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span className="tag tag-method-post">POST</span>
                                            <span className="endpoint-name">{cmd.name}</span>
                                        </div>
                                        <div className="endpoint-route">{cmd.route}</div>
                                        {cmd.documentationSummary && (
                                            <div className="endpoint-doc">{cmd.documentationSummary}</div>
                                        )}
                                        <div className="endpoint-namespace">{cmd.namespace}</div>
                                    </div>
                                    <span className="expand-toggle">{state.expanded ? '▲' : '▼'}</span>
                                </div>

                                {state.expanded && (
                                    <div className="endpoint-body">
                                        <div className="form-row">
                                            <label>Request Body (JSON)</label>
                                            <textarea
                                                value={state.body}
                                                onChange={e => setBody(cmd.type, e.target.value)}
                                                rows={6}
                                                spellCheck={false}
                                            />
                                        </div>
                                        <div className="btn-row">
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => invoke(cmd)}
                                                disabled={state.loading}
                                            >
                                                {state.loading ? 'Invoking…' : '▶ Invoke'}
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
