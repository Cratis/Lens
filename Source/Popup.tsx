import { useEffect } from 'react';
import { captureArcContextForActiveTab, saveArcContextSnapshot } from './shared/arc-context';
import { LensPopup } from './LensPopup';

export function Popup() {
    useEffect(() => {
        captureArcContextForActiveTab()
            .then(saveArcContextSnapshot)
            .catch(() => undefined);
    }, []);

    return <LensPopup />;
}
