import { BaseRepository } from './base.js';
import { generateId } from '../lib/db.js';

/** Homepage promotional banners — mirrors BannerRepository.php. */
export class BannerRepository extends BaseRepository {
    tableName() { return 'promo_banners'; }

    rowToArray(row) {
        return {
            id: row.id,
            title: row.title,
            subtitle: row.subtitle,
            image: row.image,
            mobileImage: row.mobile_image || '',
            ctaLabel: row.cta_label,
            ctaHref: row.cta_href,
            isEnabled: this.bool(row.is_enabled),
            displayTarget: row.display_target,
            productId: row.product_id,
            order: Number(row.sort_order),
            createdAt: this.toIso(row.created_at),
            updatedAt: this.toIso(row.updated_at),
        };
    }

    arrayToRow(data) {
        const map = {
            title: { col: 'title', type: 'string' },
            subtitle: { col: 'subtitle', type: 'string' },
            image: { col: 'image', type: 'string' },
            mobileImage: { col: 'mobile_image', type: 'string' },
            ctaLabel: { col: 'cta_label', type: 'string' },
            ctaHref: { col: 'cta_href', type: 'string' },
            isEnabled: { col: 'is_enabled', type: 'bool' },
            displayTarget: { col: 'display_target', type: 'string' },
            productId: { col: 'product_id', type: 'string' },
            order: { col: 'sort_order', type: 'int' },
            updatedAt: { col: 'updated_at', type: 'datetime' },
        };
        const row = {};
        for (const [key, meta] of Object.entries(map)) {
            if (!(key in data)) continue;
            const v = data[key];
            row[meta.col] = meta.type === 'bool' ? (v ? 1 : 0)
                : meta.type === 'int' ? Number.parseInt(v, 10)
                : meta.type === 'datetime' ? this.toDbDatetime(v)
                : v;
        }
        return row;
    }

    async getPublished(target = null) {
        if (target !== null && !['slider', 'stacked'].includes(target)) target = null;

        if (target === null) {
            const [rows] = await this.pool().query(
                "SELECT * FROM promo_banners WHERE is_enabled = 1 AND display_target != 'product' ORDER BY sort_order ASC, created_at ASC",
            );
            return rows.map((r) => this.rowToArray(r));
        }
        const [rows] = await this.pool().query(
            "SELECT * FROM promo_banners WHERE is_enabled = 1 AND display_target IN (?, 'both') ORDER BY sort_order ASC, created_at ASC",
            [target],
        );
        return rows.map((r) => this.rowToArray(r));
    }

    async getPublishedForProduct(productId) {
        const [rows] = await this.pool().query(
            "SELECT * FROM promo_banners WHERE is_enabled = 1 AND display_target = 'product' AND product_id = ? ORDER BY sort_order ASC, created_at ASC",
            [productId],
        );
        return rows.map((r) => this.rowToArray(r));
    }

    async create(data) {
        const id = data.id || generateId('banner');
        const createdAt = data.createdAt || new Date().toISOString();
        const updatedAt = data.updatedAt || new Date().toISOString();

        const row = this.arrayToRow({ ...data, updatedAt });
        row.id = id;
        row.created_at = this.toDbDatetime(createdAt);

        const cols = Object.keys(row);
        const sql = `INSERT INTO promo_banners (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
        await this.pool().query(sql, Object.values(row));

        return this.getById(id);
    }

    async update(id, changes) {
        return super.update(id, { ...changes, updatedAt: new Date().toISOString() });
    }
}
