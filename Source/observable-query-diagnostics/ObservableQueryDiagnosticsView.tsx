import { useCallback, useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { captureObservableQueryDiagnosticsForActiveTab, ObservableQueryDiagnosticsSnapshot } from './diagnosticsCapture';
import { CacheSection } from './CacheSection';
import { HealthSection } from './HealthSection';
import { MultiplexerSection } from './MultiplexerSection';
import { OwnershipSection } from './OwnershipSection';
import { TransportSection } from './TransportSection';

const POLL_INTERVAL_MS = 2000;

interface ObservableQueryDiagnosticsViewProps {
    hasArcContext: boolean;
}

export function ObservableQueryDiagnosticsView({ hasArcContext }: ObservableQueryDiagnosticsViewProps) {
    const [snapshot, setSnapshot] = useState<ObservableQueryDiagnosticsSnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const refresh = useCallback(async () => {
        if (!hasArcContext) {
            setLoading(false);
            return;
        }

        try {
            setSnapshot(await captureObservableQueryDiagnosticsForActiveTab());
            setLastUpdated(new Date());
        } catch {
            setSnapshot(null);
        } finally {
            setLoading(false);
        }
    }, [hasArcContext]);

    useEffect(() => {
        if (!hasArcContext) {
            setLoading(false);
            return;
        }

        void refresh();
        const pollHandle = setInterval(() => void refresh(), POLL_INTERVAL_MS);
        return () => clearInterval(pollHandle);
    }, [hasArcContext, refresh]);

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

    const refreshButton = (
        <Button
            className="oqd-refresh-button"
            icon="pi pi-refresh"
            text
            rounded
            aria-label="Refresh"
            tooltip="Refresh diagnostics now"
            tooltipOptions={{ position: 'left' }}
            onClick={() => void refresh()}
        />
    );

    if (!snapshot) {
        return (
            <div className="stack-gap page-layout">
                <div className="empty-state">
                    <p>No diagnostics data available. The Arc application may not have any active observable queries.</p>
                </div>
                <div className="toolbar-row">{refreshButton}</div>
            </div>
        );
    }

    const { health, transport, multiplexer, cache, ownership } = snapshot;
    const allOk = health.allQueriesConnected && cache.healthy && multiplexer.isConnected;

    return (
        <div className="oqd-layout">
            <div className="oqd-toolbar">
                <span className={`oqd-health-badge ${allOk ? 'is-healthy' : 'is-unhealthy'}`}>
                    <span className={`pi ${allOk ? 'pi-check-circle' : 'pi-exclamation-triangle'}`} />
                    {allOk ? 'Healthy' : 'Degraded'}
                </span>
                {lastUpdated && (
                    <span className="oqd-timestamp">Updated {lastUpdated.toLocaleTimeString()}</span>
                )}
                {refreshButton}
            </div>

            <div className="oqd-scroll-area">
                <div className="oqd-section-grid">
                    <HealthSection health={health} />
                    <TransportSection transport={transport} />
                    <MultiplexerSection multiplexer={multiplexer} />
                    <CacheSection cache={cache} />
                    <OwnershipSection ownership={ownership} />
                </div>
            </div>
        </div>
    );
}
