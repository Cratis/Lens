import { JsonSchema } from '../arc/introspection';
import { Claim, ExtensionSettings, Tenant, UserProfile } from '../shared/types';

const USERS_ENDPOINT = '/.cratis/users';
const TENANTS_ENDPOINT = '/.cratis/tenants';
const IDENTITY_DETAILS_SCHEMA_ENDPOINT = '/.cratis/identity-details/schema';

// A fetch that rejected and a host that genuinely has no users both produce an empty list, and the merge
// has to tell them apart: the first must keep what it already had, the second must clear it. Carrying the
// outcome next to the data is what makes that decision possible -- and keeps a caller from forgetting it.
export interface ArcDevelopmentSources {
    users: UserProfile[];
    tenants: Tenant[];
    identityDetailsSchema?: JsonSchema;
    usersFailed: boolean;
    tenantsFailed: boolean;
}

export interface ArcUserSources {
    users: UserProfile[];
    identityDetailsSchema?: JsonSchema;
    usersFailed: boolean;
}

export interface ArcTenantSources {
    tenants: Tenant[];
    tenantsFailed: boolean;
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

interface CollectionSource<T> {
    plural: string;
    path: string;
    endpointName: string;
    map: (value: unknown) => T | null;
}

const usersSource: CollectionSource<UserProfile> = {
    plural: 'Users',
    path: USERS_ENDPOINT,
    endpointName: 'Users endpoint',
    map: mapArcUser,
};

const tenantsSource: CollectionSource<Tenant> = {
    plural: 'Tenants',
    path: TENANTS_ENDPOINT,
    endpointName: 'Tenants endpoint',
    map: mapArcTenant,
};

async function fetchCollection<T>(source: CollectionSource<T>, baseUrl: string, options: ArcSourceRequestOptions): Promise<T[]> {
    let response: Response;
    try {
        response = await fetchJson(baseUrl, source.path, options);
    } catch (error) {
        throw new Error(`${source.plural} request failed for ${baseUrl}: ${toReasonDetails(error).message ?? String(error)}`);
    }

    if (response.status === 404) {
        return [];
    }
    if (!response.ok) {
        await throwForUnexpectedResponse(response, baseUrl, source.endpointName);
    }

    const payload = await response.json() as unknown;
    if (!Array.isArray(payload)) {
        console.warn(`[Lens][ArcSources] ${source.plural} payload is not an array`, {
            baseUrl,
            payloadType: typeof payload,
        });
        return [];
    }

    const entries = payload
        .map(source.map)
        .filter((_): _ is T => _ !== null);

    console.info(`[Lens][ArcSources] ${source.plural} fetched`, {
        baseUrl,
        returnedCount: payload.length,
        mappedCount: entries.length,
    });

    return entries;
}

function fetchUsers(baseUrl: string, options: ArcSourceRequestOptions = {}): Promise<UserProfile[]> {
    return fetchCollection(usersSource, baseUrl, options);
}

function fetchTenants(baseUrl: string, options: ArcSourceRequestOptions = {}): Promise<Tenant[]> {
    return fetchCollection(tenantsSource, baseUrl, options);
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
        usersFailed: usersResult.status === 'rejected',
        tenantsFailed: tenantsResult.status === 'rejected',
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
        usersFailed: usersResult.status === 'rejected',
    };
}

export async function fetchArcTenants(baseUrl: string, options: ArcSourceRequestOptions = {}): Promise<ArcTenantSources> {
    try {
        return { tenants: await fetchTenants(baseUrl, options), tenantsFailed: false };
    } catch (error) {
        console.warn('[Lens][ArcSources] Tenants-only fetch failed', { baseUrl, reason: toReasonDetails(error) });
        return { tenants: [], tenantsFailed: true };
    }
}

interface Sourced {
    id: string;
    source?: string;
}

// Only a failed fetch keeps the previous arc-sourced entries. A refresh that succeeded and returned nothing
// is a host that really has none, and must be allowed to clear them.
function mergeSourced<T extends Sourced>(current: T[], fetched: T[], failed: boolean): T[] {
    const customEntries = current.filter(_ => _.source !== 'arc');
    const arcEntries = failed ? current.filter(_ => _.source === 'arc') : fetched;
    return [...customEntries, ...arcEntries];
}

function resolveActiveId(entries: Sourced[], activeId: string): string {
    return entries.some(_ => _.id === activeId) ? activeId : (entries[0]?.id ?? '');
}

export function mergeArcSourcedSettings(settings: ExtensionSettings, sources: ArcDevelopmentSources): ExtensionSettings {
    const users = mergeSourced(settings.users, sources.users, sources.usersFailed);
    const tenants = mergeSourced(settings.tenants, sources.tenants, sources.tenantsFailed);

    return {
        ...settings,
        users,
        tenants,
        activeUserId: resolveActiveId(users, settings.activeUserId),
        activeTenantId: resolveActiveId(tenants, settings.activeTenantId),
    };
}

export function mergeArcUsers(settings: ExtensionSettings, sources: ArcUserSources): ExtensionSettings {
    const users = mergeSourced(settings.users, sources.users, sources.usersFailed);

    return {
        ...settings,
        users,
        activeUserId: resolveActiveId(users, settings.activeUserId),
    };
}

export function mergeArcTenants(settings: ExtensionSettings, sources: ArcTenantSources): ExtensionSettings {
    const tenants = mergeSourced(settings.tenants, sources.tenants, sources.tenantsFailed);

    return {
        ...settings,
        tenants,
        activeTenantId: resolveActiveId(tenants, settings.activeTenantId),
    };
}
