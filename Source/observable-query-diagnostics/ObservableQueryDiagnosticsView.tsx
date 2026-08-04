import { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { captureObservableQueryDiagnosticsForActiveTab, ObservableQueryDiagnosticsSnapshot } from '../shared/arc-context';

const POLL_INTERVAL_MS = 2000;

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
    hasArcContext: boolean;
}

export function ObservableQueryDiagnosticsView({ hasArcContext }: Props) {
    const [snapshot, setSnapshot] = useState<ObservableQueryDiagnosticsSnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchSnapshot = async () => {
        if (!hasArcContext) {
            setLoading(false);
            return;
        }

        try {
            const result = await captureObservableQueryDiagnosticsForActiveTab();
            setSnapshot(result);
            setLastUpdated(new Date());
        } catch {
            setSnapshot(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!hasArcContext) {
            setLoading(false);
            return;
        }

        void fetchSnapshot();

        intervalRef.current = setInterval(() => {
            void fetchSnapshot();
        }, POLL_INTERVAL_MS);

        return () => {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [hasArcContext]);

    if (loading) {
        return <div className="loading"><span className="pi pi-spin pi-spinner" /> Loading diagnostics…</div>;
    }

    if (!hasArcContext) {
        return (
            <div className="empty-state">
                <p>Observable query diagnostics are only available when the active tab is an Arc application.</p>
            </div>
        );
    }

    if (!snapshot) {
        return (
            <div className="stack-gap page-layout">
                <div className="empty-state">
                    <p>No diagnostics data available. The Arc application may not have any active observable queries.</p>
                </div>
                <div className="toolbar-row">
                    <Button
                        icon="pi pi-refresh"
                        text
                        rounded
                        aria-label="Refresh"
                        tooltip="Refresh diagnostics"
                        tooltipOptions={{ position: 'left' }}
                        onClick={() => void fetchSnapshot()}
                    />
                </div>
            </div>
        );
    }

    const { health, transport, multiplexer, cache, ownership } = snapshot;
    const healthOk = health.allQueriesConnected;
    const cacheOk = cache.healthy;
    const allOk = healthOk && cacheOk && multiplexer.isConnected;

    return (
        <div className="oqd-layout">
            <div className="oqd-toolbar">
                <span className={`oqd-health-badge ${allOk ? 'is-healthy' : 'is-unhealthy'}`}>
                    <span className={`pi ${allOk ? 'pi-check-circle' : 'pi-exclamation-triangle'}`} />
                    {allOk ? 'Healthy' : 'Degraded'}
                </span>
                {lastUpdated && (
                    <span className="oqd-timestamp">
                        Updated {lastUpdated.toLocaleTimeString()}
                    </span>
                )}
                <Button
                    className="oqd-refresh-button"
                    icon="pi pi-refresh"
                    text
                    rounded
                    aria-label="Refresh"
                    tooltip="Refresh diagnostics now"
                    tooltipOptions={{ position: 'left' }}
                    onClick={() => void fetchSnapshot()}
                />
            </div>

            <div className="oqd-scroll-area">
                <div className="oqd-section-grid">

                    {/* Health */}
                    <section className="feature-card oqd-section">
                        <h3 className="oqd-section-title">Health</h3>
                        <div className="oqd-kv-list">
                            <div className="oqd-kv-row">
                                <span className="oqd-kv-label">All queries connected</span>
                                <span className={`oqd-badge ${health.allQueriesConnected ? 'is-ok' : 'is-warn'}`}>
                                    {health.allQueriesConnected ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div className="oqd-kv-row">
                                <span className="oqd-kv-label">Disconnected queries</span>
                                <span className={`oqd-badge ${health.disconnectedQueryCount === 0 ? 'is-ok' : 'is-warn'}`}>
                                    {health.disconnectedQueryCount}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Transport */}
                    <section className="feature-card oqd-section">
                        <h3 className="oqd-section-title">Transport</h3>
                        <div className="oqd-kv-list">
                            <div className="oqd-kv-row">
                                <span className="oqd-kv-label">Method</span>
                                <span className="oqd-value">{transport.queryTransportMethod}</span>
                            </div>
                            <div className="oqd-kv-row">
                                <span className="oqd-kv-label">Direct mode</span>
                                <span className="oqd-value">{transport.queryDirectMode ? 'Yes' : 'No'}</span>
                            </div>
                        </div>
                    </section>

                    {/* Multiplexer */}
                    <section className="feature-card oqd-section">
                        <h3 className="oqd-section-title">Multiplexer</h3>
                        <div className="oqd-kv-list">
                            <div className="oqd-kv-row">
                                <span className="oqd-kv-label">Connected</span>
                                <span className={`oqd-badge ${multiplexer.isConnected ? 'is-ok' : 'is-warn'}`}>
                                    {multiplexer.isConnected ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div className="oqd-kv-row">
                                <span className="oqd-kv-label">Connections (configured / active)</span>
                                <span className="oqd-value">
                                    {multiplexer.configuredConnectionCount} / {multiplexer.activeConnectionCount}
                                </span>
                            </div>
                            {multiplexer.connections.length > 0 && (
                                <div className="oqd-sub-list">
                                    {multiplexer.connections.map(conn => (
                                        <div key={conn.index} className="oqd-sub-row">
                                            <span className={`pi ${conn.isConnected ? 'pi-circle-fill oqd-dot-ok' : 'pi-circle-fill oqd-dot-warn'}`} />
                                            <span>#{conn.index}</span>
                                            <span className="oqd-sub-label">{conn.queryCount} {conn.queryCount === 1 ? 'query' : 'queries'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Cache */}
                    <section className="feature-card oqd-section">
                        <h3 className="oqd-section-title">Cache</h3>
                        <div className="oqd-kv-list">
                            <div className="oqd-kv-row">
                                <span className="oqd-kv-label">Status</span>
                                <span className={`oqd-badge ${cache.healthy ? 'is-ok' : 'is-warn'}`}>
                                    {cache.healthy ? 'Healthy' : 'Degraded'}
                                </span>
                            </div>
                            <div className="oqd-kv-row">
                                <span className="oqd-kv-label">Entries</span>
                                <span className="oqd-value">{cache.entryCount}</span>
                            </div>
                            <div className="oqd-kv-row">
                                <span className="oqd-kv-label">Estimated size</span>
                                <span className="oqd-value">{formatBytes(cache.estimatedBytes)}</span>
                            </div>
                        </div>

                        {cache.entries.length > 0 && (
                            <div className="oqd-entry-list">
                                {cache.entries.map(entry => (
                                    <div key={entry.key} className="oqd-entry-card">
                                        <div className="oqd-entry-name">{entry.queryName}</div>
                                        <div className="oqd-entry-meta">
                                            <span className={`oqd-badge-sm ${entry.subscribed ? 'is-ok' : 'is-neutral'}`}>
                                                {entry.subscribed ? 'subscribed' : 'idle'}
                                            </span>
                                            <span className={`oqd-badge-sm ${entry.hasResult ? 'is-ok' : 'is-neutral'}`}>
                                                {entry.hasResult ? 'has result' : 'no result'}
                                            </span>
                                            <span className="oqd-entry-stat">{entry.subscriberCount} subscribers</span>
                                            <span className="oqd-entry-stat">{entry.listenerCount} listeners</span>
                                            <span className="oqd-entry-stat">{formatBytes(entry.estimatedBytes)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Ownership */}
                    {Object.keys(ownership.queriesByOwner).length > 0 && (
                        <section className="feature-card oqd-section oqd-section-wide">
                            <h3 className="oqd-section-title">Ownership</h3>
                            <div className="oqd-owner-list">
                                {Object.entries(ownership.queriesByOwner).map(([owner, queries]) => (
                                    <div key={owner} className="oqd-owner-row">
                                        <span className="oqd-owner-name">{owner}</span>
                                        <div className="oqd-owner-queries">
                                            {queries.map(q => (
                                                <span key={q} className="oqd-query-chip">{q}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
