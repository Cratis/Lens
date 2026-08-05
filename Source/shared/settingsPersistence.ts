import { saveSettings } from './storage';
import { ExtensionSettings } from './types';

function detailOf(reason: unknown): string {
    if (reason instanceof Error) {
        return reason.message;
    }

    if (typeof reason === 'string') {
        return reason;
    }

    return '';
}

/**
 * Describe a rejected settings write in terms the user can act on.
 * @param reason The rejection value, which is not guaranteed to be an Error.
 * @returns A message suitable for display.
 */
export function describePersistFailure(reason: unknown): string {
    const detail = detailOf(reason).trim();
    return detail ? `Could not save settings: ${detail}` : 'Could not save settings.';
}

/**
 * Persist settings, reporting a rejected write rather than throwing it.
 *
 * Every caller renders the new settings into React state before persisting, so a write that fails
 * silently looks exactly like one that succeeded -- until the popup is reopened and the roster is gone.
 * That is the state that made the storage quota bug undiagnosable, so the failure has to reach the user.
 * Returning it instead of rejecting keeps a single try/catch here rather than one per call site, and
 * stops a rejection escaping the click handlers, which call these paths as `void refresh...()`.
 *
 * @param settings The settings to persist.
 * @returns Null when the write succeeded, otherwise a message describing why it did not.
 */
export async function persistSettings(settings: ExtensionSettings): Promise<string | null> {
    try {
        await saveSettings(settings);
        return null;
    } catch (error) {
        console.error('[Lens][Settings] Persisting settings failed', error);
        return describePersistFailure(error);
    }
}
