import { Sunrise, Dumbbell, BrainCircuit, Salad, MoonStar } from 'lucide-react';

/**
 * The five moments of a day this section walks through. Each stage points
 * at a goal id from `wellnessRituals` — the matching product is resolved at
 * render time from the live catalog rather than hardcoded here, so this
 * stays correct as products change.
 */
export const STAGES = [
    {
        id: 'wake',
        hour: 6,
        time: '6:00 AM',
        title: 'Rise & Prime',
        goalId: 'immunity',
        icon: Sunrise,
        copy: "Sunlight alone rarely covers it. A dose here sets the day's immune baseline before anything else competes for your attention.",
        glow: 'head',
    },
    {
        id: 'fuel',
        hour: 8.5,
        time: '8:30 AM',
        title: 'Fuel The Engine',
        goalId: 'strength',
        icon: Dumbbell,
        copy: "Muscle repair doesn't wait for a gym slot. Protein at the first meal keeps yesterday's recovery on schedule.",
        glow: 'chest',
    },
    {
        id: 'dip',
        hour: 13,
        time: '1:00 PM',
        title: 'The Midday Dip',
        goalId: 'energy',
        icon: BrainCircuit,
        copy: 'Cortisol peaks, focus cracks. This is exactly where an adaptogen is doing its quietest, most useful work.',
        glow: 'head',
    },
    {
        id: 'gut',
        hour: 16.5,
        time: '4:30 PM',
        title: 'Gut Check',
        goalId: 'gut',
        icon: Salad,
        copy: "What you ate at lunch is still being processed. Fibre now is doing more than a snack ever could.",
        glow: 'core',
    },
    {
        id: 'wind',
        hour: 21.5,
        time: '9:30 PM',
        title: 'Wind Down',
        goalId: 'sleep',
        icon: MoonStar,
        copy: 'Repair happens while you sleep, not while you scroll. This is the last input before the body takes over.',
        glow: 'head',
    },
];

/** Clock-face angle (degrees, 0 = 12 o'clock, clockwise) for an hour value. */
export function hourToAngle(hour) {
    return (hour / 24) * 360;
}

/** Shortest-path angle interpolation so the marker never sweeps the long way round. */
export function lerpAngle(a, b, t) {
    let diff = ((b - a + 540) % 360) - 180;
    return a + diff * t;
}
