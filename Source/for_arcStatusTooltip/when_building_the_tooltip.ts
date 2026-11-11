import { describe, it } from 'vitest';
import { ArcContextSnapshot } from '../shared/arc-context';
import { buildArcStatusTooltip } from '../arcStatusTooltip';

const retry = 'Not an Arc application. Click to retry detection.';

function snapshot(overrides: Partial<ArcContextSnapshot> = {}): ArcContextSnapshot {
    return {
        isArcApplication: false, baseUrl: null, pageOrigin: 'https://app.test', configuration: null, detectionMethod: 'path-fallback',
        capturedAt: 0,
        diagnostics: {
            selectedTabId: 3, selectedTabUrl: 'https://app.test/', tabSelectionStrategy: 'active-last-focused',
            executeScriptStatus: 'success', errorMessage: null,
        },
        ...overrides,
    };
}

describe('when there is no snapshot or no diagnostics', () => {
    it('should only ask to retry without a snapshot', () => {
        buildArcStatusTooltip(null).should.equal(retry);
    });

    it('should only ask to retry without diagnostics', () => {
        buildArcStatusTooltip(snapshot({ diagnostics: undefined })).should.equal(retry);
    });
});

describe('when there are diagnostics', () => {
    it('should list the details', () => {
        buildArcStatusTooltip(snapshot()).should.equal([
            retry, '',
            'tabSelectionStrategy: active-last-focused', 'selectedTabId: 3', 'selectedTabUrl: https://app.test/',
            'executeScriptStatus: success', 'detectionMethod: path-fallback', 'pageOrigin: https://app.test',
        ].join('\n'));
    });

    it('should show missing values', () => {
        const tooltip = buildArcStatusTooltip(snapshot({
            detectionMethod: undefined, pageOrigin: null,
            diagnostics: { selectedTabId: null, selectedTabUrl: null, tabSelectionStrategy: 'none', executeScriptStatus: 'not-run', errorMessage: null },
        }));
        tooltip.should.contain('selectedTabId: null');
        tooltip.should.contain('selectedTabUrl: null');
        tooltip.should.contain('detectionMethod: n/a');
        tooltip.should.contain('pageOrigin: null');
    });

    it('should append an error message', () => {
        const base = snapshot();
        const tooltip = buildArcStatusTooltip({ ...base, diagnostics: { ...base.diagnostics!, errorMessage: 'denied' } });
        tooltip.should.match(/\nerrorMessage: denied$/);
    });
});
