import { BaseRepository } from './base.js';
import { ProductRepository } from './productRepository.js';

/** Bundles — `bundles` + `bundle_items`, with price always computed live from current product prices. Mirrors BundleRepository.php. */
export class BundleRepository extends BaseRepository {
    tableName() { return 'bundles'; }

    products() {
        this._products ??= new ProductRepository();
        return this._products;
    }

    scalarFields(row) {
        return {
            id: row.id,
            title: row.title,
            subtitle: row.subtitle,
            description: row.description,
            image: row.image,
            discountType: row.discount_type,
            discountValue: Number(row.discount_value),
            isPublished: this.bool(row.is_published),
            sortOrder: Number(row.sort_order),
            createdAt: this.toIso(row.created_at),
            updatedAt: this.toIso(row.updated_at),
        };
    }

    async rowToArray(row) {
        return this.hydrate(this.scalarFields(row), false);
    }

    /** Attach items (with product snapshot) + computed pricing. publishedItemsOnly drops unpublished/deleted products. */
    async hydrate(bundle, publishedItemsOnly) {
        const [rows] = await this.pool().query('SELECT * FROM bundle_items WHERE bundle_id = ? ORDER BY sort_order ASC', [bundle.id]);

        const productRepo = this.products();
        const items = [];
        let subtotal = 0;
        for (const r of rows) {
            const product = publishedItemsOnly ? await productRepo.getPublicById(r.product_id) : await productRepo.getById(r.product_id);
            if (!product) continue;
            if (publishedItemsOnly && product.isPublished === false) continue;

            const qty = Number(r.quantity);
            items.push({
                productId: r.product_id,
                quantity: qty,
                product: {
                    id: product.id, title: product.title, image: product.images[0] ?? null,
                    price: product.price, originalPrice: product.originalPrice, stock: product.stock, isPublished: product.isPublished,
                },
            });
            subtotal += product.price * qty;
        }

        bundle.items = items;
        bundle.pricing = BundleRepository.computePricing(subtotal, bundle.discountType, bundle.discountValue);
        return bundle;
    }

    static computePricing(subtotal, discountType, discountValue) {
        subtotal = Math.round(subtotal * 100) / 100;
        let discountAmount = discountType === 'flat'
            ? Math.min(discountValue, subtotal)
            : Math.round((subtotal * Math.max(0, Math.min(100, discountValue)) / 100) * 100) / 100;
        discountAmount = Math.max(0, Math.round(discountAmount * 100) / 100);
        const bundlePrice = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);
        const savingsPercent = subtotal > 0 ? Math.round((discountAmount / subtotal) * 100) : 0;
        return { subtotal, discountAmount, bundlePrice, savingsPercent };
    }

    arrayToRow(data) {
        const map = {
            title: { col: 'title', type: 'string' },
            subtitle: { col: 'subtitle', type: 'nullableString' },
            description: { col: 'description', type: 'nullableString' },
            image: { col: 'image', type: 'nullableString' },
            discountType: { col: 'discount_type', type: 'string' },
            discountValue: { col: 'discount_value', type: 'float' },
            isPublished: { col: 'is_published', type: 'bool' },
            sortOrder: { col: 'sort_order', type: 'int' },
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
                : meta.type === 'nullableString' ? (v === null || v === '' ? null : String(v))
                : meta.type === 'datetime' ? this.toDbDatetime(v)
                : v;
        }
        return row;
    }

    async replaceItems(bundleId, items) {
        await this.pool().query('DELETE FROM bundle_items WHERE bundle_id = ?', [bundleId]);
        if (!items || items.length === 0) return;
        for (const [i, item] of items.entries()) {
            const productId = String(item.productId || '').trim();
            if (!productId) continue;
            await this.pool().query(
                'INSERT INTO bundle_items (bundle_id, product_id, quantity, sort_order) VALUES (?, ?, ?, ?)',
                [bundleId, productId, Math.max(1, Number.parseInt(item.quantity ?? 1, 10)), i],
            );
        }
    }

    async create(data) {
        const row = this.arrayToRow(data);
        row.id = data.id;
        const cols = Object.keys(row);
        await this.pool().query(`INSERT INTO bundles (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, Object.values(row));

        await this.replaceItems(data.id, data.items || []);
        return this.getById(data.id);
    }

    async update(id, changes) {
        const row = this.arrayToRow(changes);
        if (Object.keys(row).length > 0) {
            const sets = Object.keys(row).map((c) => `\`${c}\` = ?`).join(', ');
            await this.pool().query(`UPDATE bundles SET ${sets} WHERE id = ?`, [...Object.values(row), id]);
        }
        if ('items' in changes) await this.replaceItems(id, changes.items || []);
        return this.getById(id);
    }

    async getById(id) {
        const [rows] = await this.pool().query('SELECT * FROM bundles WHERE id = ?', [id]);
        return rows[0] ? this.rowToArray(rows[0]) : null;
    }

    async getPublished() {
        const [rows] = await this.pool().query('SELECT * FROM bundles WHERE is_published = 1 ORDER BY sort_order ASC, created_at DESC');
        const bundles = await Promise.all(rows.map((row) => this.hydrate(this.scalarFields(row), true)));
        return bundles.filter((b) => b.items.length >= 2);
    }

    async getAllAdmin() {
        const [rows] = await this.pool().query('SELECT * FROM bundles ORDER BY sort_order ASC, created_at DESC');
        return Promise.all(rows.map((r) => this.rowToArray(r)));
    }

    async getPublicById(id) {
        const [rows] = await this.pool().query('SELECT * FROM bundles WHERE id = ? AND is_published = 1 LIMIT 1', [id]);
        if (!rows[0]) return null;
        const bundle = await this.hydrate(this.scalarFields(rows[0]), true);
        return bundle.items.length >= 2 ? bundle : null;
    }

    /** Server-trusted price for one product's line within a bundle purchase. */
    async priceForProduct(bundleId, productId) {
        const bundle = await this.getPublicById(bundleId);
        if (!bundle) return null;

        const line = bundle.items.find((item) => item.productId === productId);
        if (!line || bundle.pricing.subtotal <= 0) return null;

        const catalogUnitPrice = Number(line.product.price);
        const ratio = bundle.pricing.bundlePrice / bundle.pricing.subtotal;
        const unitPrice = Math.round(catalogUnitPrice * ratio * 100) / 100;

        const fullProduct = await this.products().getPublicById(productId);
        let variantId = null;
        let stock = Number(line.product.stock);
        if (fullProduct?.hasVariants && fullProduct.variants?.length) {
            const defaultVariant = fullProduct.variants.find((v) => v.isDefault) || fullProduct.variants[0];
            variantId = defaultVariant.id;
            stock = defaultVariant.stock;
        }

        return { unitPrice, quantity: line.quantity, stock, variantId, bundleTitle: bundle.title };
    }
}
