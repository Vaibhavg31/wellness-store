/**
 * "Your day, ritualised": four moments of an Ayurvedic day, each paired with one product. `productId` is looked up in
 * the live catalogue (a stage whose product is missing or sold out is skipped), so prices and stock are always real.
 * `tone: 'deep'` is the night stage: the only dark one.
 */
export const DAY_RITUAL = {
    eyebrow: 'A day with Chikit',
    title: 'Your daily ritual, hour by hour',
    description: 'Small, steady habits work better than big promises. Scroll through one calm day and see where each product belongs.',
    cta: 'Add the full ritual to bag',
    stages: [
        { id: 'morning', label: 'Morning', time: '7:00 AM', title: 'Wake the gut gently', copy: 'A cool glass of aloe before anything else. It settles the stomach and sets the pace for the day.', productId: 'ws-aloevera-juice-001', tone: 'light', bg: 'bg-accent-tint' },
        { id: 'midday', label: 'Midday', time: '1:00 PM', title: 'Steady, unhurried energy', copy: 'Greens, moringa and wheatgrass stirred into lunch. Good fuel without the afternoon slump.', productId: 'ws-superfood-greens-001', tone: 'light', bg: 'bg-canvas-alt' },
        { id: 'evening', label: 'Evening', time: '7:30 PM', title: 'Let dinner digest well', copy: 'Triphala is the classic evening companion: gentle on digestion and a quiet reset after a long day.', productId: 'ws-triphala-001', tone: 'light', bg: 'bg-primary-tint' },
        { id: 'night', label: 'Night', time: '10:00 PM', title: 'Care that works while you sleep', copy: 'A warm oil massage into the scalp, left overnight. Slow, simple and something to look forward to.', productId: 'ws-hairoil-001', tone: 'deep', bg: 'bg-primary-deep' },
    ],
};
