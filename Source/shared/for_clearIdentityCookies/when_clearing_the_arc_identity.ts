import { afterEach, beforeEach, describe, it } from 'vitest';
import { ChromeStub, installChromeStub, uninstallChromeStub } from '../../testing/chromeStub';
import { ARC_IDENTITY_COOKIE_NAME, clearIdentityCookies } from '../identity-cache';

function aCookie(overrides: Partial<chrome.cookies.Cookie> = {}): chrome.cookies.Cookie {
    return {
        name: ARC_IDENTITY_COOKIE_NAME,
        value: 'whoever-was-here-before',
        domain: 'arc.example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        hostOnly: true,
        session: false,
        sameSite: 'lax',
        storeId: '0',
        ...overrides,
    } as chrome.cookies.Cookie;
}

describe('when the identity cookie exists on both configured origins', () => {
    let chromeStub: ChromeStub;

    beforeEach(async () => {
        chromeStub = installChromeStub();
        chromeStub.cookiesByUrl['https://arc.example.com/'] = [aCookie()];
        chromeStub.cookiesByUrl['http://localhost:9000/'] = [aCookie({ domain: 'localhost', secure: false })];

        await clearIdentityCookies({
            arcBaseUrl: 'https://arc.example.com/api',
            arcPageOrigin: 'http://localhost:9000/some/page',
        });
    });

    afterEach(() => uninstallChromeStub());

    it('should remove the cookie from both', () => {
        chromeStub.removedCookies.should.have.lengthOf(2);
    });

    it('should only ever target the arc identity cookie', () => {
        chromeStub.removedCookies.every(_ => _.name === ARC_IDENTITY_COOKIE_NAME).should.equal(true);
    });

    it('should keep each cookie on its own scheme', () => {
        const urls = chromeStub.removedCookies.map(_ => _.url).sort();
        urls.should.deep.equal(['http://localhost:9000/', 'https://arc.example.com/']);
    });
});

describe('when the base url and page origin resolve to the same origin', () => {
    let chromeStub: ChromeStub;

    beforeEach(async () => {
        chromeStub = installChromeStub();
        chromeStub.cookiesByUrl['https://arc.example.com/'] = [aCookie()];

        await clearIdentityCookies({
            arcBaseUrl: 'https://arc.example.com/api',
            arcPageOrigin: 'https://arc.example.com',
        });
    });

    afterEach(() => uninstallChromeStub());

    it('should act on that origin once', () => {
        chromeStub.removedCookies.should.have.lengthOf(1);
    });
});

describe('when no arc origin is configured', () => {
    let chromeStub: ChromeStub;

    beforeEach(async () => {
        chromeStub = installChromeStub();
        await clearIdentityCookies({ arcBaseUrl: '', arcPageOrigin: '' });
    });

    afterEach(() => uninstallChromeStub());

    it('should not touch any cookies', () => {
        chromeStub.removedCookies.should.have.lengthOf(0);
    });
});

describe('when the configured url cannot be parsed', () => {
    let chromeStub: ChromeStub;

    beforeEach(async () => {
        chromeStub = installChromeStub();
        await clearIdentityCookies({ arcBaseUrl: 'not-a-url', arcPageOrigin: null });
    });

    afterEach(() => uninstallChromeStub());

    it('should not touch any cookies', () => {
        chromeStub.removedCookies.should.have.lengthOf(0);
    });
});
