import { useCallback, useRef } from 'react';

/**
 * Wraps an async handler (a save, a create, an order) so that a second call made while the first is still running is ignored.
 * A `saving` state flag alone is not enough: it only changes after the next render, so a quick double click or a double tap on a
 * slow phone could run the handler twice and create the record twice.
 */
export function useSingleFlight(handler) {
    const busy = useRef(false);
    return useCallback(async (...args) => {
        if (busy.current) {
            // A repeated submit event must still be cancelled, or the browser submits the form natively (a page reload to "?").
            if (args[0] && typeof args[0].preventDefault === 'function') args[0].preventDefault();
            return undefined;
        }
        busy.current = true;
        try {
            return await handler(...args);
        } finally {
            busy.current = false;
        }
    }, [handler]);
}
