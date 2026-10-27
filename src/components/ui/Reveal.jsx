import { useEffect, useRef } from 'react';
import { cn } from '@/utils/formatPrice';

/** Fades/slides children in once when scrolled into view (opacity + transform only). */
export default function Reveal({ as: Tag = 'div', delay = 0, className, children, ...props }) {
    const ref = useRef(null);

    useEffect(() => {
        const node = ref.current;
        if (!node) return undefined;
        if (!('IntersectionObserver' in window)) {
            node.classList.add('is-visible');
            return undefined;
        }
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    node.classList.add('is-visible');
                    observer.disconnect();
                }
            },
            { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return (
        <Tag ref={ref} className={cn('reveal', className)} style={{ '--reveal-delay': `${delay}ms` }} {...props}>
            {children}
        </Tag>
    );
}
