import { TreeNode } from 'primereact/treenode';

export interface StructurePart {
    name: string;
    fullName: string;
    kind: string;
}

export interface StructureSlice {
    name: string;
    path: string;
    parts: StructurePart[];
}

export interface StructureFeature {
    name: string;
    path: string;
    features: StructureFeature[];
    slices: StructureSlice[];
}

export interface StructureModule {
    name: string;
    path: string;
    features: StructureFeature[];
    slices: StructureSlice[];
}

export interface ApplicationStructure {
    modules: StructureModule[];
}

// What a developer switched on or off. A path is a module, a feature or a slice written as `Module/Feature/Slice`,
// and it covers everything beneath it. Off wins over on, for audiences and for paths.
export interface AvailabilityOverrides {
    enabledAudiences: string[];
    disabledAudiences: string[];
    enabledPaths: string[];
    disabledPaths: string[];
}

export interface AvailabilityAudience {
    name: string;
    description: string;
    source: string;
}

export interface AvailabilityAlternative {
    audiences: string[];
    conditions: string[];
}

export interface AvailabilityBlock {
    name: string;
    description: string;
    source: string;
    alternatives: AvailabilityAlternative[];
}

export interface AvailabilityGate {
    target: string;
    alternatives: AvailabilityAlternative[];
}

export interface AvailabilityModel {
    overrides: AvailabilityOverrides;
    audiences: AvailabilityAudience[];
    blocks: AvailabilityBlock[];
    gates: AvailabilityGate[];
}

// auto: leave it to the application's own gates and audiences. on: treat it as available / held. off: treat it as not.
export type Switch = 'auto' | 'on' | 'off';

export type StructureNodeKind = 'module' | 'feature' | 'slice';

export interface StructureNodeData {
    kind: StructureNodeKind;
    path: string;
    parts: StructurePart[];
}

export const NO_OVERRIDES: AvailabilityOverrides = {
    enabledAudiences: [],
    disabledAudiences: [],
    enabledPaths: [],
    disabledPaths: [],
};

export const STRUCTURE_ENDPOINT = '/.cratis/structure';
export const AVAILABILITY_MODEL_ENDPOINT = '/.cratis/availability/model';
export const AVAILABILITY_OVERRIDES_ENDPOINT = '/.cratis/availability/overrides';

// Arc maps the availability endpoints only in a local or test environment, and only when the application uses availability.
export class AvailabilityToolsUnavailableError extends Error {
    constructor() {
        super('The application does not offer availability tools. They need Arc availability in a Development environment.');
        this.name = 'AvailabilityToolsUnavailableError';
    }
}

function strings(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((_): _ is string => typeof _ === 'string') : [];
}

function objects(value: unknown): Record<string, unknown>[] {
    return Array.isArray(value) ? value.filter((_): _ is Record<string, unknown> => typeof _ === 'object' && _ !== null) : [];
}

