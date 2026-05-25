import { ExtensionSettings, UserProfile } from './types';

function buildClientPrincipal(user: UserProfile): string {
    const principal = {
        identityProvider: user.identityProvider || 'aad',
        userId: user.id,
        userDetails: user.name,
        userRoles: user.roles.length > 0 ? user.roles : ['authenticated', 'anonymous'],
        claims: user.claims.map(claim => ({ typ: claim.type, val: claim.value })),
        ...user.applicationProperties,
    };

    return btoa(JSON.stringify(principal));
}

export function buildContextRequestHeaders(settings: ExtensionSettings | null): Record<string, string> {
    if (!settings) {
        return {};
    }

    const headers: Record<string, string> = {};
    const user = settings.users.find(_ => _.id === settings.activeUserId);
    const tenant = settings.tenants.find(_ => _.id === settings.activeTenantId);

    if (user) {
        headers['X-MS-CLIENT-PRINCIPAL-ID'] = user.id;
        headers['X-MS-CLIENT-PRINCIPAL-NAME'] = user.name;
        headers['X-MS-CLIENT-PRINCIPAL'] = buildClientPrincipal(user);
    }

    if (tenant && settings.tenantHeaderName) {
        headers[settings.tenantHeaderName] = tenant.id;
    }

    return headers;
}