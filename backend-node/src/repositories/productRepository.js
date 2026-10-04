import { BaseRepository } from './base.js';
import { generateId } from '../lib/db.js';

const CHILD_TABLES = {
    images: ['product_images', 'url'],
    tags: ['product_tags', 'tag'],
    features: ['product_features', 'feature'],
    badges: ['product_badges', 'badge'],
};

/** Products — backed by `products` + child tables. Mirrors ProductRepository.php. */
export class ProductRepository extends BaseRepository {
    tableName() { return 'products'; }

    async rowToArray(row) {
        const id = row.id;
        const children = {};
        for (const [key, [table, col]] of Object.entries(CHILD_TABLES)) {
            children[key] = await this.fetchChildStrings(table, id, col);
        }
        children.variants = await this.fetchVariants(id);
        return this.applyVariantOverrides({ ...this.scalarFields(row), ...children });
    }

    scalarFields(row) {
        return {
            id: row.id,
            title: row.title,
            price: Number(row.price),
            originalPrice: Number(row.original_price),
            discount: Number(row.discount),
            category: row.category_id,
            rating: Number(row.rating),
            reviewCount: Number(row.review_count),
            description: row.description,
            stock: Number(row.stock),
            isNew: this.bool(row.is_new),
            isBestSeller: this.bool(row.is_best_seller),
            isTrendingPinned: this.bool(row.is_trending_pinned),
            orbitFeatured: this.bool(row.orbit_featured ?? false),
            orbitSortOrder: Number(row.orbit_sort_order ?? 0),
            showTrustBadges: this.bool(row.show_trust_badges),
            isPublished: this.bool(row.is_published),
            codEnabled: this.bool(row.cod_enabled),
            onlinePaymentEnabled: this.bool(row.online_payment_enabled),
            createdAt: this.toIso(row.created_at),
            updatedAt: this.toIso(row.updated_at),
        };
    }

    /** Batches child-table lookups across a whole result set (6 queries total, not 1+5N). */
    async mapRowsBatched(rows) {
        if (!rows.length) return [];

        const ids = rows.map((r) => r.id);
        const childrenByKey = {};
        for (const [key, [table, col]] of Object.entries(CHILD_TABLES)) {
            childrenByKey[key] = await this.fetchChildStringsBatch(table, col, ids);
        }
        const variantsById = await this.fetchVariantsBatch(ids);

        return rows.map((row) => {
            const id = row.id;
            const children = {};
            for (const key of Object.keys(CHILD_TABLES)) children[key] = childrenByKey[key][id] || [];
            children.variants = variantsById[id] || [];
            return this.applyVariantOverrides({ ...this.scalarFields(row), ...children });
        });
    }

    /** Variant-aware price/stock override — same semantics as ProductRepository::applyVariantOverrides(). */
    applyVariantOverrides(product) {
        const variants = product.variants || [];
        if (variants.length === 0) {
            product.hasVariants = false;
            return product;
        }

        const defaultVariant = variants.find((v) => v.isDefault) || variants[0];
        product.hasVariants = true;
        product.price = defaultVariant.price;
        product.originalPrice = defaultVariant.originalPrice;
        product.discount = defaultVariant.discount;
        product.stock = variants.reduce((sum, v) => sum + v.stock, 0);
        return product;
    }

    async fetchChildStringsBatch(table, col, productIds) {
        if (productIds.length === 0) return {};
        const placeholders = productIds.map(() => '?').join(', ');
        const [rows] = await this.pool().query(
            `SELECT product_id, \`${col}\` AS val FROM \`${table}\` WHERE product_id IN (${placeholders}) ORDER BY product_id, sort_order ASC`,
            productIds,
        );
        const grouped = {};
        for (const r of rows) {
            (grouped[r.product_id] ??= []).push(r.val);
        }
        return grouped;
    }

