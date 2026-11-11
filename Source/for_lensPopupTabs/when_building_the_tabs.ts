import { describe, it } from 'vitest';
import { buildTabDefinitions, resolveActiveTab } from '../lensPopupTabs';

describe('when building the tabs for an arc application', () => {
    const tabs = buildTabDefinitions(true);

    it('should list the tabs in order', () => {
        tabs.map(_ => _.id).should.deep.equal(['context', 'commands', 'queries', 'observable-query-diagnostics', 'settings']);
    });

    it('should enable every tab', () => {
        tabs.every(_ => !_.disabled).should.be.true;
    });

    it('should describe what the arc tabs do', () => {
        tabs[1].tooltip.should.equal('Commands: browse commands by namespace and execute them with structured input.');
        tabs[2].tooltip.should.equal('Queries: browse queries by namespace and perform them with tabular results.');
        tabs[3].tooltip.should.equal('Observable query diagnostics: live status of active observable queries.');
    });

    it('should keep the labels and icons', () => {
        tabs.map(_ => [_.label, _.iconClass]).should.deep.equal([
            ['Context', 'pi-users'], ['Commands', 'pi-play-circle'], ['Queries', 'pi-search'],
            ['Query Diagnostics', 'pi-chart-line'], ['Settings', 'pi-cog']]);
    });
});

describe('when building the tabs for a page that is not an arc application', () => {
    const tabs = buildTabDefinitions(false);

    it('should disable the arc tabs only', () => {
        tabs.map(_ => _.disabled === true).should.deep.equal([false, true, true, true, false]);
    });

    it('should explain why the arc tabs are unavailable', () => {
        tabs[1].tooltip.should.equal('Commands are available only when the active tab is an Arc application.');
        tabs[2].tooltip.should.equal('Queries are available only when the active tab is an Arc application.');
        tabs[3].tooltip.should.equal('Query diagnostics are available only when the active tab is an Arc application.');
    });

    it('should keep the always available tooltips', () => {
        tabs[0].tooltip.should.equal('Current values: choose active user and tenant for this browser profile.');
        tabs[4].tooltip.should.equal('Manage user and tenant settings used by Lens context selection.');
    });
});

describe('when resolving the active tab', () => {
    it('should keep an enabled tab', () => {
        resolveActiveTab(buildTabDefinitions(true), 'queries').should.equal('queries');
    });

    it('should fall back to context when the tab is disabled', () => {
        resolveActiveTab(buildTabDefinitions(false), 'queries').should.equal('context');
    });

    it('should keep a tab that is always available', () => {
        resolveActiveTab(buildTabDefinitions(false), 'settings').should.equal('settings');
    });

    it('should fall back to context when the tab is unknown', () => {
        resolveActiveTab([], 'settings').should.equal('context');
    });
});
