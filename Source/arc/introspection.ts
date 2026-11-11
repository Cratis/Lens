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

function appendChild(parent: TreeNode, child: TreeNode): void {
    parent.children = [...(parent.children ?? []), child];
}

function createLeafNode<T extends IntrospectionMetadataBase>(item: T, leafIcon: string): TreeNode {
    return {
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

    // Links the node under its parent (or the roots) once, and returns it as the next parent.
    const link = (node: TreeNode, parent: TreeNode | undefined): TreeNode => {
        const siblings = parent ? (parent.children ?? []) : roots;
        if (!siblings.some(_ => _.key === node.key)) {
            if (parent) {
                appendChild(parent, node);
            } else {
                roots.push(node);
            }
        }
        return node;
    };

    const ensureNamespacePath = (item: IntrospectionMetadataBase): TreeNode | undefined => {
        let parentKey = '';
        let parentNode: TreeNode | undefined;

        for (const part of item.namespace.split('.').filter(Boolean)) {
            const currentKey = parentKey ? `${parentKey}.${part}` : part;
            parentNode = link(ensureNode(`ns:${currentKey}`, part), parentNode);
            parentKey = currentKey;
        }

        return parentNode;
    };

    for (const item of items) {
        const parentNode = ensureNamespacePath(item);
        const leaf = createLeafNode(item, leafIcon);

        if (parentNode) {
            appendChild(parentNode, leaf);
        } else {
            roots.push(leaf);
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

function isObjectLike(value: unknown): value is object {
    return Boolean(value) && typeof value === 'object';
}

async function fetchSchemaCandidate(endpoint: string): Promise<JsonSchema | undefined> {
    try {
        const response = await fetch(endpoint);
        if (!response.ok) {
            return undefined;
        }

        const body = await response.json() as unknown;
        if (!isObjectLike(body)) {
            return undefined;
        }

        if ('schema' in body && isObjectLike(body.schema)) {
            return body.schema as JsonSchema;
        }

        return body as JsonSchema;
    } catch {
        return undefined;
    }
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
        const schema = await fetchSchemaCandidate(`${baseUrl.replace(/\/$/, '')}${candidate}`);
        if (schema) {
            return schema;
        }
    }

    return undefined;
}
