import { useState } from 'react';
import { User } from 'lucide-react';

function initials(name, email) {
    if (name?.trim()) {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return parts[0].slice(0, 2).toUpperCase();
    }
    if (email) return email[0].toUpperCase();
    return '';
}

const SIZE = {
    xs: { box: 'size-[18px]', text: 'text-[7px]', icon: 18 },
    sm: { box: 'w-5 h-5', text: 'text-[8px]', icon: 16 },
    md: { box: 'w-8 h-8', text: 'text-xs', icon: 18 },
    lg: { box: 'w-14 h-14', text: 'text-base', icon: 24 },
};

export default function UserAvatar({ user, size = 'md', className = '', signedIn = false }) {
    const [imgFailed, setImgFailed] = useState(false);
    const s = SIZE[size] ?? SIZE.md;
    const label = initials(user?.name, user?.email);

    if (user?.avatar && !imgFailed) {
        return (
            <img
                src={user.avatar}
                alt=""
                referrerPolicy="no-referrer"
                className={`${s.box} rounded-full object-cover ring-1 ring-turmeric-light/40 flex-shrink-0 ${className}`}
                onError={() => setImgFailed(true)}
            />
        );
    }

    if (signedIn && label) {
        return (
            <span
                className={`${s.box} ${s.text} rounded-full bg-turmeric-light/25 text-forest font-semibold flex items-center justify-center ring-1 ring-turmeric-light/40 flex-shrink-0 ${className}`}
                aria-hidden="true"
            >
                {label}
            </span>
        );
    }

    return <User size={s.icon} strokeWidth={1.25} className={`flex-shrink-0 ${className}`} />;
}
