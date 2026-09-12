import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
import { DEFAULT_SITE_CONTENT } from '@/data/defaultContent';
import { deepMerge } from '@/utils/deepMerge';

const SiteContentContext = createContext({
    content: DEFAULT_SITE_CONTENT,
    loading: true,
    refetch: () => {},
});

export function SiteContentProvider({ children }) {
    const [raw, setRaw] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchContent = useCallback(() => {
        setLoading(true);
        api
            .get('/api/settings')
            .then((data) => setRaw(data))
            .catch(() => setRaw(null))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    const content = useMemo(() => {
        const merged = deepMerge(DEFAULT_SITE_CONTENT, raw ?? {});
        // 'sections' key order is the admin-defined homepage render order (see
        // backend SettingsRepository::fetchSections) — deepMerge would otherwise
        // fall back to DEFAULT_SITE_CONTENT's fixed key order, so keep the API's order.
        if (raw?.sections) {
            merged.sections = raw.sections;
        }
        return merged;
    }, [raw]);

    const value = useMemo(
        () => ({ content, loading, refetch: fetchContent }),
        [content, loading, fetchContent],
    );

    return (
        <SiteContentContext.Provider value={value}>
            {children}
        </SiteContentContext.Provider>
    );
}

export function useSiteContent() {
    return useContext(SiteContentContext);
}
