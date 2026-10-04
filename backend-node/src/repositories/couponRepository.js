import { BaseRepository } from './base.js';

export class CouponRepository extends BaseRepository {
    tableName() { return 'coupons'; }

    rowToArray(row) {
        return {
            id: row.id,
            code: row.code,
            title: row.title,
            description: row.description,
            type: row.type,
            value: Number(row.value),
            minOrderAmount: Number(row.min_order_amount),
            maxDiscount: Number(row.max_discount),
            maxUses: Number(row.max_uses),
            maxUsesPerUser: Number(row.max_uses_per_user),
            usageCount: Number(row.usage_count),
            isEnabled: this.bool(row.is_enabled),
            showOnWebsite: this.bool(row.show_on_website),
            autoApply: this.bool(row.auto_apply),
            audience: row.audience ?? 'everyone',
            minPreviousOrders: Number(row.min_previous_orders ?? 1),
            startsAt: this.toIso(row.starts_at),
            expiresAt: this.toIso(row.expires_at),
            createdAt: this.toIso(row.created_at),
            updatedAt: this.toIso(row.updated_at),
        };
    }

    arrayToRow(data) {
        const map = {
            code: { col: 'code', type: 'string' },
            title: { col: 'title', type: 'string' },
            description: { col: 'description', type: 'string' },
            type: { col: 'type', type: 'string' },
            value: { col: 'value', type: 'float' },
            minOrderAmount: { col: 'min_order_amount', type: 'float' },
            maxDiscount: { col: 'max_discount', type: 'float' },
            maxUses: { col: 'max_uses', type: 'int' },
            maxUsesPerUser: { col: 'max_uses_per_user', type: 'int' },
            usageCount: { col: 'usage_count', type: 'int' },
            isEnabled: { col: 'is_enabled', type: 'bool' },
            showOnWebsite: { col: 'show_on_website', type: 'bool' },
            autoApply: { col: 'auto_apply', type: 'bool' },
            audience: { col: 'audience', type: 'string' },
            minPreviousOrders: { col: 'min_previous_orders', type: 'int' },
            startsAt: { col: 'starts_at', type: 'datetime' },
            expiresAt: { col: 'expires_at', type: 'datetime' },
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

    async findByCode(code) {
        const normalized = code.toUpperCase().trim();
        if (!normalized) return null;
        const [rows] = await this.pool().query('SELECT * FROM coupons WHERE UPPER(code) = ? LIMIT 1', [normalized]);
        return rows[0] ? this.rowToArray(rows[0]) : null;
    }

    async codeExists(code, excludeId = null) {
        const normalized = code.toUpperCase().trim();
        let sql = 'SELECT COUNT(*) AS count FROM coupons WHERE UPPER(code) = ?';
        const params = [normalized];
        if (excludeId !== null) { sql += ' AND id != ?'; params.push(excludeId); }
        const [rows] = await this.pool().query(sql, params);
        return Number(rows[0].count) > 0;
    }

    async getEnabled() {
        const [rows] = await this.pool().query('SELECT * FROM coupons WHERE is_enabled = 1');
        return rows.map((r) => this.rowToArray(r));
    }

    async getPublic() {
        const [rows] = await this.pool().query('SELECT * FROM coupons WHERE is_enabled = 1 AND show_on_website = 1 AND auto_apply = 0');
        return rows.map((r) => this.rowToArray(r));
    }

    async getAutoApply() {
        const [rows] = await this.pool().query('SELECT * FROM coupons WHERE is_enabled = 1 AND auto_apply = 1');
        return rows.map((r) => this.rowToArray(r));
    }

    /** Atomically increments usage only if under max_uses — closes the check-then-act race. */
    async incrementUsage(id) {
        const [result] = await this.pool().query(
            'UPDATE coupons SET usage_count = usage_count + 1, updated_at = ? WHERE id = ? AND (max_uses = 0 OR usage_count < max_uses)',
            [new Date().toISOString().slice(0, 19).replace('T', ' '), id],
        );
        return result.affectedRows > 0;
    }

    async decrementUsage(id) {
        await this.pool().query('UPDATE coupons SET usage_count = GREATEST(0, usage_count - 1), updated_at = ? WHERE id = ?', [new Date().toISOString().slice(0, 19).replace('T', ' '), id]);
    }
}
