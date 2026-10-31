import { BaseRepository } from './base.js';
import { generateId } from '../lib/db.js';

export const OFFER_KINDS = ['mix_match', 'bogo', 'collection'];

/** "Pick any 3 for ₹1499" → "pick-any-3-for-1499". */
export function slugify(text) {
    return String(text ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
}

/** True while the offer is switched on and today falls inside its dates. */
export function isLive(offer, now = Date.now()) {
    if (!offer.isEnabled) return false;
    if (offer.startsAt && now < new Date(offer.startsAt).getTime()) return false;
    if (offer.endsAt && now > new Date(offer.endsAt).getTime()) return false;
    return true;
}

/** Offer pages: a fixed-price "pick any N" box, "buy 1 get 1 free" products, or any hand-picked collection. */
export class OfferRepository extends BaseRepository {
    tableName() { return 'offers'; }

    scalarFields(row) {
        return {
            id: row.id,
            slug: row.slug,
            title: row.title,
            kind: row.kind,
            summary: row.summary ?? '',
            description: row.description ?? '',
            image: row.image ?? '',
            mobileImage: row.mobile_image ?? '',
            price: Number(row.price),
            pickCount: Number(row.pick_count),
            allProducts: this.bool(row.all_products),
            isEnabled: this.bool(row.is_enabled),
            sortOrder: Number(row.sort_order),
            startsAt: this.toIso(row.starts_at),
            endsAt: this.toIso(row.ends_at),
            createdAt: this.toIso(row.created_at),
            updatedAt: this.toIso(row.updated_at),
        };
    }

    async attachProducts(offers) {
        if (offers.length === 0) return offers;
        const marks = offers.map(() => '?').join(', ');
        const [rows] = await this.pool().query(
            `SELECT offer_id, product_id FROM offer_products WHERE offer_id IN (${marks}) ORDER BY offer_id, sort_order ASC`,
            offers.map((o) => o.id),
        );
        const byOffer = {};
        for (const r of rows) (byOffer[r.offer_id] ??= []).push(r.product_id);
        for (const offer of offers) offer.productIds = byOffer[offer.id] ?? [];
        return offers;
    }

    async rowToArray(row) {
        return (await this.attachProducts([this.scalarFields(row)]))[0];
    }

    async getAllAdmin() {
        const [rows] = await this.pool().query('SELECT * FROM offers ORDER BY sort_order ASC, created_at ASC');
        return this.attachProducts(rows.map((r) => this.scalarFields(r)));
    }

    async getLive() {
        return (await this.getAllAdmin()).filter((o) => isLive(o));
    }

    async getBySlug(slug) {
        const [rows] = await this.pool().query('SELECT * FROM offers WHERE slug = ? LIMIT 1', [slug]);
        return rows[0] ? this.rowToArray(rows[0]) : null;
    }

    async getByIdLive(id) {
        const offer = await this.getById(id);
        return offer && isLive(offer) ? offer : null;
    }

    /** A free slug: "buy-1-get-1-free", then "buy-1-get-1-free-2", … */
    async uniqueSlug(wanted, ignoreId = null) {
        const base = slugify(wanted) || 'offer';
        let candidate = base;
        for (let n = 2; n < 200; n += 1) {
            const [rows] = await this.pool().query('SELECT id FROM offers WHERE slug = ? LIMIT 1', [candidate]);
            if (!rows[0] || rows[0].id === ignoreId) return candidate;
            candidate = `${base}-${n}`;
        }
        return `${base}-${Date.now()}`;
    }

    columnsFor(data) {
        const out = {};
        const set = (key, col, fn = (v) => v) => { if (key in data) out[col] = fn(data[key]); };
        set('slug', 'slug');
        set('title', 'title', (v) => String(v).trim().slice(0, 160));
        set('kind', 'kind');
        set('summary', 'summary', (v) => String(v ?? '').trim().slice(0, 255));
        set('description', 'description', (v) => String(v ?? '').trim() || null);
        set('image', 'image', (v) => String(v ?? '').trim() || null);
        set('mobileImage', 'mobile_image', (v) => String(v ?? '').trim() || null);
        set('price', 'price', (v) => Math.max(0, Number(v) || 0));
        set('pickCount', 'pick_count', (v) => Math.min(10, Math.max(2, Number.parseInt(v, 10) || 3)));
        set('allProducts', 'all_products', (v) => (v ? 1 : 0));
        set('isEnabled', 'is_enabled', (v) => (v ? 1 : 0));
        set('sortOrder', 'sort_order', (v) => Number.parseInt(v, 10) || 0);
        set('startsAt', 'starts_at', (v) => this.toDbDatetime(v));
        set('endsAt', 'ends_at', (v) => this.toDbDatetime(v));
        return out;
    }

    async replaceProducts(offerId, productIds) {
        await this.pool().query('DELETE FROM offer_products WHERE offer_id = ?', [offerId]);
        const unique = [...new Set((productIds ?? []).map((p) => String(p).trim()).filter(Boolean))];
        for (const [i, productId] of unique.entries()) {
            await this.pool().query('INSERT INTO offer_products (offer_id, product_id, sort_order) VALUES (?, ?, ?)', [offerId, productId, i]);
        }
    }

    async createOffer(data) {
        const id = generateId('offer');
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const slug = await this.uniqueSlug(data.slug || data.title);
        const cols = { ...this.columnsFor({ ...data, slug }), id, created_at: now, updated_at: now };
        await this.pool().query(`INSERT INTO offers (${Object.keys(cols).map((c) => `\`${c}\``).join(', ')}) VALUES (${Object.keys(cols).map(() => '?').join(', ')})`, Object.values(cols));
        await this.replaceProducts(id, data.productIds);
        return this.getById(id);
    }

    async updateOffer(id, data) {
        const existing = await this.getById(id);
        if (!existing) return null;
        const patch = { ...data };
        if ('slug' in patch || 'title' in patch) patch.slug = await this.uniqueSlug(patch.slug || patch.title || existing.title, id);
        const cols = { ...this.columnsFor(patch), updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ') };
        const sets = Object.keys(cols).map((c) => `\`${c}\` = ?`).join(', ');
        await this.pool().query(`UPDATE offers SET ${sets} WHERE id = ?`, [...Object.values(cols), id]);
        if ('productIds' in data) await this.replaceProducts(id, data.productIds);
        return this.getById(id);
    }

    async deleteOffer(id) {
        await this.pool().query('DELETE FROM offer_products WHERE offer_id = ?', [id]);
        return this.delete(id);
    }
}
