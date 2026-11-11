import { ArcContextSnapshot } from './shared/arc-context';

const NOT_ARC_MESSAGE = 'Not an Arc application. Click to retry detection.';

export function buildArcStatusTooltip(arcContext: ArcContextSnapshot | null): string {
    const details = arcContext?.diagnostics;
    if (!arcContext || !details) {
        return NOT_ARC_MESSAGE;
    }

    const lines = [
        NOT_ARC_MESSAGE,
        '',
        `tabSelectionStrategy: ${details.tabSelectionStrategy}`,
        `selectedTabId: ${details.selectedTabId ?? 'null'}`,
        `selectedTabUrl: ${details.selectedTabUrl ?? 'null'}`,
        `executeScriptStatus: ${details.executeScriptStatus}`,
        `detectionMethod: ${arcContext.detectionMethod ?? 'n/a'}`,
        `pageOrigin: ${arcContext.pageOrigin ?? 'null'}`,
    ];

    if (details.errorMessage) {
        lines.push(`errorMessage: ${details.errorMessage}`);
    }

    return lines.join('\n');
}
