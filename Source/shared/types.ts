export interface Claim {
    type: string;
    value: string;
}

export type OptionSource = 'custom' | 'arc';

export interface UserProfile {
    id: string;
    name: string;
    displayName: string;
    identityProvider: string;
    roles: string[];
    claims: Claim[];
    applicationProperties: Record<string, string>;
    identityDetails: Record<string, unknown>;
    imageUrl: string;
    source?: OptionSource;
}

export interface Tenant {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    source?: OptionSource;
}

export interface ExtensionSettings {
    users: UserProfile[];
    tenants: Tenant[];
    activeUserId: string;
    activeTenantId: string;
    tenantHeaderName: string;
    arcBaseUrl: string;
}

export interface CommandIntrospectionMetadata {
    name: string;
    namespace: string;
    route: string;
    type: string;
    documentationSummary: string;
}

export interface QueryIntrospectionMetadata {
    name: string;
    namespace: string;
    route: string;
    type: string;
    documentationSummary: string;
}
