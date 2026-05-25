import { TreeNode } from 'primereact/treenode';
import { CommandIntrospectionMetadata, QueryIntrospectionMetadata } from '../shared/types';

export interface JsonSchema {
    type?: string;
    title?: string;
    description?: string;
    enum?: unknown[];
    default?: unknown;
    properties?: Record<string, JsonSchema>;
    required?: string[];
    items?: JsonSchema;
    anyOf?: JsonSchema[];
    oneOf?: JsonSchema[];
    allOf?: JsonSchema[];
}

export interface IntrospectionMetadataBase {
    name: string;
    namespace: string;
    route: string;
    type: string;
    documentationSummary: string;
    schema?: JsonSchema;
}

export type CommandMetadata = CommandIntrospectionMetadata & { schema?: JsonSchema };
export type QueryMetadata = QueryIntrospectionMetadata & { schema?: JsonSchema };

export interface MetadataTreeLeaf<T extends IntrospectionMetadataBase> {
    kind: 'leaf';
    metadata: T;
}

export function buildNamespaceTree<T extends IntrospectionMetadataBase>(items: T[], leafIcon: string): TreeNode[] {
    const roots: TreeNode[] = [];
    const map = new Map<string, TreeNode>();

    const ensureNode = (key: string, label: string): TreeNode => {
        const existing = map.get(key);
        if (existing) {
            return existing;
        }

        const node: TreeNode = {
            key,
            label,
            children: [],
            selectable: false,
            icon: 'pi pi-folder',
        };
        map.set(key, node);
        return node;
    };

    for (const item of items) {
        const namespaceParts = item.namespace.split('.').filter(Boolean);
        let parentKey = '';
        let parentNode: TreeNode | undefined;

        for (const part of namespaceParts) {
            const currentKey = parentKey ? `${parentKey}.${part}` : part;
            const currentNode = ensureNode(`ns:${currentKey}`, part);

            if (!parentNode) {
                if (!roots.some(_ => _.key === currentNode.key)) {
                    roots.push(currentNode);
                }
            } else if (!parentNode.children?.some(_ => _.key === currentNode.key)) {
                parentNode.children = [...(parentNode.children ?? []), currentNode];
            }

            parentNode = currentNode;
            parentKey = currentKey;
        }

        const leaf: TreeNode = {
            key: `leaf:${item.type}`,
            label: item.name,
            data: {
                kind: 'leaf',
                metadata: item,
            } as MetadataTreeLeaf<T>,
            selectable: true,
            icon: leafIcon,
            leaf: true,
            children: undefined,
        };

        if (!parentNode) {
            roots.push(leaf);
        } else {
            parentNode.children = [...(parentNode.children ?? []), leaf];
        }
    }

    return roots;
}

async function fetchIntrospection<T extends IntrospectionMetadataBase>(baseUrl: string, path: string): Promise<T[]> {
    const endpoint = `${baseUrl.replace(/\/$/, '')}${path}`;
    const response = await fetch(endpoint);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json() as T[];
}

export async function fetchCommands(baseUrl: string): Promise<CommandMetadata[]> {
    return await fetchIntrospection<CommandMetadata>(baseUrl, '/.cratis/commands');
}

export async function fetchQueries(baseUrl: string): Promise<QueryMetadata[]> {
    return await fetchIntrospection<QueryMetadata>(baseUrl, '/.cratis/queries');
}

export async function tryResolveSchema(baseUrl: string, type: string): Promise<JsonSchema | undefined> {
    const encodedType = encodeURIComponent(type);
    const candidates = [
        `/.cratis/types/${encodedType}`,
        `/.cratis/schema/${encodedType}`,
        `/.cratis/schemas/${encodedType}`,
        `/.cratis/types?type=${encodedType}`,
    ];

    for (const candidate of candidates) {
        const endpoint = `${baseUrl.replace(/\/$/, '')}${candidate}`;
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                continue;
            }

            const body = await response.json() as unknown;
            if (!body || typeof body !== 'object') {
                continue;
            }

            if ('schema' in body && body.schema && typeof body.schema === 'object') {
                return body.schema as JsonSchema;
            }

            return body as JsonSchema;
        } catch {
            continue;
        }
    }

    return undefined;
}
