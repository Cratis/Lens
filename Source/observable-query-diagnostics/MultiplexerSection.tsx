import { MultiplexerDiagnostics } from './diagnosticsCapture';
import { DiagnosticsBadge, DiagnosticsRow, DiagnosticsSection, DiagnosticsValue } from './DiagnosticsSection';

export function MultiplexerSection({ multiplexer }: { multiplexer: MultiplexerDiagnostics }) {
    return (
        <DiagnosticsSection title="Multiplexer">
            <div className="oqd-kv-list">
                <DiagnosticsRow label="Connected">
                    <DiagnosticsBadge isOk={multiplexer.isConnected}>
                        {multiplexer.isConnected ? 'Yes' : 'No'}
                    </DiagnosticsBadge>
                </DiagnosticsRow>
                <DiagnosticsRow label="Connections (configured / active)">
                    <DiagnosticsValue>
                        {multiplexer.configuredConnectionCount} / {multiplexer.activeConnectionCount}
                    </DiagnosticsValue>
                </DiagnosticsRow>
                {multiplexer.connections.length > 0 && (
                    <div className="oqd-sub-list">
                        {multiplexer.connections.map(connection => (
                            <div key={connection.index} className="oqd-sub-row">
                                <span className={`pi pi-circle-fill ${connection.isConnected ? 'oqd-dot-ok' : 'oqd-dot-warn'}`} />
                                <span>#{connection.index}</span>
                                <span className="oqd-sub-label">
                                    {connection.queryCount} {connection.queryCount === 1 ? 'query' : 'queries'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DiagnosticsSection>
    );
}
