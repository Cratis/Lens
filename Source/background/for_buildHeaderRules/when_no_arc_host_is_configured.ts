import { afterEach, beforeEach, describe, it } from 'vitest';
import { aTenant, aUser, installChromeStub, settingsWith, uninstallChromeStub } from '../../testing/chromeStub';
import { buildHeaderRules } from '../headerRules';

describe('when no arc host is configured', () => {
    let rules: chrome.declarativeNetRequest.Rule[];

    beforeEach(() => {
        installChromeStub();
        rules = buildHeaderRules(settingsWith({
            arcBaseUrl: '',
            arcPageOrigin: '',
            users: [aUser()],
            tenants: [aTenant()],
            activeUserId: 'user-1',
            activeTenantId: 'tenant-1',
        }));
    });

    afterEach(() => uninstallChromeStub());

    // host_permissions is <all_urls>. A wildcard fallback here attaches the impersonation headers to every
    // XHR the browser makes, on every site -- so an unconfigured Lens must install nothing at all.
    it('should install no rules even though a user and tenant are selected', () => {
        rules.should.have.lengthOf(0);
    });
});

describe('when the configured arc base url cannot be parsed', () => {
    let rules: chrome.declarativeNetRequest.Rule[];

    beforeEach(() => {
        installChromeStub();
        rules = buildHeaderRules(settingsWith({
            arcBaseUrl: 'not-a-url',
            arcPageOrigin: '',
            users: [aUser()],
            activeUserId: 'user-1',
        }));
    });

    afterEach(() => uninstallChromeStub());

    it('should install no rules', () => {
        rules.should.have.lengthOf(0);
    });
});