    arrayToRow(data) {
        const map = {
            title: { col: 'title', type: 'string' },
            price: { col: 'price', type: 'float' },
            originalPrice: { col: 'original_price', type: 'float' },
            discount: { col: 'discount', type: 'int' },
            category: { col: 'category_id', type: 'string' },
            rating: { col: 'rating', type: 'float' },
            reviewCount: { col: 'review_count', type: 'int' },
            description: { col: 'description', type: 'string' },
            stock: { col: 'stock', type: 'int' },
            isNew: { col: 'is_new', type: 'bool' },
            isBestSeller: { col: 'is_best_seller', type: 'bool' },
            isTrendingPinned: { col: 'is_trending_pinned', type: 'bool' },
            orbitFeatured: { col: 'orbit_featured', type: 'bool' },
            orbitSortOrder: { col: 'orbit_sort_order', type: 'int' },
            showTrustBadges: { col: 'show_trust_badges', type: 'bool' },
            isPublished: { col: 'is_published', type: 'bool' },
            codEnabled: { col: 'cod_enabled', type: 'bool' },
            onlinePaymentEnabled: { col: 'online_payment_enabled', type: 'bool' },
            createdAt: { col: 'created_at', type: 'datetime' },
            updatedAt: { col: 'updated_at', type: 'datetime' },
        };
        const row = {};
        for (const [key, meta] of Object.entries(map)) {
            if (!(key in data)) continue;
            const v = data[key];
            row[meta.col] = meta.type === 'bool' ? (v ? 1 : 0)
                : meta.type === 'int' ? Number.parseInt(v, 10)
                : meta.type === 'float' ? Number.parseFloat(v)
                : meta.type === 'datetime' ? this.toDbDatetime(v)
                : v;
        }
        return row;
    }

    // ── Variants ─────────────────────────────────────────────────────────

    variantRowToArray(r) {
        return {
            id: r.id,
            label: r.label,
            netQuantity: r.net_quantity,
            image: r.image ?? null,
            price: Number(r.price),
            originalPrice: Number(r.original_price),
            discount: Number(r.discount),
            stock: Number(r.stock),
            sku: r.sku,
            isDefault: this.bool(r.is_default),
        };
    }

    async fetchVariants(productId) {
        const [rows] = await this.pool().query('SELECT * FROM product_variants WHERE product_id = ? ORDER BY sort_order ASC, created_at ASC', [productId]);
        return rows.map((r) => this.variantRowToArray(r));
    }

    async fetchVariantsBatch(productIds) {
        if (productIds.length === 0) return {};
        const placeholders = productIds.map(() => '?').join(', ');
        const [rows] = await this.pool().query(
            `SELECT * FROM product_variants WHERE product_id IN (${placeholders}) ORDER BY product_id, sort_order ASC, created_at ASC`,
            productIds,
        );
        const grouped = {};
        for (const r of rows) {
            (grouped[r.product_id] ??= []).push(this.variantRowToArray(r));
        }
        return grouped;
    }

