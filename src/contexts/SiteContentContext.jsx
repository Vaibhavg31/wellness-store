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
            // Sections added in a newer release may be missing from an older saved list (or an older API): slot each
            // in right after the default section that precedes it, enabled.
            const ordered = Object.keys(raw.sections);
            const defaults = Object.keys(DEFAULT_SITE_CONTENT.sections);
            const sections = { ...raw.sections };
            defaults.forEach((key, i) => {
                if (key in sections) return;
                let at = 0;
                for (let j = i - 1; j >= 0; j -= 1) {
                    const found = ordered.indexOf(defaults[j]);
                    if (found !== -1) { at = found + 1; break; }
                }
                ordered.splice(at, 0, key);
                sections[key] = DEFAULT_SITE_CONTENT.sections[key];
            });
            merged.sections = Object.fromEntries(ordered.map((key) => [key, sections[key]]));
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
