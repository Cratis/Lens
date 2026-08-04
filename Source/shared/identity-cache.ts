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

function getUrlForCookie(cookie: chrome.cookies.Cookie, fallbackUrl: string): string {
    try {
        const fallback = new URL(fallbackUrl);
        const protocol = cookie.secure ? 'https:' : fallback.protocol;
        const domain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
        const path = cookie.path || '/';
        return `${protocol}//${domain}${path}`;
    } catch {
        return fallbackUrl;
    }
}

async function removeIdentityCookiesForUrl(url: string): Promise<void> {
    const cookies = await chrome.cookies.getAll({
        url,
        name: ARC_IDENTITY_COOKIE_NAME,
    });

    if (cookies.length === 0) {
        await chrome.cookies.remove({
            url,
            name: ARC_IDENTITY_COOKIE_NAME,
        });
        return;
    }

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
