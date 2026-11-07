/**
 * One page-scroll lock shared by every modal, drawer and sheet. Each open surface takes a lock and gives it back when it
 * closes; the page only scrolls again when the last one is gone. (Each surface used to remember and restore the body's
 * overflow itself, so closing two stacked surfaces in the "wrong" order could leave the page stuck without a scrollbar.)
 * While locked, the scrollbar's width is kept as padding so the page behind does not jump sideways on desktop.
 */
let locks = 0;
let saved = null;

export function lockScroll() {
    locks += 1;
    if (locks > 1 || typeof document === 'undefined') return;
    const { body, documentElement } = document;
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    documentElement.style.setProperty('--scrollbar-comp', `${scrollbar}px`);
}

export function unlockScroll() {
    if (locks === 0) return;
    locks -= 1;
    if (locks > 0 || typeof document === 'undefined') return;
    document.body.style.overflow = saved?.overflow ?? '';
    document.body.style.paddingRight = saved?.paddingRight ?? '';
    document.documentElement.style.removeProperty('--scrollbar-comp');
    saved = null;
}
