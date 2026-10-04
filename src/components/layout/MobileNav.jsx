import { NavLink } from 'react-router-dom';
import Drawer from '@/components/ui/Drawer';
import Logo from '@/components/ui/Logo';
import { cn } from '@/utils/formatPrice';

export default function MobileNav({ isOpen, onClose, links }) {
    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Menu" side="left">
            <nav aria-label="Mobile navigation" className="flex h-full flex-col">
                <ul className="space-y-1">
                    {links.map((link) => (
                        <li key={link.href}>
                            <NavLink
                                to={link.href}
                                end={link.href === '/'}
                                onClick={onClose}
                                className={({ isActive }) =>
                                    cn(
                                        'block rounded-lg px-4 py-3 font-display text-h4 transition-colors',
                                        isActive ? 'bg-primary-tint text-primary-deep' : 'text-ink hover:bg-primary-soft',
                                    )
                                }
                            >
                                {link.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
                <div className="mt-auto pt-8">
                    <Logo size="md" />
                </div>
            </nav>
        </Drawer>
    );
}
