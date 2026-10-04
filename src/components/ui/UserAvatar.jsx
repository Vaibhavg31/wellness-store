import { useState } from 'react';
import { User } from 'lucide-react';
import { cn } from '@/utils/formatPrice';

function initials(name, email) {
    if (name?.trim()) {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return parts[0].slice(0, 2).toUpperCase();
    }
    return email ? email[0].toUpperCase() : '';
}

const SIZES = {
    xs: { box: 'size-5', text: 'text-[9px]', icon: 18 },
    sm: { box: 'size-6', text: 'text-[10px]', icon: 16 },
    md: { box: 'size-8', text: 'text-caption', icon: 18 },
    lg: { box: 'size-14', text: 'text-body', icon: 24 },
};

export default function UserAvatar({ user, size = 'md', className, signedIn = false }) {
    const [imgFailed, setImgFailed] = useState(false);
    const s = SIZES[size] ?? SIZES.md;
    const label = initials(user?.name, user?.email);

    if (user?.avatar && !imgFailed) {
        return (
            <img
                src={user.avatar}
                alt=""
                referrerPolicy="no-referrer"
                className={cn(s.box, 'shrink-0 rounded-full object-cover', className)}
                onError={() => setImgFailed(true)}
            />
        );
    }
    if (signedIn && label) {
        return (
            <span className={cn(s.box, s.text, 'flex shrink-0 items-center justify-center rounded-full bg-primary-tint font-semibold text-primary-deep', className)} aria-hidden="true">
                {label}
            </span>
        );
    }
    return <User size={s.icon} strokeWidth={1.5} className={cn('shrink-0', className)} aria-hidden="true" />;
}
