import { useState, useCallback, useRef, useEffect } from 'react';

function cloneData(data) {
    return JSON.parse(JSON.stringify(data));
}

export function useAdminDirtySave(data) {
    const [baseline, setBaseline] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const savedTimerRef = useRef(null);

    useEffect(() => () => {
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    }, []);

    const hasChanges = data != null && baseline != null
        && JSON.stringify(data) !== JSON.stringify(baseline);

    const resetBaseline = useCallback((newData) => {
        if (newData != null) setBaseline(cloneData(newData));
    }, []);

    const markSaved = useCallback((newData) => {
        const next = newData ?? data;
        if (next != null) setBaseline(cloneData(next));
        setSaved(true);
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaved(false), 4000);
    }, [data]);

    const clearSaved = useCallback(() => {
        setSaved(false);
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    }, []);

    /**
     * Merges specific top-level keys into the baseline WITHOUT touching the
     * rest — for a field that just saved itself instantly (e.g. a toggle
     * that PUTs immediately rather than waiting for the big Save button).
     * Using resetBaseline for this would wrongly mark every other pending
     * edit as "saved" too, since it replaces the whole baseline with
     * whatever's currently on screen.
     */
    const patchBaseline = useCallback((partial) => {
        setBaseline((prev) => (prev == null ? prev : cloneData({ ...prev, ...partial })));
    }, []);

    return {
        hasChanges,
        saving,
        setSaving,
        saved,
        markSaved,
        clearSaved,
        resetBaseline,
        patchBaseline,
        isReady: baseline != null,
    };
}
