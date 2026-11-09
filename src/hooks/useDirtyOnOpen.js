import { useEffect, useState } from 'react';

/**
 * For a form that lives in a side panel: true once the form differs from how it looked when the panel opened.
 * Pass it to <Drawer confirmClose> so a tap outside the panel, Esc or the × asks before throwing the typing away.
 */
export function useDirtyOnOpen(isOpen, value) {
    const [snapshot, setSnapshot] = useState(null);
    useEffect(() => {
        setSnapshot(isOpen ? JSON.stringify(value) : null);
        // Only the moment the panel opens (or closes) counts; later edits are what we compare against it.
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
    return Boolean(isOpen && snapshot !== null && JSON.stringify(value) !== snapshot);
}
