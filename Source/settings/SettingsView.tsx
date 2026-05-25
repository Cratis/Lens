import { TabPanel, TabView } from 'primereact/tabview';
import { ExtensionSettings } from '../shared/types';
import { TenantList } from './TenantList';
import { UserList } from './UserList';

interface Props {
    settings: ExtensionSettings | null;
    onChange: (settings: ExtensionSettings) => void;
}

export function SettingsView({ settings, onChange }: Props) {
    if (!settings) {
        return <div className="loading">Loading settings...</div>;
    }

    return (
        <div className="stack-gap">
            <section className="feature-card">
                <TabView>
                    <TabPanel header="User settings">
                        <UserList settings={settings} onChange={onChange} />
                    </TabPanel>
                    <TabPanel header="Tenant settings">
                        <TenantList settings={settings} onChange={onChange} />
                    </TabPanel>
                </TabView>
            </section>
        </div>
    );
}
