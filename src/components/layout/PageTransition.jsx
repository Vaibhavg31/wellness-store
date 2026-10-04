import { useLocation, useOutlet } from 'react-router-dom';

/** Renders the matched child route with a short fade-in on navigation (opacity only). */
export default function PageTransition({ className = '' }) {
    const { pathname } = useLocation();
    const outlet = useOutlet();
    return (
        <div key={pathname} className={`animate-fade-in ${className}`}>
            {outlet}
        </div>
    );
}
