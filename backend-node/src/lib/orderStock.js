import { HttpError } from './response.js';
import { ProductRepository } from '../repositories/productRepository.js';

/** Taking stock off the shelf for an order and putting it back, shared by website, admin and partner API orders. */
const products = new ProductRepository();

export async function adjustItemStock(item, delta) {
    const variantId = String(item.variantId || '');
    if (variantId) return products.adjustVariantStock(variantId, delta);
    return products.adjustStock(String(item.productId || ''), delta);
}

export async function restoreStockItems(items) {
    for (const item of items) await adjustItemStock(item, Number(item.quantity));
}

/** All or nothing: if one line can no longer be taken, the lines already taken are put back and a 400 is thrown. */
export async function decrementStock(items) {
    const done = [];
    for (const item of items) {
        const ok = await adjustItemStock(item, -Number(item.quantity));
        if (!ok) {
            await restoreStockItems(done);
            throw new HttpError('Stock changed while placing order. Please refresh and try again.', 400, 'out_of_stock');
        }
        done.push(item);
    }
}
