import { isValidPincode } from '@/utils/pincodeLookup';

/**
 * Shared delivery-address validation — used by checkout and saved addresses
 * so both enforce the same rules instead of drifting apart.
 * @returns {{ address?: string, city?: string, state?: string, pincode?: string }}
 */
export function validateDeliveryAddress(form) {
    const errors = {};
    if (!form.address?.trim()) errors.address = 'Street address is required';
    if (!form.city?.trim()) errors.city = 'City is required';
    if (!form.state?.trim()) errors.state = 'State is required';
    if (!isValidPincode(form.pincode)) errors.pincode = 'Enter a valid 6-digit PIN code';
    return errors;
}
