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

async function fetchJson(baseUrl: string, path: string): Promise<Response> {
    const endpoint = `${baseUrl.replace(/\/$/, '')}${path}`;
    return await fetch(endpoint);
}

async function fetchUsers(baseUrl: string): Promise<UserProfile[]> {
    const response = await fetchJson(baseUrl, USERS_ENDPOINT);
    if (response.status === 404) {
        return [];
    }
    if (!response.ok) {
        throw new Error(`Unable to fetch users (${response.status})`);
    }

    const payload = await response.json() as unknown;
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload
        .map(mapArcUser)
        .filter((_) : _ is UserProfile => _ !== null);
}

async function fetchTenants(baseUrl: string): Promise<Tenant[]> {
    const response = await fetchJson(baseUrl, TENANTS_ENDPOINT);
    if (response.status === 404) {
        return [];
    }
    if (!response.ok) {
        throw new Error(`Unable to fetch tenants (${response.status})`);
    }

    const payload = await response.json() as unknown;
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload
        .map(mapArcTenant)
        .filter((_) : _ is Tenant => _ !== null);
}

async function fetchIdentityDetailsSchema(baseUrl: string): Promise<JsonSchema | undefined> {
    const response = await fetchJson(baseUrl, IDENTITY_DETAILS_SCHEMA_ENDPOINT);
    if (response.status === 404) {
        return undefined;
    }
    if (!response.ok) {
        throw new Error(`Unable to fetch identity details schema (${response.status})`);
    }

    const payload = await response.json() as unknown;
    if (!isObject(payload)) {
        return undefined;
    }

    return payload as JsonSchema;
}

export async function fetchArcDevelopmentSources(baseUrl: string): Promise<ArcDevelopmentSources> {
    const [users, tenants, identityDetailsSchema] = await Promise.all([
        fetchUsers(baseUrl),
        fetchTenants(baseUrl),
        fetchIdentityDetailsSchema(baseUrl),
    ]);

    return {
        users,
        tenants,
        identityDetailsSchema,
    };
}

export function mergeArcSourcedSettings(settings: ExtensionSettings, sources: ArcDevelopmentSources): ExtensionSettings {
    const customUsers = settings.users.filter(_ => _.source !== 'arc');
    const customTenants = settings.tenants.filter(_ => _.source !== 'arc');

    const users = [...customUsers, ...sources.users];
    const tenants = [...customTenants, ...sources.tenants];

    const activeUserId = users.some(_ => _.id === settings.activeUserId)
        ? settings.activeUserId
        : '';
    const activeTenantId = tenants.some(_ => _.id === settings.activeTenantId)
        ? settings.activeTenantId
        : '';

    return {
        ...settings,
        users,
        tenants,
        activeUserId,
        activeTenantId,
    };
}
