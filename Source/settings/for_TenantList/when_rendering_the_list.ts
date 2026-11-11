import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it } from 'vitest';
import { aTenant, settingsWith } from '../../testing/chromeStub';
import { ExtensionSettings } from '../../shared/types';
import { TenantList } from '../TenantList';

function render(settings: ExtensionSettings, isRefreshing = false): string {
    return renderToStaticMarkup(createElement(TenantList, {
        settings, onChange: () => { }, onRefreshTenants: () => { }, isRefreshingTenants: isRefreshing,
    }));
}

describe('when rendering a list without tenants', () => {
    const markup = render(settingsWith({ tenants: [] }));

    it('should show the empty state', () => {
        markup.should.contain('<div class="empty-state compact"><p>No tenant options configured yet.</p></div>');
    });

    it('should not show the list', () => {
        markup.should.not.contain('option-list');
    });

    it('should offer adding and refreshing', () => {
        markup.should.contain('aria-label="Add tenant"');
        markup.should.contain('aria-label="Refresh tenants from Arc"');
        markup.should.contain('<h3>Tenant options</h3>');
    });

    it('should show an idle refresh icon', () => {
        markup.should.contain('pi pi-refresh');
        markup.should.not.contain('pi-spinner');
        markup.should.not.contain('disabled');
    });
});

describe('when rendering while refreshing', () => {
    const markup = render(settingsWith({ tenants: [] }), true);

    it('should show the spinner and disable the refresh', () => {
        markup.should.contain('pi pi-spin pi-spinner');
        markup.should.contain('disabled');
    });
});

describe('when rendering custom and arc tenants', () => {
    const markup = render(settingsWith({
        tenants: [aTenant({ id: 'c1', name: 'Custom', source: 'custom' }), aTenant({ id: 'a1', name: 'FromArc', source: 'arc' })],
        activeTenantId: 'a1',
    }));

    it('should show a row for each tenant with its title and id', () => {
        markup.should.contain('<div class="option-item-title">Custom</div><div class="option-item-subtitle">c1</div>');
        markup.should.contain('<div class="option-item-title">FromArc</div><div class="option-item-subtitle">a1</div>');
    });

    it('should tag the active and arc tenants', () => {
        markup.split('Active').length.should.equal(2);
        markup.split('>Arc<').length.should.equal(2);
    });

    it('should offer view for arc tenants and edit and delete for custom ones', () => {
        markup.split('pi-eye').length.should.equal(2);
        markup.split('pi-pencil').length.should.equal(2);
        markup.split('pi-trash').length.should.equal(2);
    });

    it('should put the actions in the right row', () => {
        const [custom, arc] = markup.split('FromArc');
        custom.should.contain('pi-pencil');
        custom.should.contain('pi-trash');
        custom.should.not.contain('pi-eye');
        arc.should.contain('pi-eye');
        arc.should.not.contain('pi-pencil');
    });
});

describe('when rendering a tenant without a source', () => {
    it('should treat it as custom', () => {
        const markup = render(settingsWith({ tenants: [aTenant({ source: undefined })] }));
        markup.should.contain('pi-pencil');
        markup.should.not.contain('pi-eye');
    });
});
