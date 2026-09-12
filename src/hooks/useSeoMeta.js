import { useEffect } from 'react';
import { useSiteContent } from '@/contexts/SiteContentContext';

/** Sync document title & meta description from CMS settings. */
export function useSeoMeta() {
    const { content } = useSiteContent();

    useEffect(() => {
        if (content.seo?.title) {
            document.title = content.seo.title;
        }
        const meta = document.querySelector('meta[name="description"]');
        if (meta && content.seo?.description) {
            meta.setAttribute('content', content.seo.description);
        }
    }, [content.seo?.title, content.seo?.description]);
}
