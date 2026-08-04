import { afterEach, beforeEach, describe, it } from 'vitest';
import { aTenant, aUser, installChromeStub, settingsWith, uninstallChromeStub } from '../../testing/chromeStub';
import { buildHeaderRules, RULE_TENANT_HEADER, RULE_USER_HEADERS } from '../headerRules';

function headerValue(rule: chrome.declarativeNetRequest.Rule, header: string): string | undefined {
    return rule.action.requestHeaders?.find(_ => _.header === header)?.value;
}

describe('when a user and a tenant are selected against an arc host', () => {
    let rules: chrome.declarativeNetRequest.Rule[];

    beforeEach(() => {
        installChromeStub();
        rules = buildHeaderRules(settingsWith({
            arcBaseUrl: 'https://arc.example.com:5000/some/path',
            users: [aUser()],
            tenants: [aTenant()],
            activeUserId: 'user-1',
            activeTenantId: 'tenant-1',
        }));
    });

    afterEach(() => uninstallChromeStub());

    it('should install one rule for identity and one for tenancy', () => {
        rules.map(_ => _.id).should.deep.equal([RULE_USER_HEADERS, RULE_TENANT_HEADER]);
    });

    it('should scope both rules to the configured host', () => {
        rules.every(_ => _.condition.urlFilter === '||arc.example.com:5000').should.equal(true);
    });

    it('should carry the selected user identity', () => {
        headerValue(rules[0], 'X-MS-CLIENT-PRINCIPAL-ID')!.should.equal('user-1');
        headerValue(rules[0], 'X-MS-CLIENT-PRINCIPAL-NAME')!.should.equal('ada@example.com');
    });

    it('should encode the client principal as base64 json', () => {
        const principal = JSON.parse(atob(headerValue(rules[0], 'X-MS-CLIENT-PRINCIPAL')!));
        principal.userId.should.equal('user-1');
        principal.userRoles.should.deep.equal(['admin']);
    });

    it('should carry the tenant under the configured header name', () => {
        headerValue(rules[1], 'x-cratis-tenant-id')!.should.equal('tenant-1');
    });
});

describe('when a page origin is known', () => {
    let rules: chrome.declarativeNetRequest.Rule[];

    beforeEach(() => {
        installChromeStub();
        rules = buildHeaderRules(settingsWith({
            arcBaseUrl: 'https://arc.example.com',
            arcPageOrigin: 'http://localhost:9000',
            users: [aUser()],
            activeUserId: 'user-1',
        }));
    });

    afterEach(() => uninstallChromeStub());

    // Scoping by initiator is tighter than scoping by target: it limits the headers to requests the Arc app
    // itself makes, rather than to anything anyone sends to that host.
    it('should scope the rule to requests initiated by the page', () => {
        rules[0].condition.initiatorDomains!.should.deep.equal(['localhost']);
    });
});

describe('when a tenant is selected but no tenant header name is configured', () => {
    let rules: chrome.declarativeNetRequest.Rule[];

    beforeEach(() => {
        installChromeStub();
        rules = buildHeaderRules(settingsWith({
            tenantHeaderName: '',
            tenants: [aTenant()],
            activeTenantId: 'tenant-1',
        }));
    });

    afterEach(() => uninstallChromeStub());

    it('should install no tenancy rule', () => {
        rules.should.have.lengthOf(0);
    });
});

describe('when the selected user is no longer in the roster', () => {
    let rules: chrome.declarativeNetRequest.Rule[];

    beforeEach(() => {
        installChromeStub();
        rules = buildHeaderRules(settingsWith({
            users: [aUser({ id: 'user-2' })],
            activeUserId: 'user-1',
        }));
    });

    afterEach(() => uninstallChromeStub());

    it('should install no identity rule', () => {
        rules.should.have.lengthOf(0);
    });
});
