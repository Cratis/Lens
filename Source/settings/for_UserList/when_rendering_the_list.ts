import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it } from 'vitest';
import { aUser, settingsWith } from '../../testing/chromeStub';
import { ExtensionSettings } from '../../shared/types';
import { UserList } from '../UserList';

function render(settings: ExtensionSettings, isRefreshing = false): string {
    return renderToStaticMarkup(createElement(UserList, {
        settings, onChange: () => { }, onRefreshUsers: () => { }, isRefreshingUsers: isRefreshing,
    }));
}

describe('when rendering a list without users', () => {
    const markup = render(settingsWith({ users: [] }));

    it('should show the empty state', () => {
        markup.should.contain('<div class="empty-state compact"><p>No user options configured yet.</p></div>');
    });

    it('should not show the list', () => {
        markup.should.not.contain('option-list');
    });

    it('should offer adding and refreshing', () => {
        markup.should.contain('aria-label="Add user"');
        markup.should.contain('aria-label="Refresh users from Arc"');
        markup.should.contain('<h3>User options</h3>');
    });

    it('should show an idle refresh icon', () => {
        markup.should.contain('pi pi-refresh');
        markup.should.not.contain('pi-spinner');
        markup.should.not.contain('disabled');
    });
});

describe('when rendering while refreshing', () => {
    const markup = render(settingsWith({ users: [] }), true);

    it('should show the spinner and disable the refresh', () => {
        markup.should.contain('pi pi-spin pi-spinner');
        markup.should.contain('disabled');
    });
});

describe('when rendering custom and arc users', () => {
    const markup = render(settingsWith({
        users: [
            aUser({ id: 'c1', name: 'custom@x', displayName: 'Custom', source: 'custom' }),
            aUser({ id: 'a1', name: 'arc@x', displayName: '', source: 'arc' }),
        ],
        activeUserId: 'a1',
    }));

    it('should show the display name, falling back to the name, with the name below', () => {
        markup.should.contain('<div class="option-item-title">Custom</div><div class="option-item-subtitle">custom@x</div>');
        markup.should.contain('<div class="option-item-title">arc@x</div><div class="option-item-subtitle">arc@x</div>');
    });

    it('should tag the active and arc users', () => {
        markup.split('Active').length.should.equal(2);
        markup.split('>Arc<').length.should.equal(2);
    });

    it('should offer view for arc users and edit and delete for custom ones', () => {
        markup.split('pi-eye').length.should.equal(2);
        markup.split('pi-pencil').length.should.equal(2);
        markup.split('pi-trash').length.should.equal(2);
    });

    it('should put the actions in the right row', () => {
        const [custom, arc] = markup.split('arc@x</div><div class="option-item-subtitle">');
        custom.should.contain('pi-pencil');
        custom.should.not.contain('pi-eye');
        arc.should.contain('pi-eye');
        arc.should.not.contain('pi-pencil');
    });
});

describe('when rendering a user without a source', () => {
    it('should treat it as custom', () => {
        const markup = render(settingsWith({ users: [aUser({ source: undefined })] }));
        markup.should.contain('pi-pencil');
        markup.should.not.contain('pi-eye');
    });
});
