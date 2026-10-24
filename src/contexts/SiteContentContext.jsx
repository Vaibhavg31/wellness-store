import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
import { DEFAULT_SITE_CONTENT } from '@/data/defaultContent';
import { deepMerge } from '@/utils/deepMerge';

const SiteContentContext = createContext({
    content: DEFAULT_SITE_CONTENT,
    loading: true,
    refetch: () => {},
});

const CACHE_KEY = 'chikit-site-content-v1';
const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; } };

export function SiteContentProvider({ children }) {
    // Start from the last copy we saw (refreshed below), so returning visitors never see placeholder text flip to the real text.
    const [raw, setRaw] = useState(readCache);
    const [loading, setLoading] = useState(true);

    const fetchContent = useCallback(() => {
        setLoading(true);
        api
            .get('/api/settings')
            .then((data) => { setRaw(data); try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* storage full or blocked */ } })
            .catch(() => { /* keep whatever we already have (cached or defaults) */ })
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
