import { HealthDiagnostics } from '../shared/arc-context';
import { DiagnosticsBadge, DiagnosticsRow, DiagnosticsSection } from './DiagnosticsSection';

export function HealthSection({ health }: { health: HealthDiagnostics }) {
    return (
        <DiagnosticsSection title="Health">
            <div className="oqd-kv-list">
                <DiagnosticsRow label="All queries connected">
                    <DiagnosticsBadge isOk={health.allQueriesConnected}>
                        {health.allQueriesConnected ? 'Yes' : 'No'}
                    </DiagnosticsBadge>
                </DiagnosticsRow>
                <DiagnosticsRow label="Disconnected queries">
                    <DiagnosticsBadge isOk={health.disconnectedQueryCount === 0}>
                        {health.disconnectedQueryCount}
                    </DiagnosticsBadge>
                </DiagnosticsRow>
            </div>
        </DiagnosticsSection>
    );
}