function text(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

export function normalizeOverrides(value: unknown): AvailabilityOverrides {
    const source = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
    return {
        enabledAudiences: strings(source.enabledAudiences),
        disabledAudiences: strings(source.disabledAudiences),
        enabledPaths: strings(source.enabledPaths),
        disabledPaths: strings(source.disabledPaths),
    };
}

function normalizeAlternatives(value: unknown): AvailabilityAlternative[] {
    return objects(value).map(_ => ({ audiences: strings(_.audiences), conditions: strings(_.conditions) }));
}

export function normalizeModel(value: unknown): AvailabilityModel {
    const source = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
    return {
        overrides: normalizeOverrides(source.overrides),
        audiences: objects(source.audiences).map(_ => ({ name: text(_.name), description: text(_.description), source: text(_.source) })),
        blocks: objects(source.blocks).map(_ => ({
            name: text(_.name),
            description: text(_.description),
            source: text(_.source),
            alternatives: normalizeAlternatives(_.alternatives),
        })),
        gates: objects(source.gates).map(_ => ({ target: text(_.target), alternatives: normalizeAlternatives(_.alternatives) })),
    };
}

function normalizeSlices(value: unknown): StructureSlice[] {
    return objects(value).map(_ => ({
        name: text(_.name),
        path: text(_.path),
        parts: objects(_.parts).map(part => ({ name: text(part.name), fullName: text(part.fullName), kind: text(part.kind) })),
    }));
}

function normalizeFeatures(value: unknown): StructureFeature[] {
    return objects(value).map(_ => ({
        name: text(_.name),
        path: text(_.path),
        features: normalizeFeatures(_.features),
        slices: normalizeSlices(_.slices),
    }));
}

export function normalizeStructure(value: unknown): ApplicationStructure {
    const source = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
    return {
        modules: objects(source.modules).map(_ => ({
            name: text(_.name),
            path: text(_.path),
            features: normalizeFeatures(_.features),
            slices: normalizeSlices(_.slices),
        })),
    };
}

function without(values: string[], value: string): string[] {
    return values.filter(_ => _ !== value);
}

function sorted(values: string[]): string[] {
    return [...values].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
}

function withSwitch(enabled: string[], disabled: string[], name: string, value: Switch): [string[], string[]] {
    const nextEnabled = without(enabled, name);
    const nextDisabled = without(disabled, name);
    if (value === 'on') {
        nextEnabled.push(name);
    } else if (value === 'off') {
        nextDisabled.push(name);
    }

    return [sorted(nextEnabled), sorted(nextDisabled)];
}

export function audienceSwitch(overrides: AvailabilityOverrides, audience: string): Switch {
    if (overrides.disabledAudiences.includes(audience)) {
        return 'off';
    }

    return overrides.enabledAudiences.includes(audience) ? 'on' : 'auto';
}

export function withAudienceSwitch(overrides: AvailabilityOverrides, audience: string, value: Switch): AvailabilityOverrides {
    const [enabledAudiences, disabledAudiences] = withSwitch(overrides.enabledAudiences, overrides.disabledAudiences, audience, value);
    return { ...overrides, enabledAudiences, disabledAudiences };
}

// What is set on exactly this path, not what it inherits.
export function pathSwitch(overrides: AvailabilityOverrides, path: string): Switch {
    if (overrides.disabledPaths.includes(path)) {
        return 'off';
    }

    return overrides.enabledPaths.includes(path) ? 'on' : 'auto';
}

export function withPathSwitch(overrides: AvailabilityOverrides, path: string, value: Switch): AvailabilityOverrides {
    const [enabledPaths, disabledPaths] = withSwitch(overrides.enabledPaths, overrides.disabledPaths, path, value);
    return { ...overrides, enabledPaths, disabledPaths };
}

function isWithin(path: string, ancestor: string): boolean {
    return path === ancestor || path.startsWith(`${ancestor}/`);
}

export interface EffectivePathSwitch {
    switch: Switch;
    // The path the switch is set on, when it is not the path asked about.
    inheritedFrom?: string;
}

// What the application does with a path: a path switched off anywhere above it is off, whatever is set below.
// Otherwise the nearest path switched on at or above it. Off wins, as it does on the server.
export function effectivePathSwitch(overrides: AvailabilityOverrides, path: string): EffectivePathSwitch {
    const off = overrides.disabledPaths.filter(_ => isWithin(path, _)).sort((left, right) => left.length - right.length)[0];
    if (off !== undefined) {
        return off === path ? { switch: 'off' } : { switch: 'off', inheritedFrom: off };
    }

    const on = overrides.enabledPaths.filter(_ => isWithin(path, _)).sort((left, right) => right.length - left.length)[0];
    if (on !== undefined) {
        return on === path ? { switch: 'on' } : { switch: 'on', inheritedFrom: on };
    }

    return { switch: 'auto' };
}

export function countOverrides(overrides: AvailabilityOverrides): number {
    return overrides.enabledAudiences.length
        + overrides.disabledAudiences.length
        + overrides.enabledPaths.length
        + overrides.disabledPaths.length;
}

function sliceNode(slice: StructureSlice): TreeNode {
    const data: StructureNodeData = { kind: 'slice', path: slice.path, parts: slice.parts };
    return { key: `path:${slice.path}`, label: slice.name, icon: 'pi pi-box', leaf: true, selectable: false, data };
}

function featureNode(feature: StructureFeature): TreeNode {
    const data: StructureNodeData = { kind: 'feature', path: feature.path, parts: [] };
    return {
        key: `path:${feature.path}`,
        label: feature.name,
        icon: 'pi pi-folder',
        selectable: false,
        data,
        children: [...feature.features.map(featureNode), ...feature.slices.map(sliceNode)],
    };
}

// A module with no name holds what belongs to no module: its features and slices are the roots, since there is nothing to switch
// at a level that has no path.
export function buildStructureTree(structure: ApplicationStructure): TreeNode[] {
    return structure.modules.flatMap(module => {
        if (module.name.length === 0) {
            return [...module.features.map(featureNode), ...module.slices.map(sliceNode)];
        }

        const data: StructureNodeData = { kind: 'module', path: module.path, parts: [] };
        return [{
            key: `path:${module.path}`,
            label: module.name,
            icon: 'pi pi-th-large',
            selectable: false,
            data,
            children: [...module.features.map(featureNode), ...module.slices.map(sliceNode)],
        } satisfies TreeNode];
    });
}

function endpoint(baseUrl: string, path: string): string {
    return `${baseUrl.replace(/\/$/, '')}${path}`;
}

async function readJson(response: Response): Promise<unknown> {
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json() as unknown;
}

export async function fetchStructure(baseUrl: string, headers: Record<string, string> = {}): Promise<ApplicationStructure> {
    return normalizeStructure(await readJson(await fetch(endpoint(baseUrl, STRUCTURE_ENDPOINT), { headers })));
}

export async function fetchAvailabilityModel(baseUrl: string, headers: Record<string, string> = {}): Promise<AvailabilityModel> {
    const response = await fetch(endpoint(baseUrl, AVAILABILITY_MODEL_ENDPOINT), { headers });
    if (response.status === 404) {
        throw new AvailabilityToolsUnavailableError();
    }

    return normalizeModel(await readJson(response));
}

// Replaces every override. The application answers with what is now in force, which is what the caller should show.
export async function applyAvailabilityOverrides(
    baseUrl: string,
    overrides: AvailabilityOverrides,
    headers: Record<string, string> = {},
): Promise<AvailabilityOverrides> {
    const response = await fetch(endpoint(baseUrl, AVAILABILITY_OVERRIDES_ENDPOINT), {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(overrides),
    });
    if (response.status === 404) {
        throw new AvailabilityToolsUnavailableError();
    }

    return normalizeOverrides(await readJson(response));
}
