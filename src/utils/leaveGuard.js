/**
 * Guards against losing unsaved edits on the browser's Back/Forward buttons.
 *
 * The router reacts to Back by showing the previous page at once, which unmounts the form before any listener the form
 * adds could ask. So this one listener is installed when the app first loads (this module is imported by App.jsx, before
 * the router starts listening): it runs first, asks while a form with unsaved edits is open, and on "Cancel" stops the
 * router from ever hearing about it and puts the address back.
 */
const guards = new Set();

export function addLeaveGuard(guard) {
    guards.add(guard);
    return () => guards.delete(guard);
}

if (typeof window !== 'undefined') {
    window.addEventListener('popstate', (event) => {
        const active = [...guards].find((g) => g.isDirty());
        if (!active) return;
        if (window.confirm(active.message)) return;
        event.stopImmediatePropagation();
        window.history.pushState(active.state, '', active.href);
    }, true);
}
