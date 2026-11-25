import { describe, it } from 'vitest';
import {
    audienceSwitch,
    countOverrides,
    effectivePathSwitch,
    NO_OVERRIDES,
    pathSwitch,
    withAudienceSwitch,
    withPathSwitch,
} from '../availability';

describe('when switching an audience on', () => {
    const result = withAudienceSwitch(NO_OVERRIDES, 'Plus', 'on');

    it('should enable it', () => result.enabledAudiences.should.deep.equal(['Plus']));
    it('should not disable it', () => result.disabledAudiences.should.deep.equal([]));
    it('should read back as on', () => audienceSwitch(result, 'Plus').should.equal('on'));
    it('should leave the paths alone', () => result.enabledPaths.concat(result.disabledPaths).should.deep.equal([]));
});

describe('when switching an audience that is on to off', () => {
    const result = withAudienceSwitch(withAudienceSwitch(NO_OVERRIDES, 'Plus', 'on'), 'Plus', 'off');

    it('should no longer enable it', () => result.enabledAudiences.should.deep.equal([]));
    it('should disable it', () => result.disabledAudiences.should.deep.equal(['Plus']));
});

describe('when switching an audience back to auto', () => {
    const result = withAudienceSwitch(withAudienceSwitch(NO_OVERRIDES, 'Plus', 'off'), 'Plus', 'auto');

    it('should override nothing', () => countOverrides(result).should.equal(0));
    it('should read back as auto', () => audienceSwitch(result, 'Plus').should.equal('auto'));
});

describe('when switching several paths', () => {
    const result = withPathSwitch(withPathSwitch(withPathSwitch(NO_OVERRIDES, 'Fleet/Quality', 'off'), 'Fleet/Billing', 'on'), 'Crew', 'off');

    it('should keep each list sorted', () => result.disabledPaths.should.deep.equal(['Crew', 'Fleet/Quality']));
    it('should read each path back', () => {
        pathSwitch(result, 'Fleet/Billing').should.equal('on');
        pathSwitch(result, 'Fleet/Quality').should.equal('off');
        pathSwitch(result, 'Fleet').should.equal('auto');
    });
    it('should count the overrides', () => countOverrides(result).should.equal(3));
});

describe('when asking what a path does with nothing switched', () => {
    it('should leave it to the application', () => effectivePathSwitch(NO_OVERRIDES, 'Fleet/Quality').should.deep.equal({ switch: 'auto' }));
});

describe('when an ancestor is switched off', () => {
    const overrides = withPathSwitch(NO_OVERRIDES, 'Fleet', 'off');

    it('should switch its descendants off', () => effectivePathSwitch(overrides, 'Fleet/Quality/Scores').should.deep.equal({ switch: 'off', inheritedFrom: 'Fleet' }));
    it('should report the path itself as off, not inherited', () => effectivePathSwitch(overrides, 'Fleet').should.deep.equal({ switch: 'off' }));
    it('should not reach a path that only shares a prefix', () => effectivePathSwitch(overrides, 'Fleets/Quality').should.deep.equal({ switch: 'auto' }));
});

describe('when an ancestor is switched off and a descendant is switched on', () => {
    const overrides = withPathSwitch(withPathSwitch(NO_OVERRIDES, 'Fleet', 'off'), 'Fleet/Quality', 'on');

    it('should keep the descendant off, because off wins', () => effectivePathSwitch(overrides, 'Fleet/Quality').should.deep.equal({ switch: 'off', inheritedFrom: 'Fleet' }));
});

describe('when an ancestor is switched on', () => {
    const overrides = withPathSwitch(NO_OVERRIDES, 'Fleet', 'on');

    it('should switch its descendants on', () => effectivePathSwitch(overrides, 'Fleet/Quality').should.deep.equal({ switch: 'on', inheritedFrom: 'Fleet' }));
});
