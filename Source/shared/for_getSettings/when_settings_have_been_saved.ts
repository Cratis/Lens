import { afterEach, beforeEach, describe, it } from 'vitest';
import { ChromeStub, aUser, installChromeStub, settingsWith, uninstallChromeStub } from '../../testing/chromeStub';
import { ExtensionSettings } from '../types';
import { getSettings, saveSettings, SETTINGS_KEY } from '../storage';

describe('when settings have been saved', () => {
    let chromeStub: ChromeStub;
    let loaded: ExtensionSettings;

    beforeEach(async () => {
        chromeStub = installChromeStub();
        await saveSettings(settingsWith({ users: [aUser()], activeUserId: 'user-1' }));
        loaded = await getSettings();
    });

    afterEach(() => uninstallChromeStub());

    // storage.sync caps a single key at 8 KB, which a real Arc roster passes around the seventh user --
    // every save past that is rejected and the extension reads back as signed out.
    it('should write them to local storage', () => {
        Object.keys(chromeStub.localStore).should.deep.equal([SETTINGS_KEY]);
    });

    it('should not write them to synced storage', () => {
        Object.keys(chromeStub.syncStore).should.have.lengthOf(0);
    });

    it('should read back the active selection', () => {
        loaded.activeUserId.should.equal('user-1');
        loaded.users.should.have.lengthOf(1);
    });
});

describe('when only legacy synced settings exist', () => {
    let loaded: ExtensionSettings;

    beforeEach(async () => {
        const chromeStub = installChromeStub();
        chromeStub.syncStore[SETTINGS_KEY] = settingsWith({ users: [aUser()], activeUserId: 'user-1' });
        loaded = await getSettings();
    });

    afterEach(() => uninstallChromeStub());

    // Upgrading must not look like a factory reset to anyone whose roster was small enough to fit in sync.
    it('should carry the previously synced roster over', () => {
        loaded.activeUserId.should.equal('user-1');
        loaded.users.should.have.lengthOf(1);
    });
});

describe('when local settings exist alongside stale synced settings', () => {
    let loaded: ExtensionSettings;

    beforeEach(async () => {
        const chromeStub = installChromeStub();
        chromeStub.syncStore[SETTINGS_KEY] = settingsWith({ users: [aUser({ id: 'stale' })], activeUserId: 'stale' });
        chromeStub.localStore[SETTINGS_KEY] = settingsWith({ users: [aUser({ id: 'current' })], activeUserId: 'current' });
        loaded = await getSettings();
    });

    afterEach(() => uninstallChromeStub());

    it('should prefer the local settings', () => {
        loaded.activeUserId.should.equal('current');
    });
});

describe('when nothing has ever been saved', () => {
    let loaded: ExtensionSettings;

    beforeEach(async () => {
        installChromeStub();
        loaded = await getSettings();
    });

    afterEach(() => uninstallChromeStub());

    it('should fall back to defaults with no arc roster', () => {
        loaded.users.should.have.lengthOf(0);
        loaded.tenants.should.have.lengthOf(0);
        loaded.tenantHeaderName.should.equal('x-cratis-tenant-id');
    });
});
