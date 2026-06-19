import { JsonSchema } from '../arc/introspection';
import { Claim, ExtensionSettings, Tenant, UserProfile } from '../shared/types';

const USERS_ENDPOINT = '/.cratis/users';
const TENANTS_ENDPOINT = '/.cratis/tenants';
const IDENTITY_DETAILS_SCHEMA_ENDPOINT = '/.cratis/identity-details/schema';

export interface ArcDevelopmentSources {
    users: UserProfile[];
    tenants: Tenant[];
    identityDetailsSchema?: JsonSchema;
}

export interface ArcUserSources {
    users: UserProfile[];
    identityDetailsSchema?: JsonSchema;
}

export interface ArcSourceRequestOptions {
    headers?: Record<string, string>;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getCaseInsensitiveProperty<T = unknown>(source: Record<string, unknown>, propertyName: string): T | undefined {
    const exact = source[propertyName];
    if (exact !== undefined) {
        return exact as T;
    }

    const lowerPropertyName = propertyName.toLowerCase();
    const match = Object.entries(source).find(([key]) => key.toLowerCase() === lowerPropertyName);
    return match?.[1] as T | undefined;
}

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.map(_ => String(_));
}

function toClaims(value: unknown): Claim[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter(isObject)
        .map(_ => ({
            type: String(getCaseInsensitiveProperty(_, 'typ') ?? getCaseInsensitiveProperty(_, 'type') ?? ''),
            value: String(getCaseInsensitiveProperty(_, 'val') ?? getCaseInsensitiveProperty(_, 'value') ?? ''),
        }))
        .filter(_ => _.type.length > 0 || _.value.length > 0);
}

function mapArcUser(value: unknown): UserProfile | null {
    if (!isObject(value)) {
        return null;
    }

    const microsoftIdentity = getCaseInsensitiveProperty<Record<string, unknown>>(value, 'MicrosoftIdentity');
    const details = getCaseInsensitiveProperty<unknown>(value, 'Details');
    if (!microsoftIdentity || !isObject(microsoftIdentity)) {
        return null;
    }

    const userId = String(getCaseInsensitiveProperty(microsoftIdentity, 'UserId') ?? '').trim();
    if (!userId) {
        return null;
    }

    const userDetails = String(getCaseInsensitiveProperty(microsoftIdentity, 'UserDetails') ?? '').trim();
    const identityProvider = String(getCaseInsensitiveProperty(microsoftIdentity, 'IdentityProvider') ?? 'aad');

    return {
        id: userId,
        name: userDetails || userId,
        displayName: userDetails || userId,
        identityProvider,
        roles: toStringArray(getCaseInsensitiveProperty(microsoftIdentity, 'UserRoles')),
        claims: toClaims(getCaseInsensitiveProperty(microsoftIdentity, 'Claims')),
        applicationProperties: {},
        identityDetails: isObject(details) ? details : {},
        imageUrl: '',
        source: 'arc',
    };
}

function mapArcTenant(value: unknown): Tenant | null {
    if (!isObject(value)) {
        return null;
    }

    const id = String(getCaseInsensitiveProperty(value, 'Id') ?? '').trim();
    if (!id) {
        return null;
    }

    return {
        id,
        name: String(getCaseInsensitiveProperty(value, 'Name') ?? id),
        description: '',
        imageUrl: '',
        source: 'arc',
    };
}

async function fetchJson(baseUrl: string, path: string, options: ArcSourceRequestOptions = {}): Promise<Response> {
    const endpoint = `${baseUrl.replace(/\/$/, '')}${path}`;
    const headerKeys = Object.keys(options.headers ?? {});
    console.info('[Lens][ArcSources] Request', {
        endpoint,
        headerKeys,
    });

    return await fetch(endpoint, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
            Accept: 'application/json',
            ...(options.headers ?? {}),
        },
    });
}

function toReasonDetails(reason: unknown): Record<string, unknown> {
    if (reason instanceof Error) {
        return {
            name: reason.name,
            message: reason.message,
            stack: reason.stack,
        };
    }

    return {
        raw: String(reason),
    };
}

async function throwForUnexpectedResponse(response: Response, baseUrl: string, endpointName: string): Promise<never> {
    const contentType = response.headers.get('content-type') ?? '';
    let responsePreview = '';

    try {
        responsePreview = await response.text();
    } catch {
        responsePreview = '<unable to read response body>';
    }

    const preview = responsePreview.slice(0, 400);
    throw new Error(`${endpointName} failed (${response.status}) [${contentType}] from ${baseUrl}: ${preview}`);
}

