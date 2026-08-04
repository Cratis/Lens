import { TransportDiagnostics } from '../shared/arc-context';
import { DiagnosticsRow, DiagnosticsSection, DiagnosticsValue } from './DiagnosticsSection';

export function TransportSection({ transport }: { transport: TransportDiagnostics }) {
    return (
        <DiagnosticsSection title="Transport">
            <div className="oqd-kv-list">
                <DiagnosticsRow label="Method">
                    <DiagnosticsValue>{transport.queryTransportMethod}</DiagnosticsValue>
                </DiagnosticsRow>
                <DiagnosticsRow label="Direct mode">
                    <DiagnosticsValue>{transport.queryDirectMode ? 'Yes' : 'No'}</DiagnosticsValue>
                </DiagnosticsRow>
            </div>
        </DiagnosticsSection>
    );
}
