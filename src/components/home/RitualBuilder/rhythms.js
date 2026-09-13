import { Sunrise, Sun, Moon } from 'lucide-react';

/**
 * How a chosen daily rhythm distributes matched products across the three
 * timeline slots. Each entry is a sequence of slot ids consumed in order as
 * candidates are assigned — e.g. an early bird gets both of their first two
 * matches in the morning before anything lands later in the day.
 */
export const RHYTHMS = [
    {
        id: 'early-bird',
        label: 'Early Bird',
        blurb: 'Mornings are when you get things done.',
        icon: Sunrise,
        slotOrder: ['morning', 'morning', 'midday', 'evening'],
    },
    {
        id: 'balanced',
        label: 'Balanced',
        blurb: 'Spread it out, little and often.',
        icon: Sun,
        slotOrder: ['morning', 'midday', 'evening', 'morning'],
    },
    {
        id: 'night-owl',
        label: 'Night Owl',
        blurb: 'Your day really starts in the afternoon.',
        icon: Moon,
        slotOrder: ['evening', 'evening', 'midday', 'morning'],
    },
];

export const SLOTS = [
    { id: 'morning', label: 'Morning' },
    { id: 'midday', label: 'Midday' },
    { id: 'evening', label: 'Evening' },
];

/** Buckets ranked candidates into the three timeline slots per the chosen rhythm. */
export function buildTimeline(candidates, rhythmId) {
    const rhythm = RHYTHMS.find((r) => r.id === rhythmId) ?? RHYTHMS[1];
    const buckets = { morning: [], midday: [], evening: [] };

    candidates.forEach((entry, i) => {
        const slot = rhythm.slotOrder[i % rhythm.slotOrder.length];
        buckets[slot].push(entry);
    });

    return SLOTS.map((slot) => ({ ...slot, items: buckets[slot.id] }));
}
