import { useState } from 'react';
import { ExtensionSettings } from '../../shared/types';
import { ArcContextSnapshot } from '../../shared/arc-context';

interface Props {
    settings: ExtensionSettings;
    onChange: (settings: ExtensionSettings) => void;
    arcContext: ArcContextSnapshot | null;
}

export function ArcSettings({ settings, onChange, arcContext }: Props) {
    const [arcBaseUrl, setArcBaseUrl] = useState(settings.arcBaseUrl);
    const [tenantHeaderName, setTenantHeaderName] = useState(settings.tenantHeaderName);

    const handleSave = () => {
        onChange({ ...settings, arcBaseUrl, tenantHeaderName });
    };

    return (
        <div>
            <div className="section-header">
                <h2>Arc Settings</h2>
            </div>

            <div className="card">
                <div className="card-title">Connection</div>
                {arcContext?.isArcApplication && arcContext.baseUrl ? (
                    <>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            Commands and Queries use Arc context detected from the current page.
                        </p>
                        <div style={{ fontSize: 12, marginTop: 8, fontFamily: 'Courier New, monospace', color: 'var(--accent)' }}>
                            {arcContext.baseUrl}
                        </div>
                    </>
                ) : (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Arc context is unavailable for the current page. Commands and Queries are hidden until Lens is opened on an Arc application page.
                    </p>
                )}

                <div className="form-row" style={{ marginTop: 16 }}>
                    <label>Arc Base URL (Header Injection Scope)</label>
                    <input
                        type="url"
                        value={arcBaseUrl}
                        onChange={e => setArcBaseUrl(e.target.value)}
                        placeholder="http://localhost:5000"
                    />
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                        Optional scope used for request header injection rules.
                    </p>
                </div>
            </div>

            <div className="card">
                <div className="card-title">HTTP Headers</div>

                <div className="form-row">
                    <label>Tenant Header Name</label>
                    <input
                        type="text"
                        value={tenantHeaderName}
                        onChange={e => setTenantHeaderName(e.target.value)}
                        placeholder="x-cratis-tenant-id"
                    />
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                        The HTTP header used to send the active tenant ID. Default: <code>x-cratis-tenant-id</code>
                    </p>
                </div>

                <div className="card" style={{ background: 'var(--bg-panel)', marginTop: 16, marginBottom: 0 }}>
                    <div className="card-title" style={{ fontSize: 14 }}>Injected User Headers</div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        When a user is active, the following headers are automatically injected into all HTTP requests:
                    </p>
                    <ul style={{ fontSize: 12, marginTop: 8, paddingLeft: 20, lineHeight: 1.8, color: 'var(--text-muted)', fontFamily: 'Courier New, monospace' }}>
                        <li>X-MS-CLIENT-PRINCIPAL-ID</li>
                        <li>X-MS-CLIENT-PRINCIPAL-NAME</li>
                        <li>X-MS-CLIENT-PRINCIPAL (base64-encoded JSON with claims)</li>
                    </ul>
                </div>
            </div>

            <div className="btn-row">
                <button className="btn btn-primary" onClick={handleSave}>Save Settings</button>
            </div>
        </div>
    );
}
