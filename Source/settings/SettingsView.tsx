import { TabPanel, TabView } from 'primereact/tabview';
import { JsonSchema } from '../arc/introspection';
import { ExtensionSettings } from '../shared/types';
import { TenantList } from './TenantList';
import { UserList } from './UserList';

interface Props {
    settings: ExtensionSettings | null;
    onChange: (settings: ExtensionSettings) => void;
    identityDetailsSchema?: JsonSchema;
}

export function SettingsView({ settings, onChange, identityDetailsSchema }: Props) {
    if (!settings) {
        return <div className="loading">Loading settings...</div>;
    }

    return (
        <div className="stack-gap page-layout">
            <section className="feature-card fill-widget">
                <TabView className="sticky-tab-composition">
                    <TabPanel header="User settings">
                        <p className="feature-note">Arc-provided users are tagged and read-only. Custom users can be created and edited here.</p>
                        <UserList settings={settings} onChange={onChange} identityDetailsSchema={identityDetailsSchema} />
                    </TabPanel>
                    <TabPanel header="Tenant settings">
                        <p className="feature-note">Arc-provided tenants are tagged and read-only. Custom tenants remain editable.</p>
                        <TenantList settings={settings} onChange={onChange} />
                    </TabPanel>
                </TabView>
            </section>
        </div>
    );
}
