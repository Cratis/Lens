import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { SelectButton } from 'primereact/selectbutton';
import { Tree, TreeExpandedKeysType } from 'primereact/tree';
import { TreeNode } from 'primereact/treenode';
import { ARC_CONTEXT_UNAVAILABLE_MESSAGE } from '../arc/constants';
import {
    applyAvailabilityOverrides,
    ApplicationStructure,
    AvailabilityAudience,
    AvailabilityOverrides,
    AvailabilityToolsUnavailableError,
    audienceSwitch,
    buildStructureTree,
    countOverrides,
    effectivePathSwitch,
    fetchAvailabilityModel,
    fetchStructure,
    NO_OVERRIDES,
    pathSwitch,
    StructureNodeData,
    Switch,
    withAudienceSwitch,
    withPathSwitch,
} from '../arc/availability';
import { buildContextRequestHeaders } from '../shared/requestHeaders';
import { ExtensionSettings } from '../shared/types';
import './availability.css';

interface Props {
    arcBaseUrl: string;
    settings: ExtensionSettings | null;
}

const SWITCH_OPTIONS: { label: string; value: Switch; title: string }[] = [
    { label: 'Auto', value: 'auto', title: 'Leave it to the application' },
    { label: 'On', value: 'on', title: 'Treat it as available' },
    { label: 'Off', value: 'off', title: 'Treat it as not available' },
];

const AUDIENCE_SWITCH_OPTIONS: { label: string; value: Switch; title: string }[] = [
    { label: 'Auto', value: 'auto', title: 'Whatever the caller really belongs to' },
    { label: 'On', value: 'on', title: 'Every caller belongs to it' },
    { label: 'Off', value: 'off', title: 'No caller belongs to it' },
];

function SwitchButton({ value, options, onChange, label }: {
    value: Switch;
    options: { label: string; value: Switch; title: string }[];
    onChange: (value: Switch) => void;
    label: string;
}) {
    return (
        <SelectButton
            className="lens-availability-switch"
            value={value}
            options={options}
            optionLabel="label"
            optionValue="value"
            allowEmpty={false}
            aria-label={label}
            itemTemplate={option => <span title={option.title}>{option.label}</span>}
            onChange={event => {
                if (event.value) {
                    onChange(event.value as Switch);
                }
            }}
        />
    );
}

