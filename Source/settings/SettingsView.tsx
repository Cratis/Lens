import { TabPanel, TabView } from 'primereact/tabview';
import { JsonSchema } from '../arc/introspection';
import { ExtensionSettings } from '../shared/types';
import { TenantList } from './TenantList';
import { UserList } from './UserList';

interface Props {
    settings: ExtensionSettings | null;
    onChange: (settings: ExtensionSettings) => void;
    identityDetailsSchema?: JsonSchema;
    onRefreshUsers: () => void;
    isRefreshingUsers: boolean;
    onRefreshTenants: () => void;
    isRefreshingTenants: boolean;
}

export function SettingsView({
    settings,
    onChange,
    identityDetailsSchema,
    onRefreshUsers,
    isRefreshingUsers,
    onRefreshTenants,
    isRefreshingTenants,
}: Props) {
    if (!settings) {
        return <div className="loading">Loading settings...</div>;
    }

    return (
        <div className="stack-gap page-layout">
            <section className="feature-card fill-widget">
                <TabView className="sticky-tab-composition">
                    <TabPanel header="Users">
                        <UserList
                            settings={settings}
                            onChange={onChange}
                            identityDetailsSchema={identityDetailsSchema}
                            onRefreshUsers={onRefreshUsers}
                            isRefreshingUsers={isRefreshingUsers}
                        />
                    </TabPanel>
                    <TabPanel header="Tenants">
                        <TenantList
                            settings={settings}
                            onChange={onChange}
                            onRefreshTenants={onRefreshTenants}
                            isRefreshingTenants={isRefreshingTenants}
                        />
                    </TabPanel>
                </TabView>
            </section>
        </div>
    );
}
