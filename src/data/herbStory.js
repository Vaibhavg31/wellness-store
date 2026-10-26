/**
 * "From herb to pack": the homepage's particle scroll story. Chapter order matches the particle shapes in
 * `components/home/herbStory/shapes.js` (seed dust, tulsi, amla, aloe, neem, the pack). `productIds` are looked up in
 * the live catalogue, so names, prices and links are always real; a missing product is simply left out.
 * Herb copy stays with traditional-use wording (no medical claims).
 */
export const HERB_STORY = {
    chapters: [
        { id: 'intro', eyebrow: 'Inside every Chikit pack', title: 'From the herb garden to your shelf', copy: 'Every Chikit formula begins with a plant Ayurveda has trusted for centuries. Keep scrolling and watch them grow, one by one.' },
        { id: 'tulsi', name: 'Tulsi', local: 'Holy Basil', latin: 'Ocimum sanctum', title: 'The queen of herbs', copy: 'Grown beside Indian homes for generations, tulsi is traditionally used to support natural immunity and easy breathing.', productIds: ['ws-immunity-001'] },
        { id: 'amla', name: 'Amla', local: 'Indian Gooseberry', latin: 'Phyllanthus emblica', title: 'Vitamin C, the old way', copy: 'A small, sour fruit prized for its natural vitamin C. Amla is one of the three fruits of Triphala and a staple of everyday immunity care.', productIds: ['ws-immunity-001', 'ws-triphala-001'] },
        { id: 'aloe', name: 'Aloe Vera', local: 'Ghritkumari', latin: 'Aloe barbadensis', title: 'Cool, calm digestion', copy: 'The gel inside the leaf is cold-extracted to stay fresh. Ayurveda has long used it to soothe the stomach and care for skin from within.', productIds: ['ws-aloevera-juice-001'] },
        { id: 'neem', name: 'Neem', local: 'Nimba', latin: 'Azadirachta indica', title: 'Nature’s clarifier', copy: 'Ayurveda’s first choice for clear, calm skin. We pair neem with tea tree oil in a gentle, sulphate-free wash.', productIds: ['ws-facewash-001'] },
        { id: 'pack', eyebrow: 'Then, into the pack', title: 'Nothing hidden. Nothing extra.', copy: 'Every batch is lab tested for purity, and every ingredient is on the label. That is the whole recipe.', cta: { label: 'Shop the range', href: '/shop' }, secondary: { label: 'Read our story', href: '/about' } },
    ],
    /* particle colours, one per shape, as illustration colours on the deep plum stage (not UI colours) */
    palette: {
        stages: ['#E8B96C', '#86BF7E', '#CCD67C', '#93CDA0', '#72B27A', '#F2C987'],
        spark: '#FFF3DA',
    },
};
