import { BaseRepository } from './base.js';

export class ReviewRepository extends BaseRepository {
    tableName() { return 'reviews'; }

    rowToArray(row) {
        return {
            id: row.id,
            productId: row.product_id,
            userId: row.user_id,
            name: row.name,
            email: row.email,
            rating: Number(row.rating),
            comment: row.comment,
            images: this.decodeImages(row.images),
            isVerifiedPurchase: this.bool(row.is_verified_purchase),
            avatar: row.avatar,
            isApproved: this.bool(row.is_approved),
            createdAt: this.toIso(row.created_at),
        };
    }

    decodeImages(json) {
        if (!json) return [];
        try {
            const decoded = JSON.parse(json);
            return Array.isArray(decoded) ? decoded.filter((v) => typeof v === 'string') : [];
        } catch {
            return [];
        }
    }

    arrayToRow(data) {
        const map = {
            productId: { col: 'product_id', type: 'string' },
            userId: { col: 'user_id', type: 'string' },
            name: { col: 'name', type: 'string' },
            email: { col: 'email', type: 'string' },
            rating: { col: 'rating', type: 'int' },
            comment: { col: 'comment', type: 'string' },
            images: { col: 'images', type: 'json' },
            isVerifiedPurchase: { col: 'is_verified_purchase', type: 'bool' },
            avatar: { col: 'avatar', type: 'string' },
            isApproved: { col: 'is_approved', type: 'bool' },
            createdAt: { col: 'created_at', type: 'datetime' },
        };
        const row = {};
        for (const [key, meta] of Object.entries(map)) {
            if (!(key in data)) continue;
            const v = data[key];
            row[meta.col] = meta.type === 'bool' ? (v ? 1 : 0)
                : meta.type === 'int' ? Number.parseInt(v, 10)
                : meta.type === 'datetime' ? this.toDbDatetime(v)
                : meta.type === 'json' ? (Array.isArray(v) && v.length > 0 ? JSON.stringify(v) : null)
                : v;
        }
        return row;
    }

    async getApproved() {
        const [rows] = await this.pool().query('SELECT * FROM reviews WHERE is_approved = 1 ORDER BY created_at DESC');
        return rows.map((r) => this.rowToArray(r));
    }

    async getByProductId(productId, approvedOnly = true) {
        let sql = 'SELECT * FROM reviews WHERE product_id = ?';
        const params = [productId];
        if (approvedOnly) sql += ' AND is_approved = 1';
        sql += ' ORDER BY created_at DESC';
        const [rows] = await this.pool().query(sql, params);
        return rows.map((r) => this.rowToArray(r));
    }

    async findByUserAndProduct(userId, productId) {
        const [rows] = await this.pool().query('SELECT * FROM reviews WHERE user_id = ? AND product_id = ? LIMIT 1', [userId, productId]);
        return rows[0] ? this.rowToArray(rows[0]) : null;
    }

    async approve(id) { return this.update(id, { isApproved: true }); }
    async reject(id) { return this.update(id, { isApproved: false }); }
}
