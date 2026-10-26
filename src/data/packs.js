/**
 * Look of each product's pack in the "Explore in 3D" section. The key is the product id in the live catalogue (so name,
 * price and photo are always real); this file only says what shape the pack is and what is printed on the label.
 * Products with no entry here (added later in the admin) still work: they fall back to a plain plum jar.
 * Colours are illustration colours for the 3D pack, matching the packshot photos, not UI colours.
 */
export const PACK_KINDS = ['bottle', 'jar', 'tube', 'pouch', 'pump'];

export const PACKS = {
    'ws-aloevera-juice-001': { name: 'Aloe Vera', kind: 'bottle', body: '#8DBB45', cap: '#1F4D2A', accent: '#2F6B3A', sub: 'DIGESTIVE JUICE', note: 'Cold-pressed · with pulp' },
    'ws-immunity-001': { name: 'Immunity', kind: 'bottle', body: '#E39A3B', cap: '#8A4B14', accent: '#B8651A', sub: 'BOOSTER JUICE', note: 'Amla · Giloy · Tulsi' },
    'ws-biotin-001': { name: 'Biotin', kind: 'jar', body: '#F7F3EE', cap: '#B2305A', accent: '#C23F6B', sub: 'HAIR, SKIN & NAILS', note: 'Strawberry gummies · 60 ct' },
    'ws-multivitamin-001': { name: 'Daily Multi', kind: 'jar', body: '#F7F3EE', cap: '#C9962E', accent: '#C9962E', sub: 'VITAMIN GUMMIES', note: 'Orange burst · 60 ct' },
    'ws-fatburner-001': { name: 'Green Coffee', kind: 'jar', body: '#F7F3EE', cap: '#2E5A2C', accent: '#3A7A3A', sub: 'WEIGHT SUPPORT', note: 'Capsules with garcinia' },
    'ws-protein-001': { name: 'Plant Protein', kind: 'jar', body: '#F7F3EE', cap: '#4A1D58', accent: '#602460', sub: 'ISOLATE', note: 'Pea + brown rice · 1 kg' },
    'ws-triphala-001': { name: 'Triphala', kind: 'jar', body: '#F7F3EE', cap: '#4B2A1D', accent: '#7A4A2E', sub: 'DIGESTIVE TABLETS', note: 'Amalaki · Bibhitaki · Haritaki' },
    'ws-facewash-001': { name: 'Neem & Tea Tree', kind: 'tube', body: '#F7F3EE', cap: '#1F6B4F', accent: '#1F6B4F', sub: 'FACE WASH', note: 'Sulphate-free · 100 ml' },
    'ws-superfood-greens-001': { name: 'Daily Greens', kind: 'pouch', body: '#3F7F3E', cap: '#3F7F3E', accent: '#2F6B3A', sub: 'SUPERFOOD BLEND', note: 'Moringa · Spirulina · Wheatgrass' },
    'ws-hairoil-001': { name: 'Onion Black Seed', kind: 'pump', body: '#8A4B1E', cap: '#2A1B14', accent: '#8A4B1E', sub: 'HAIR OIL', note: 'Cold-pressed · 200 ml' },
};

export const FALLBACK_PACK = { kind: 'jar', body: '#F7F3EE', cap: '#602460', accent: '#602460', sub: 'AYURVEDA & WELLNESS', note: 'Lab tested · Clean label' };

/** The look of a product's pack: built-in suggestion, overridden by what the admin set for that product. */
export const packFor = (product, custom = {}) => ({ ...FALLBACK_PACK, name: product.title, ...PACKS[product.id], ...Object.fromEntries(Object.entries(custom[product.id] ?? {}).filter(([, v]) => v)) });
export const hasPack = (product, custom = {}) => Boolean(PACKS[product.id] || custom[product.id]);
