import { afterEach, beforeEach, describe, it } from 'vitest';
import sinon from 'sinon';
import { ChromeStub, installChromeStub, settingsWith, uninstallChromeStub } from '../../testing/chromeStub';
import { getSettings, SETTINGS_KEY } from '../storage';
import { describePersistFailure, persistSettings } from '../settingsPersistence';

describe('when the write is rejected', () => {
    let chromeStub: ChromeStub;
    let failure: string | null;

    beforeEach(async () => {
        sinon.stub(console, 'error');
        chromeStub = installChromeStub();
        chromeStub.localWriteFailure = new Error('QUOTA_BYTES quota exceeded');
        failure = await persistSettings(settingsWith({ activeUserId: 'user-1' }));
    });

    afterEach(() => {
        sinon.restore();
        uninstallChromeStub();
    });

    // Rejecting would escape the click handlers, which run these paths as `void refreshUsers()`.
    it('should report the failure instead of throwing it', () => {
        String(failure).should.equal('Could not save settings: QUOTA_BYTES quota exceeded');
    });

    it('should not leave anything behind in storage', () => {
        Object.keys(chromeStub.localStore).should.have.lengthOf(0);
    });
});

describe('when the write succeeds', () => {
    let chromeStub: ChromeStub;
    let failure: string | null;

    beforeEach(async () => {
        chromeStub = installChromeStub();
        failure = await persistSettings(settingsWith({ activeUserId: 'user-1' }));
    });

    afterEach(() => uninstallChromeStub());

    it('should report no failure', () => {
        (failure === null).should.equal(true);
    });

    it('should have written the settings', async () => {
        Object.keys(chromeStub.localStore).should.deep.equal([SETTINGS_KEY]);
        (await getSettings()).activeUserId.should.equal('user-1');
    });
});

describe('when describing a rejection that is not an Error', () => {
    // chrome.storage rejects with runtime.lastError, which is not guaranteed to be an Error instance.
    it('should use a plain string reason as the detail', () => {
        describePersistFailure('QUOTA_BYTES quota exceeded')
            .should.equal('Could not save settings: QUOTA_BYTES quota exceeded');
    });

    it('should fall back to a generic message for an unusable reason', () => {
        describePersistFailure({ code: 42 }).should.equal('Could not save settings.');
    });

    it('should fall back to a generic message for an empty reason', () => {
        describePersistFailure(new Error('   ')).should.equal('Could not save settings.');
    });
});
