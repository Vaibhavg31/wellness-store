import { useLocation, useOutlet } from 'react-router-dom';

/** Renders the matched child route with a short fade + small rise on navigation (opacity and transform only). */
export default function PageTransition({ className = '' }) {
    const { pathname } = useLocation();
    const outlet = useOutlet();
    return (
        <div key={pathname} className={`animate-page-in ${className}`}>
            {outlet}
        </div>
    );
}
