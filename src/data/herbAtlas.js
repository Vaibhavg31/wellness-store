/**
 * "Know your herbs": the plants behind the range. Copy uses traditional-use wording only (no medical claims).
 * `productIds` are looked up in the live catalogue, so names, photos and prices are always real; a missing product
 * is simply left out. `tone` is a design-token background for the herb's panel.
 */
export const HERB_ATLAS = {
    eyebrow: 'Know your herbs',
    title: 'The plants behind every pack',
    description: 'Nothing here is a mystery ingredient. Meet the herbs Ayurveda has trusted for centuries, and the Chikit products they go into.',
    herbs: [
        { id: 'tulsi', name: 'Tulsi', local: 'Holy Basil', latin: 'Ocimum sanctum', tone: 'bg-success-tint', use: 'Grown beside Indian homes for generations and traditionally used to support natural immunity and easy breathing.', productIds: ['ws-immunity-001'] },
        { id: 'amla', name: 'Amla', local: 'Indian Gooseberry', latin: 'Phyllanthus emblica', tone: 'bg-accent-tint', use: 'A small, sour fruit prized for its natural vitamin C, and one of the three fruits of Triphala.', productIds: ['ws-immunity-001', 'ws-triphala-001'] },
        { id: 'giloy', name: 'Giloy', local: 'Guduchi', latin: 'Tinospora cordifolia', tone: 'bg-primary-tint', use: 'A climbing vine known in Ayurveda as “amrita”, traditionally taken to support the body’s natural defences.', productIds: ['ws-immunity-001'] },
        { id: 'aloe', name: 'Aloe Vera', local: 'Ghritkumari', latin: 'Aloe barbadensis', tone: 'bg-success-tint', use: 'The cool gel inside the leaf, traditionally used to soothe the stomach and care for skin from within.', productIds: ['ws-aloevera-juice-001'] },
        { id: 'neem', name: 'Neem', local: 'Nimba', latin: 'Azadirachta indica', tone: 'bg-info-tint', use: 'Ayurveda’s first choice for clear, calm skin, traditionally used to cleanse without stripping.', productIds: ['ws-facewash-001'] },
        { id: 'triphala', name: 'Triphala', local: 'Three fruits', latin: 'Amalaki · Bibhitaki · Haritaki', tone: 'bg-canvas-alt', use: 'A classic blend of three fruits, traditionally taken in the evening to support regular digestion.', productIds: ['ws-triphala-001'] },
        { id: 'moringa', name: 'Moringa', local: 'Shigru', latin: 'Moringa oleifera', tone: 'bg-warning-tint', use: 'The “drumstick tree”, whose leaves are a traditional everyday source of greens and nourishment.', productIds: ['ws-superfood-greens-001'] },
    ],
};
