import { UserRepository } from '../repositories/userRepository.js';
import { validateAddress, normalizeAddress } from './addressHelper.js';

/** Saved address book — max 3 per user, tracks last-used for checkout prefill. Mirrors AddressBookHelper.php. */
export const MAX_ADDRESSES = 3;

export async function syncFromCheckout(userId, shipping, addressBook) {
    const repo = new UserRepository();
    const user = await repo.getById(userId);
    if (!user) return;

    const addresses = user.addresses || [];
    const selectedId = String(addressBook.selectedId || '').trim();

    if (selectedId) {
        if (addresses.some((addr) => addr.id === selectedId)) {
            await repo.setLastUsedAddress(userId, selectedId);
            return;
        }
    }

    let street = String(addressBook.address || '').trim();
    if (!street) street = String(shipping.address || '').trim();

    const payload = {
        label: 'Home',
        name: String(shipping.name || '').trim(),
        phone: String(shipping.phone || '').trim(),
        address: street,
        landmark: String(addressBook.landmark ?? shipping.landmark ?? '').trim(),
        city: String(shipping.city || '').trim(),
        state: String(shipping.state || '').trim(),
        pincode: String(shipping.pincode || '').trim(),
    };

    const normalized = normalizeAddress(payload);
    if (Object.keys(validateAddress(normalized)).length > 0) return;

    const matchId = findMatchingId(addresses, normalized);

    if (matchId !== null) {
        await repo.setLastUsedAddress(userId, matchId);
    } else if (addresses.length < MAX_ADDRESSES) {
        const newAddr = await repo.addAddress(userId, { ...normalized, isDefault: addresses.length === 0 });
        await repo.setLastUsedAddress(userId, String(newAddr.id || ''));
    }
}

export async function setLastUsed(userId, addressId) {
    const repo = new UserRepository();
    const user = await repo.getById(userId);
    if (!user) return;
    if ((user.addresses || []).some((addr) => addr.id === addressId)) {
        await repo.setLastUsedAddress(userId, addressId);
    }
}

export function findMatchingId(addresses, normalized) {
    for (const addr of addresses) {
        if (isSameLocation(addr, normalized)) {
            const id = String(addr.id || '');
            return id || null;
        }
    }
    return null;
}

export function isSameLocation(a, b) {
    const pinA = String(a.pincode || '').replace(/\D/g, '');
    const pinB = String(b.pincode || '').replace(/\D/g, '');
    return pinA === pinB
        && normText(a.city) === normText(b.city)
        && normText(a.state) === normText(b.state)
        && normText(a.address) === normText(b.address);
}

function normText(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}
