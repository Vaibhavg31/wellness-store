/**
 * Why customers cancel or return, asked as a short list (plus "Other" with a note) so the shop can see the pattern.
 * The storefront shows the same lists (src/data/orderReasons.js); the server only accepts these ids and keeps the readable label.
 */

export const CANCEL_REASONS = [
    { id: 'ordered_by_mistake', label: 'I ordered by mistake' },
    { id: 'changed_mind', label: 'I changed my mind' },
    { id: 'wrong_product', label: 'I chose the wrong product or pack' },
    { id: 'wrong_address', label: 'Wrong address or contact details' },
    { id: 'better_price', label: 'Found a better price elsewhere' },
    { id: 'delivery_slow', label: 'Delivery is taking too long' },
    { id: 'payment_issue', label: 'There was a problem with payment' },
    { id: 'other', label: 'Other reason' },
];

export const RETURN_REASONS = [
    { id: 'damaged', label: 'Damaged or leaking' },
    { id: 'wrong_item', label: 'Received the wrong product' },
    { id: 'missing_item', label: 'Item missing from the package' },
    { id: 'not_as_described', label: 'Not as described on the website' },
    { id: 'quality', label: 'Quality is not what I expected' },
    { id: 'not_suitable', label: 'Not suitable for me or caused a problem' },
    { id: 'expired', label: 'Expired or very close to expiry' },
    { id: 'other', label: 'Other reason' },
];

/** Customers can cancel until the parcel ships. */
export const CANCELLABLE_STATUSES = ['placed', 'confirmed', 'packed'];
/** Days after delivery within which a return can be asked for. */
export const RETURN_WINDOW_DAYS = 7;

export function reasonLabel(list, id) {
    return list.find((r) => r.id === id)?.label ?? null;
}
