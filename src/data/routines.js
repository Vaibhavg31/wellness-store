/**
 * "Build your routine": goal-led routines of three steps. `productId` is looked up in the live catalogue, so names,
 * photos and prices are always real; a step whose product is missing or out of stock is left out, and a goal with fewer
 * than two steps left is hidden. Copy uses traditional-use wording only (no medical claims).
 */
export const ROUTINES = {
    eyebrow: 'Build your routine',
    title: 'Pick a goal, get a simple routine',
    description: 'Small, steady habits work better than big promises. Choose what you want to improve and add the whole routine in one tap.',
    goals: [
        {
            id: 'immunity', label: 'Immunity', summary: 'A daily shield for the seasons that test you.',
            steps: [
                { when: 'Morning', productId: 'ws-immunity-001', why: 'Giloy, amla and tulsi in one daily shot, before breakfast.' },
                { when: 'With lunch', productId: 'ws-superfood-greens-001', why: 'Moringa, spirulina and wheatgrass stirred into a meal.' },
                { when: 'Evening', productId: 'ws-multivitamin-001', why: '13 vitamins and minerals in a tasty gummy, no gelatin.' },
            ],
        },
        {
            id: 'digestion', label: 'Digestion', summary: 'Start gently, finish calmly.',
            steps: [
                { when: 'Morning', productId: 'ws-aloevera-juice-001', why: 'A cool glass of aloe before anything else.' },
                { when: 'With lunch', productId: 'ws-superfood-greens-001', why: 'Everyday greens to fill nutrition gaps.' },
                { when: 'Evening', productId: 'ws-triphala-001', why: 'The classic evening companion for regular digestion.' },
            ],
        },
        {
            id: 'skin-hair', label: 'Skin & hair', summary: 'Care from the outside and from within.',
            steps: [
                { when: 'Morning', productId: 'ws-facewash-001', why: 'Neem and tea tree to clear the day’s start, gently.' },
                { when: 'Daily', productId: 'ws-biotin-001', why: 'Biotin with zinc and vitamin E for hair, skin and nails.' },
                { when: 'Night', productId: 'ws-hairoil-001', why: 'A warm onion and black seed oil massage into the scalp.' },
            ],
        },
        {
            id: 'fitness', label: 'Energy & fitness', summary: 'Fuel the work, support the recovery.',
            steps: [
                { when: 'Morning', productId: 'ws-fatburner-001', why: 'Green coffee capsules to support metabolism.' },
                { when: 'Post-workout', productId: 'ws-protein-001', why: '24 g plant protein with zero added sugar.' },
                { when: 'Evening', productId: 'ws-superfood-greens-001', why: 'Greens to round off the day’s nutrition.' },
            ],
        },
    ],
};
