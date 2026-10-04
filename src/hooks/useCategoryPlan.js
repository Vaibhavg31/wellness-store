import { useMemo } from 'react';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useCategories } from '@/hooks/useApi';

/**
 * The categories the storefront features, in order — used by BOTH the top bar and the homepage shelves so they
 * always agree. The public categories API already returns only published categories that have products, sorted by
 * the admin's order, so an empty category never appears. In "custom" mode the admin's own list (and order) is used.
 * Returns [{ slug, label, image, subtitle }].
 */
export function useCategoryPlan() {
    const { content } = useSiteContent();
    const { categories, loading } = useCategories();
    const { mode, items } = content.extras.shelves;

    const plan = useMemo(() => {
        const bySlug = new Map(categories.map((c) => [c.slug, c]));
        const source = mode === 'custom' && items.length > 0
            ? items.map((item) => ({ slug: item.categorySlug, subtitle: item.subtitle }))
            : categories.map((c) => ({ slug: c.slug, subtitle: '' }));
        return source
            .filter(({ slug }) => bySlug.has(slug))
            .map(({ slug, subtitle }) => ({ slug, subtitle, label: bySlug.get(slug).label, image: bySlug.get(slug).image }));
    }, [categories, mode, items]);

    return { plan, loading };
}
