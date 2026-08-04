// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

export const ARC_IDENTITY_COOKIE_NAME = '.cratis-identity';

export interface IdentityCookieTarget {
    arcBaseUrl?: string | null;
    arcPageOrigin?: string | null;
}

function toOriginUrl(value: string | null | undefined): string | null {
    if (!value) {
        return null;
    }

    try {
        const origin = new URL(value).origin;
        return `${origin}/`;
    } catch {
        return null;
    }
}

function getIdentityCookieUrls(target: IdentityCookieTarget): string[] {
    return [
        toOriginUrl(target.arcBaseUrl),
        toOriginUrl(target.arcPageOrigin),
    ].filter((_) : _ is string => _ !== null)
        .filter((value, index, values) => values.indexOf(value) === index);
}

// The cookie came back from getAll({ url }), so it is by definition readable from that origin -- keep the
// origin exactly as configured, port included, and narrow only the path to the one the cookie is scoped to.
// Rebuilding the URL from cookie.domain instead loses the port, and promoting the scheme to https for a
// Secure cookie actively breaks local development: Chrome treats http://localhost as trustworthy and lets
// Arc set a Secure .cratis-identity there, so the removal would be aimed at an origin it never lived on.
function getUrlForCookie(cookie: chrome.cookies.Cookie, originUrl: string): string {
    try {
        const url = new URL(originUrl);
        url.pathname = cookie.path || '/';
        return url.toString();
    } catch {
        return originUrl;
    }
}

async function removeIdentityCookiesForUrl(url: string): Promise<void> {
    const cookies = await chrome.cookies.getAll({
        url,
        name: ARC_IDENTITY_COOKIE_NAME,
    });

    await Promise.all(cookies.map(cookie => chrome.cookies.remove({
        url: getUrlForCookie(cookie, url),
        name: cookie.name,
        storeId: cookie.storeId,
    })));
}

export async function clearIdentityCookies(target: IdentityCookieTarget): Promise<void> {
    const urls = getIdentityCookieUrls(target);
    await Promise.all(urls.map(removeIdentityCookiesForUrl));
}
