const CATEGORY_MAP = {
    earrings: 'earrings',
    earring: 'earrings',
    necklace: 'necklace',
    necklaces: 'necklace',
    pendant: 'necklace',
    ring: 'ring',
    rings: 'ring',
    bracelet: 'bracelet',
    bracelets: 'bracelet',
    bangle: 'bracelet',
    bangles: 'bracelet',
    anklet: 'bracelet',
};

export function resolveJewelryType(category) {
    const key = (category || '').toLowerCase().trim();
    return CATEGORY_MAP[key] || 'necklace';
}

export const JEWELRY_LAYOUT = {
    earrings: {
        planeScale: 0.95,
        tilt: [0.15, 0, 0],
        position: [0, 0.05, 0],
        pedestal: 'dual',
    },
    necklace: {
        planeScale: 1.15,
        tilt: [0.08, 0, 0],
        position: [0, 0, 0],
        pedestal: 'arc',
    },
    ring: {
        planeScale: 0.75,
        tilt: [0.35, 0, 0],
        position: [0, 0.15, 0],
        pedestal: 'ring',
    },
    bracelet: {
        planeScale: 1.05,
        tilt: [0.2, 0, 0],
        position: [0, 0.08, 0],
        pedestal: 'band',
    },
};
