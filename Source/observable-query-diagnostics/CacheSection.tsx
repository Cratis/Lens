import { CacheDiagnostics } from '../shared/arc-context';
import { DiagnosticsBadge, DiagnosticsRow, DiagnosticsSection, DiagnosticsValue } from './DiagnosticsSection';
import { formatBytes } from './formatBytes';

export function CacheSection({ cache }: { cache: CacheDiagnostics }) {
    return (
        <DiagnosticsSection title="Cache">
            <div className="oqd-kv-list">
                <DiagnosticsRow label="Status">
                    <DiagnosticsBadge isOk={cache.healthy}>
                        {cache.healthy ? 'Healthy' : 'Degraded'}
                    </DiagnosticsBadge>
                </DiagnosticsRow>
                <DiagnosticsRow label="Entries">
                    <DiagnosticsValue>{cache.entryCount}</DiagnosticsValue>
                </DiagnosticsRow>
                <DiagnosticsRow label="Estimated size">
                    <DiagnosticsValue>{formatBytes(cache.estimatedBytes)}</DiagnosticsValue>
                </DiagnosticsRow>
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
        </DiagnosticsSection>
    );
}
