import { ReactNode } from 'react';

interface DiagnosticsSectionProps {
    title: string;
    wide?: boolean;
    children: ReactNode;
}

export function DiagnosticsSection({ title, wide, children }: DiagnosticsSectionProps) {
    return (
        <section className={`feature-card oqd-section ${wide ? 'oqd-section-wide' : ''}`}>
            <h3 className="oqd-section-title">{title}</h3>
            {children}
        </section>
    );
}

interface DiagnosticsRowProps {
    label: string;
    children: ReactNode;
}

export function DiagnosticsRow({ label, children }: DiagnosticsRowProps) {
    return (
        <div className="oqd-kv-row">
            <span className="oqd-kv-label">{label}</span>
            {children}
        </div>
    );
}

interface DiagnosticsBadgeProps {
    isOk: boolean;
    children: ReactNode;
}

export function DiagnosticsBadge({ isOk, children }: DiagnosticsBadgeProps) {
    return <span className={`oqd-badge ${isOk ? 'is-ok' : 'is-warn'}`}>{children}</span>;
}

export function DiagnosticsValue({ children }: { children: ReactNode }) {
    return <span className="oqd-value">{children}</span>;
}