    async replaceVariants(productId, variants) {
        await this.pool().query('DELETE FROM product_variants WHERE product_id = ?', [productId]);
        if (!variants || variants.length === 0) return;

        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        for (const [i, v] of variants.entries()) {
            const price = Number(v.price || 0);
            const original = Number(v.originalPrice ?? price);
            await this.pool().query(
                `INSERT INTO product_variants (id, product_id, label, net_quantity, image, price, original_price, discount, stock, sku, is_default, sort_order, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    v.id || generateId('variant'),
                    productId,
                    String(v.label || '').trim() || `Variant ${i + 1}`,
                    v.netQuantity !== '' && v.netQuantity !== undefined ? v.netQuantity : null,
                    v.image ? v.image : null,
                    price,
                    original,
                    ProductRepository.calcDiscount(price, original, v.discount !== undefined ? Number(v.discount) : null),
                    Number.parseInt(v.stock ?? 0, 10),
                    v.sku ?? null,
                    v.isDefault ? 1 : 0,
                    i,
                    now,
                    now,
                ],
            );
        }
    }

    async getVariant(productId, variantId) {
        const [rows] = await this.pool().query('SELECT * FROM product_variants WHERE id = ? AND product_id = ? LIMIT 1', [variantId, productId]);
        return rows[0] ? this.variantRowToArray(rows[0]) : null;
    }

    async adjustVariantStock(variantId, delta) {
        const conn = await this.pool().getConnection();
        try {
            await conn.beginTransaction();
            const [rows] = await conn.query('SELECT stock FROM product_variants WHERE id = ? FOR UPDATE', [variantId]);
            if (!rows[0]) { await conn.rollback(); return false; }
            const next = Number(rows[0].stock) + delta;
            if (next < 0) { await conn.rollback(); return false; }
            await conn.query('UPDATE product_variants SET stock = ?, updated_at = ? WHERE id = ?', [next, new Date().toISOString().slice(0, 19).replace('T', ' '), variantId]);
            await conn.commit();
            return true;
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    }

    async fetchChildStrings(table, productId, col) {
        const [rows] = await this.pool().query(`SELECT \`${col}\` AS val FROM \`${table}\` WHERE product_id = ? ORDER BY sort_order ASC`, [productId]);
        return rows.map((r) => r.val);
    }

    async replaceChildStrings(table, productId, col, values) {
        await this.pool().query(`DELETE FROM \`${table}\` WHERE product_id = ?`, [productId]);
        if (!values || values.length === 0) return;
        for (const [i, v] of values.entries()) {
            await this.pool().query(`INSERT INTO \`${table}\` (product_id, \`${col}\`, sort_order) VALUES (?, ?, ?)`, [productId, v, i]);
        }
    }

    async create(data) {
        const row = this.arrayToRow(data);
        row.id = data.id;
        const cols = Object.keys(row);
        await this.pool().query(`INSERT INTO products (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, Object.values(row));

        const id = data.id;
        await this.replaceChildStrings('product_images', id, 'url', data.images || []);
        await this.replaceChildStrings('product_tags', id, 'tag', data.tags || []);
        await this.replaceChildStrings('product_features', id, 'feature', data.features || []);
        await this.replaceChildStrings('product_badges', id, 'badge', data.badges || []);
        if ('variants' in data) await this.replaceVariants(id, data.variants || []);

        return data;
    }

    async update(id, changes) {
        const row = this.arrayToRow(changes);
        if (Object.keys(row).length > 0) {
            const sets = Object.keys(row).map((c) => `\`${c}\` = ?`).join(', ');
            await this.pool().query(`UPDATE products SET ${sets} WHERE id = ?`, [...Object.values(row), id]);
        }

        for (const [phpKey, [table, col]] of Object.entries(CHILD_TABLES)) {
            if (phpKey in changes) await this.replaceChildStrings(table, id, col, changes[phpKey]);
        }
        if ('variants' in changes) await this.replaceVariants(id, changes.variants || []);

        return this.getById(id);
    }

    async getById(id) {
        const [rows] = await this.pool().query('SELECT * FROM products WHERE id = ?', [id]);
        return rows[0] ? this.rowToArray(rows[0]) : null;
    }

    // ── Domain methods ──────────────────────────────────────────────────

    async getPublished() {
        const [rows] = await this.pool().query('SELECT * FROM products WHERE is_published = 1');
        return this.mapRowsBatched(rows);
    }

    async getAdmin() {
        const [rows] = await this.pool().query('SELECT * FROM products');
        return this.mapRowsBatched(rows);
    }

    async getPublicById(id) {
        const [rows] = await this.pool().query('SELECT * FROM products WHERE id = ? AND is_published = 1 LIMIT 1', [id]);
        return rows[0] ? this.rowToArray(rows[0]) : null;
    }

    async getTrending(limit = 12) {
        const [rows] = await this.pool().query(
            `SELECT * FROM products WHERE is_trending_pinned = 1 AND is_published = 1 ORDER BY updated_at DESC LIMIT ${Number.parseInt(limit, 10)}`,
        );
        return this.mapRowsBatched(rows);
    }

    async adjustStock(id, delta) {
        const conn = await this.pool().getConnection();
        try {
            await conn.beginTransaction();
            const [rows] = await conn.query('SELECT stock FROM products WHERE id = ? FOR UPDATE', [id]);
            if (!rows[0]) { await conn.rollback(); return false; }
            const next = Number(rows[0].stock) + delta;
            if (next < 0) { await conn.rollback(); return false; }
            await conn.query('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?', [next, new Date().toISOString().slice(0, 19).replace('T', ' '), id]);
            await conn.commit();
            return true;
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    }

    static calcDiscount(price, originalPrice, manual = null) {
        if (manual !== null && manual !== undefined) return Math.trunc(manual);
        if (originalPrice <= price) return 0;
        return Math.round(((originalPrice - price) / originalPrice) * 100);
    }
}
