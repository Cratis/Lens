import { OwnershipDiagnostics } from './diagnosticsCapture';
import { DiagnosticsSection } from './DiagnosticsSection';

export function OwnershipSection({ ownership }: { ownership: OwnershipDiagnostics }) {
    const owners = Object.entries(ownership.queriesByOwner);
    if (owners.length === 0) {
        return null;
    }

    return (
        <DiagnosticsSection title="Ownership" wide>
            <div className="oqd-owner-list">
                {owners.map(([owner, queryNames]) => (
                    <div key={owner} className="oqd-owner-row">
                        <span className="oqd-owner-name">{owner}</span>
                        <div className="oqd-owner-queries">
                            {queryNames.map(queryName => (
                                <span key={queryName} className="oqd-query-chip">{queryName}</span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </DiagnosticsSection>
    );
}
