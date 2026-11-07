import { useEffect, useRef } from 'react';
import { addLeaveGuard } from '@/utils/leaveGuard';

const MESSAGE = 'You have changes that are not saved. Leave this page and lose them?';

/**
 * While `dirty` is true, leaving the page asks first:
 *  - closing the tab, refreshing or typing a new address: the browser's own "Leave site?" prompt;
 *  - clicking a link inside the app (the admin menu, a breadcrumb, a "Back" button that is a link): a confirm box;
 *  - the browser's Back button: a confirm box (via utils/leaveGuard), and the page stays if the answer is no.
 * (The app uses a plain BrowserRouter, so React Router's own blocker is not available.)
 */
export function useUnsavedChangesWarning(dirty, message = MESSAGE) {
    const dirtyRef = useRef(dirty);
    dirtyRef.current = dirty;

    useEffect(() => {
        const onBeforeUnload = (event) => {
            if (!dirtyRef.current) return undefined;
            event.preventDefault();
            event.returnValue = message; // older browsers need a value; the text itself is not shown
            return message;
        };
        // Capture phase: runs before React Router's own click handler on <Link>.
        const onClick = (event) => {
            if (!dirtyRef.current || event.defaultPrevented || event.button !== 0) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; // opens a new tab: nothing is lost
            const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
            if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
            const url = new URL(link.href, window.location.href);
            if (url.origin !== window.location.origin) return;
            if (url.pathname === window.location.pathname && url.search === window.location.search) return; // same page (a #section link)
            if (!window.confirm(message)) {
                event.preventDefault();
                event.stopPropagation();
            }
        };
        // Back/Forward: handled by the app-wide guard (see utils/leaveGuard), which runs before the router.
        const removeGuard = addLeaveGuard({ isDirty: () => dirtyRef.current, message, href: window.location.href, state: window.history.state });
        window.addEventListener('beforeunload', onBeforeUnload);
        document.addEventListener('click', onClick, true);
        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload);
            document.removeEventListener('click', onClick, true);
            removeGuard();
        };
    }, [message]);
}
