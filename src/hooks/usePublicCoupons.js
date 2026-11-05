import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const cache = new Map(); // by sign-in state: the list differs once a customer has used a coupon

/** Active public coupons (for "Available offers"), without the ones this shopper can no longer use. Fetched once per sign-in state; failures just mean no offers. */
export function usePublicCoupons() {
    const { token } = useAuth();
    const key = token || 'guest';
    const [coupons, setCoupons] = useState(cache.get(key) ?? []);
    useEffect(() => {
        if (cache.has(key)) { setCoupons(cache.get(key)); return undefined; }
        let cancelled = false;
        api.get('/api/coupons/public')
            .then((data) => {
                const list = Array.isArray(data) ? data : [];
                cache.set(key, list);
                if (!cancelled) setCoupons(list);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [key]);
    return coupons;
}