async function fetchUsers(baseUrl: string, options: ArcSourceRequestOptions = {}): Promise<UserProfile[]> {
    let response: Response;
    try {
        response = await fetchJson(baseUrl, USERS_ENDPOINT, options);
    } catch (error) {
        throw new Error(`Users request failed for ${baseUrl}: ${toReasonDetails(error).message ?? String(error)}`);
    }

    if (response.status === 404) {
        return [];
    }
    if (!response.ok) {
        await throwForUnexpectedResponse(response, baseUrl, 'Users endpoint');
    }

    const payload = await response.json() as unknown;
    if (!Array.isArray(payload)) {
        console.warn('[Lens][ArcSources] Users payload is not an array', {
            baseUrl,
            payloadType: typeof payload,
        });
        return [];
    }

    const users = payload
        .map(mapArcUser)
        .filter((_) : _ is UserProfile => _ !== null);

    console.info('[Lens][ArcSources] Users fetched', {
        baseUrl,
        returnedCount: payload.length,
        mappedCount: users.length,
    });

    return users;
}

async function fetchTenants(baseUrl: string, options: ArcSourceRequestOptions = {}): Promise<Tenant[]> {
    let response: Response;
    try {
        response = await fetchJson(baseUrl, TENANTS_ENDPOINT, options);
    } catch (error) {
        throw new Error(`Tenants request failed for ${baseUrl}: ${toReasonDetails(error).message ?? String(error)}`);
    }

    if (response.status === 404) {
        return [];
    }
    if (!response.ok) {
        await throwForUnexpectedResponse(response, baseUrl, 'Tenants endpoint');
    }

    const payload = await response.json() as unknown;
    if (!Array.isArray(payload)) {
        console.warn('[Lens][ArcSources] Tenants payload is not an array', {
            baseUrl,
            payloadType: typeof payload,
        });
        return [];
    }

    const tenants = payload
        .map(mapArcTenant)
        .filter((_) : _ is Tenant => _ !== null);

    console.info('[Lens][ArcSources] Tenants fetched', {
        baseUrl,
        returnedCount: payload.length,
        mappedCount: tenants.length,
    });

    return tenants;
}

async function fetchIdentityDetailsSchema(baseUrl: string, options: ArcSourceRequestOptions = {}): Promise<JsonSchema | undefined> {
    let response: Response;
    try {
        response = await fetchJson(baseUrl, IDENTITY_DETAILS_SCHEMA_ENDPOINT, options);
    } catch (error) {
        throw new Error(`Identity schema request failed for ${baseUrl}: ${toReasonDetails(error).message ?? String(error)}`);
    }

    if (response.status === 404) {
        return undefined;
    }
    if (!response.ok) {
        await throwForUnexpectedResponse(response, baseUrl, 'Identity details schema endpoint');
    }

    const payload = await response.json() as unknown;
    if (!isObject(payload)) {
        console.warn('[Lens][ArcSources] Identity schema payload is not an object', {
            baseUrl,
            payloadType: typeof payload,
        });
        return undefined;
    }

    console.info('[Lens][ArcSources] Identity schema fetched', {
        baseUrl,
        hasProperties: typeof payload.properties === 'object' && payload.properties !== null,
    });

    return payload as JsonSchema;
}

export async function fetchArcDevelopmentSources(baseUrl: string, options: ArcSourceRequestOptions = {}): Promise<ArcDevelopmentSources> {
    const [usersResult, tenantsResult, schemaResult] = await Promise.allSettled([
        fetchUsers(baseUrl, options),
        fetchTenants(baseUrl, options),
        fetchIdentityDetailsSchema(baseUrl, options),
    ]);

    if (usersResult.status === 'rejected') {
        console.warn('[Lens][ArcSources] Users fetch failed', { baseUrl, reason: toReasonDetails(usersResult.reason) });
    }
    if (tenantsResult.status === 'rejected') {
        console.warn('[Lens][ArcSources] Tenants fetch failed', { baseUrl, reason: toReasonDetails(tenantsResult.reason) });
    }
    if (schemaResult.status === 'rejected') {
        console.warn('[Lens][ArcSources] Identity schema fetch failed', { baseUrl, reason: toReasonDetails(schemaResult.reason) });
    }

    const users = usersResult.status === 'fulfilled' ? usersResult.value : [];
    const tenants = tenantsResult.status === 'fulfilled' ? tenantsResult.value : [];
    const identityDetailsSchema = schemaResult.status === 'fulfilled' ? schemaResult.value : undefined;

    return {
        users,
        tenants,
        identityDetailsSchema,
    };
}

