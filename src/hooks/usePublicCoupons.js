import { useEffect, useState } from 'react';
import { api } from '@/services/api';

let cached = null;

/** Active public coupons (for "Available offers"). Fetched once per page load; failures just mean no offers. */
export function usePublicCoupons() {
    const [coupons, setCoupons] = useState(cached ?? []);
    useEffect(() => {
        if (cached) return undefined;
        let cancelled = false;
        api.get('/api/coupons/public')
            .then((data) => {
                cached = Array.isArray(data) ? data : [];
                if (!cancelled) setCoupons(cached);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);
    return coupons;
}
