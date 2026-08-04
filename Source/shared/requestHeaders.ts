import { ExtensionSettings, Tenant, UserProfile } from './types';

export const CLIENT_PRINCIPAL_ID_HEADER = 'X-MS-CLIENT-PRINCIPAL-ID';
export const CLIENT_PRINCIPAL_NAME_HEADER = 'X-MS-CLIENT-PRINCIPAL-NAME';
export const CLIENT_PRINCIPAL_HEADER = 'X-MS-CLIENT-PRINCIPAL';

function buildClientPrincipal(user: UserProfile): string {
    const identityDetails = user.identityDetails && typeof user.identityDetails === 'object'
        ? user.identityDetails
        : {};

    const principal = {
        identityProvider: user.identityProvider || 'aad',
        userId: user.id,
        userDetails: user.name,
        userRoles: user.roles.length > 0 ? user.roles : ['authenticated', 'anonymous'],
        claims: user.claims.map(claim => ({ typ: claim.type, val: claim.value })),
        ...identityDetails,
        ...user.applicationProperties,
    };

    return btoa(JSON.stringify(principal));
}

// Both callers build their headers here: the popup, which fetches Arc's own command/query surface, and the
// service worker, which rewrites the app's requests. They used to carry separate copies of this, and a
// divergence between them presents as "it works in Lens but not in my app" with nothing pointing at the cause.
export function buildIdentityHeaders(user: UserProfile): Record<string, string> {
    return {
        [CLIENT_PRINCIPAL_ID_HEADER]: user.id,
        [CLIENT_PRINCIPAL_NAME_HEADER]: user.name,
        [CLIENT_PRINCIPAL_HEADER]: buildClientPrincipal(user),
    };
}

export function buildTenantHeaders(tenant: Tenant, tenantHeaderName: string): Record<string, string> {
    if (!tenantHeaderName) {
        return {};
    }

    return { [tenantHeaderName]: tenant.id };
}

export function buildContextRequestHeaders(settings: ExtensionSettings | null): Record<string, string> {
    if (!settings) {
        return {};
    }

    const user = settings.users.find(_ => _.id === settings.activeUserId);
    const tenant = settings.tenants.find(_ => _.id === settings.activeTenantId);

    return {
        ...(user ? buildIdentityHeaders(user) : {}),
        ...(tenant ? buildTenantHeaders(tenant, settings.tenantHeaderName) : {}),
    };
}
