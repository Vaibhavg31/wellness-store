import { HeartPulse, Sprout, Bone, Dumbbell, Zap } from 'lucide-react';

/**
 * The five zones the Body Map walks through. Each points at a goal id from
 * `wellnessRituals` — the matching product is resolved at render time from
 * the live catalog rather than hardcoded here — and a `glowZone` key that
 * tells BodyFigure which anatomical highlight to bring up.
 */
export const ZONES = [
    {
        id: 'heart',
        goalId: 'heart',
        glowZone: 'chest',
        title: 'Heart Health',
        icon: HeartPulse,
        copy: "Circulation is the delivery system for everything else in the body — support it and every other system works better.",
    },
    {
        id: 'gut',
        goalId: 'gut',
        glowZone: 'core',
        title: 'Gut Health',
        icon: Sprout,
        copy: "Digestion isn't background noise. It's the gatekeeper deciding whether nutrients from anything else you take even get absorbed.",
    },
    {
        id: 'joints',
        goalId: 'joints',
        glowZone: 'legs',
        title: 'Joint Mobility',
        icon: Bone,
        copy: "Cartilage doesn't repair itself overnight. Consistent support here is what keeps movement easy later, not just today.",
    },
    {
        id: 'muscle',
        goalId: 'strength',
        glowZone: 'arms',
        title: 'Muscle Recovery',
        icon: Dumbbell,
        copy: "Training breaks muscle down — recovery is where it actually rebuilds stronger. Skip this and the effort in the gym is half-wasted.",
    },
    {
        id: 'energy',
        goalId: 'energy',
        glowZone: 'head',
        title: 'Energy',
        icon: Zap,
        copy: "The baseline everything else draws from. When this runs low, focus, mood, and workouts all quietly underperform too.",
    },
];

/** Anatomical placement (percent of the figure's bounding box) for each glow zone. */
export const GLOW_POSITIONS = {
    head: { top: '2%', left: '50%', width: 90, height: 90 },
    chest: { top: '22%', left: '50%', width: 130, height: 110 },
    core: { top: '42%', left: '50%', width: 120, height: 100 },
    arms: { top: '32%', left: '50%', width: 210, height: 130 },
    legs: { top: '68%', left: '50%', width: 150, height: 140 },
};
