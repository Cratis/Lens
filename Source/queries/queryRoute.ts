export function extractPathParams(route: string): string[] {
    const matches = route.matchAll(/\{(\w+)\}/g);
    return [...matches].map(_ => _[1]);
}

export function buildResolvedUrl(baseUrl: string, route: string, parameters: Record<string, string>): string {
    let url = `${baseUrl.replace(/\/$/, '')}${route}`;
    for (const [key, value] of Object.entries(parameters)) {
        url = url.replace(`{${key}}`, encodeURIComponent(value));
    }
    return url;
}