export async function fetchArcUsers(baseUrl: string, options: ArcSourceRequestOptions = {}): Promise<ArcUserSources> {
    const [usersResult, schemaResult] = await Promise.allSettled([
        fetchUsers(baseUrl, options),
        fetchIdentityDetailsSchema(baseUrl, options),
    ]);

    const users = usersResult.status === 'fulfilled' ? usersResult.value : [];
    const identityDetailsSchema = schemaResult.status === 'fulfilled' ? schemaResult.value : undefined;

    if (usersResult.status === 'rejected') {
        console.warn('[Lens][ArcSources] Users-only fetch failed', { baseUrl, reason: toReasonDetails(usersResult.reason) });
    }
    if (schemaResult.status === 'rejected') {
        console.warn('[Lens][ArcSources] Users schema fetch failed', { baseUrl, reason: toReasonDetails(schemaResult.reason) });
    }

    return {
        users,
        identityDetailsSchema,
    };
}

export async function fetchArcTenants(baseUrl: string, options: ArcSourceRequestOptions = {}): Promise<Tenant[]> {
    try {
        return await fetchTenants(baseUrl, options);
    } catch (error) {
        console.warn('[Lens][ArcSources] Tenants-only fetch failed', { baseUrl, reason: toReasonDetails(error) });
        return [];
    }
}

export function mergeArcSourcedSettings(settings: ExtensionSettings, sources: ArcDevelopmentSources): ExtensionSettings {
    const customUsers = settings.users.filter(_ => _.source !== 'arc');
    const customTenants = settings.tenants.filter(_ => _.source !== 'arc');

    // A refresh whose fetch rejected returns an empty list (Promise.allSettled -> []). Keep the
    // previously fetched arc entries in that case so a transient/failed refresh never wipes the
    // active user/tenant selection.
    const arcUsers = sources.users.length > 0 ? sources.users : settings.users.filter(_ => _.source === 'arc');
    const arcTenants = sources.tenants.length > 0 ? sources.tenants : settings.tenants.filter(_ => _.source === 'arc');

    const users = [...customUsers, ...arcUsers];
    const tenants = [...customTenants, ...arcTenants];

    const activeUserId = users.some(_ => _.id === settings.activeUserId)
        ? settings.activeUserId
        : (users[0]?.id ?? '');
    const activeTenantId = tenants.some(_ => _.id === settings.activeTenantId)
        ? settings.activeTenantId
        : (tenants[0]?.id ?? '');

    return {
        ...settings,
        users,
        tenants,
        activeUserId,
        activeTenantId,
    };
}

export function mergeArcUsers(settings: ExtensionSettings, users: UserProfile[]): ExtensionSettings {
    const customUsers = settings.users.filter(_ => _.source !== 'arc');
    // Preserve the prior arc users when a refresh returned none, so it never wipes the selection.
    const arcUsers = users.length > 0 ? users : settings.users.filter(_ => _.source === 'arc');
    const mergedUsers = [...customUsers, ...arcUsers];

    const activeUserId = mergedUsers.some(_ => _.id === settings.activeUserId)
        ? settings.activeUserId
        : (mergedUsers[0]?.id ?? '');

    return {
        ...settings,
        users: mergedUsers,
        activeUserId,
    };
}

export function mergeArcTenants(settings: ExtensionSettings, tenants: Tenant[]): ExtensionSettings {
    const customTenants = settings.tenants.filter(_ => _.source !== 'arc');
    // Preserve the prior arc tenants when a refresh returned none, so it never wipes the selection.
    const arcTenants = tenants.length > 0 ? tenants : settings.tenants.filter(_ => _.source === 'arc');
    const mergedTenants = [...customTenants, ...arcTenants];

    const activeTenantId = mergedTenants.some(_ => _.id === settings.activeTenantId)
        ? settings.activeTenantId
        : (mergedTenants[0]?.id ?? '');

    return {
        ...settings,
        tenants: mergedTenants,
        activeTenantId,
    };
}