export function AvailabilityView({ arcBaseUrl, settings }: Props) {
    const [structure, setStructure] = useState<ApplicationStructure>({ modules: [] });
    const [audiences, setAudiences] = useState<AvailabilityAudience[]>([]);
    const [overrides, setOverrides] = useState<AvailabilityOverrides>(NO_OVERRIDES);
    const [loading, setLoading] = useState(false);
    const [toolsUnavailable, setToolsUnavailable] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedKeys, setExpandedKeys] = useState<TreeExpandedKeysType>({});
    // Switches are sent one after the other, each built on the one before it, so a quick second click is not lost.
    const pending = useRef<Promise<unknown>>(Promise.resolve());
    const current = useRef<AvailabilityOverrides>(NO_OVERRIDES);

    const treeNodes = useMemo<TreeNode[]>(() => buildStructureTree(structure), [structure]);

    const load = useCallback(async () => {
        if (!arcBaseUrl) {
            setError(ARC_CONTEXT_UNAVAILABLE_MESSAGE);
            return;
        }

        setLoading(true);
        setError(null);
        setToolsUnavailable(false);
        const headers = buildContextRequestHeaders(settings);
        try {
            const [loadedStructure, model] = await Promise.all([
                fetchStructure(arcBaseUrl, headers),
                fetchAvailabilityModel(arcBaseUrl, headers),
            ]);
            setStructure(loadedStructure);
            setAudiences(model.audiences);
            current.current = model.overrides;
            setOverrides(model.overrides);
        } catch (loadError) {
            if (loadError instanceof AvailabilityToolsUnavailableError) {
                setToolsUnavailable(true);
            } else {
                setError(String(loadError));
            }
            setStructure({ modules: [] });
            setAudiences([]);
        } finally {
            setLoading(false);
        }
    }, [arcBaseUrl, settings]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        const roots = treeNodes.reduce<Record<string, boolean>>((keys, node) => {
            if (typeof node.key === 'string') {
                keys[node.key] = true;
            }
            return keys;
        }, {});
        setExpandedKeys(previous => ({ ...roots, ...previous }));
    }, [treeNodes]);

    const apply = (change: (overrides: AvailabilityOverrides) => AvailabilityOverrides) => {
        const next = change(current.current);
        const previous = current.current;
        current.current = next;
        setOverrides(next);
        setError(null);
        const headers = buildContextRequestHeaders(settings);
        pending.current = pending.current.then(async () => {
            try {
                const applied = await applyAvailabilityOverrides(arcBaseUrl, next, headers);
                // The last request decides what is shown, so a slower earlier answer does not undo a later click.
                if (current.current === next) {
                    current.current = applied;
                    setOverrides(applied);
                }
            } catch (applyError) {
                if (current.current === next) {
                    current.current = previous;
                    setOverrides(previous);
                }
                setError(applyError instanceof AvailabilityToolsUnavailableError ? applyError.message : String(applyError));
            }
        });
    };

    const reset = () => apply(() => NO_OVERRIDES);

    const nodeTemplate = (node: TreeNode) => {
        const data = node.data as StructureNodeData;
        const own = pathSwitch(overrides, data.path);
        const effective = effectivePathSwitch(overrides, data.path);
        const inherited = effective.inheritedFrom !== undefined;
        const stateClass = effective.switch === 'off' ? 'is-off' : effective.switch === 'on' ? 'is-on' : '';
        return (
            <div className={`lens-availability-node ${stateClass}`}>
                <span className="lens-availability-node-label">
                    <i className={typeof node.icon === 'string' ? node.icon : undefined} aria-hidden="true" />
                    <span>{node.label}</span>
                    {data.kind === 'slice' && (
                        <span className="lens-availability-parts" title={data.parts.map(_ => `${_.kind}: ${_.fullName}`).join('\n')}>
                            {data.parts.length}
                        </span>
                    )}
                    {inherited && <span className="lens-availability-inherited" title={`Set on ${effective.inheritedFrom}`}>from {effective.inheritedFrom}</span>}
                </span>
                <SwitchButton
                    value={own}
                    options={SWITCH_OPTIONS}
                    label={`Availability of ${data.path}`}
                    onChange={value => apply(previous => withPathSwitch(previous, data.path, value))}
                />
            </div>
        );
    };

    const overrideCount = countOverrides(overrides);

    return (
        <section className="lens-availability">
            <div className="lens-availability-toolbar">
                <Button
                    icon="pi pi-refresh"
                    label="Refresh"
                    size="small"
                    outlined
                    loading={loading}
                    onClick={() => void load()}
                />
                <Button
                    icon="pi pi-undo"
                    label={overrideCount > 0 ? `Reset ${overrideCount}` : 'Reset'}
                    size="small"
                    outlined
                    severity="secondary"
                    disabled={overrideCount === 0}
                    onClick={reset}
                />
            </div>

            {error && <Message severity="error" text={error} />}
            {toolsUnavailable && (
                <Message
                    severity="info"
                    text="This application does not offer availability tools. They need Arc availability, and the application running in a Development environment."
                />
            )}

            <h3 className="lens-availability-heading">Audiences</h3>
            {audiences.length === 0 && !loading && !toolsUnavailable && (
                <p className="lens-availability-empty">The application declares no audiences.</p>
            )}
            <ul className="lens-availability-audiences">
                {audiences.map(audience => (
                    <li key={audience.name} className="lens-availability-audience">
                        <span className="lens-availability-audience-name" title={audience.description || audience.name}>
                            <strong>{audience.name}</strong>
                            {audience.description && <small>{audience.description}</small>}
                        </span>
                        <SwitchButton
                            value={audienceSwitch(overrides, audience.name)}
                            options={AUDIENCE_SWITCH_OPTIONS}
                            label={`Audience ${audience.name}`}
                            onChange={value => apply(previous => withAudienceSwitch(previous, audience.name, value))}
                        />
                    </li>
                ))}
            </ul>

            <h3 className="lens-availability-heading">Modules, features and slices</h3>
            {treeNodes.length === 0 && !loading && !error && (
                <p className="lens-availability-empty">The application reports no modules, features or slices.</p>
            )}
            <Tree
                value={treeNodes}
                expandedKeys={expandedKeys}
                onToggle={event => setExpandedKeys(event.value)}
                nodeTemplate={nodeTemplate}
                className="lens-availability-tree"
            />
        </section>
    );
}
