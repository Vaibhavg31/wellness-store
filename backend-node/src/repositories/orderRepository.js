import { BaseRepository } from './base.js';

/** Orders — `orders` + order_shipping (1-1), order_items (1-n), order_status_history (1-n). Mirrors OrderRepository.php. */
export class OrderRepository extends BaseRepository {
    tableName() { return 'orders'; }

    async rowToArray(row) {
        const id = row.id;
        return {
            ...this.scalarFields(row),
            shipping: await this.fetchShipping(id),
            items: await this.fetchItems(id),
            statusHistory: await this.fetchStatusHistory(id),
        };
    }

    scalarFields(row) {
        return {
            id: row.id,
            orderSource: row.order_source,
            userId: row.user_id,
            email: row.email,
            subtotal: Number(row.subtotal),
            discountAmount: Number(row.discount_amount),
            deliveryFee: Number(row.delivery_fee),
            deliverySaved: this.floatOrNull(row.delivery_saved),
            total: Number(row.total),
            status: row.status,
            payment: row.payment,
            paymentStatus: row.payment_status,
            couponCode: row.coupon_code,
            couponId: row.coupon_id,
            couponType: row.coupon_type,
            razorpayOrderId: row.razorpay_order_id,
            razorpayPaymentId: row.razorpay_payment_id,
            razorpaySignature: row.razorpay_signature,
            razorpayAmount: this.intOrNull(row.razorpay_amount),
            trackingNumber: row.tracking_number,
            carrier: row.carrier,
            estimatedDelivery: row.estimated_delivery,
            adminNotes: row.admin_notes,
            refundStatus: row.refund_status,
            refundedAt: this.toIso(row.refunded_at),
            paidAt: this.toIso(row.paid_at),
            cancelledAt: this.toIso(row.cancelled_at),
            createdBy: row.created_by,
            createdAt: this.toIso(row.created_at),
            updatedAt: this.toIso(row.updated_at),
        };
    }

    /** Batches shipping/items/status-history across a whole result set (3 queries total, not 1+3N). */
    async mapRowsBatched(rows) {
        if (!rows.length) return [];

        const ids = rows.map((r) => r.id);
        const placeholders = ids.map(() => '?').join(', ');
        const pool = this.pool();

        const shippingById = {};
        const [shippingRows] = await pool.query(`SELECT * FROM order_shipping WHERE order_id IN (${placeholders})`, ids);
        for (const r of shippingRows) {
            shippingById[r.order_id] = { name: r.name, phone: r.phone, address: r.address, landmark: r.landmark, city: r.city, state: r.state, pincode: r.pincode };
        }

        const itemsById = {};
        const [itemRows] = await pool.query(`SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY order_id, id ASC`, ids);
        for (const r of itemRows) {
            (itemsById[r.order_id] ??= []).push({
                productId: r.product_id, variantId: r.variant_id ?? null, variantLabel: r.variant_label ?? null,
                bundleId: r.bundle_id ?? null, bundleTitle: r.bundle_title ?? null,
                title: r.title, price: Number(r.price), quantity: Number(r.quantity), image: r.image, isCustom: this.bool(r.is_custom),
            });
        }

        const historyById = {};
        const [historyRows] = await pool.query(`SELECT * FROM order_status_history WHERE order_id IN (${placeholders}) ORDER BY order_id, changed_at ASC`, ids);
        for (const r of historyRows) {
            (historyById[r.order_id] ??= []).push({ status: r.status, at: this.toIso(r.changed_at), by: r.changed_by, note: r.note });
        }

        return rows.map((row) => ({
            ...this.scalarFields(row),
            shipping: shippingById[row.id] || {},
            items: itemsById[row.id] || [],
            statusHistory: historyById[row.id] || [],
        }));
    }

    arrayToRow(data) {
        const map = {
            orderSource: { col: 'order_source', type: 'string' },
            userId: { col: 'user_id', type: 'nullableString' },
            email: { col: 'email', type: 'string' },
            subtotal: { col: 'subtotal', type: 'float' },
            discountAmount: { col: 'discount_amount', type: 'float' },
            deliveryFee: { col: 'delivery_fee', type: 'float' },
            deliverySaved: { col: 'delivery_saved', type: 'float' },
            total: { col: 'total', type: 'float' },
            status: { col: 'status', type: 'string' },
            payment: { col: 'payment', type: 'string' },
            paymentStatus: { col: 'payment_status', type: 'string' },
            couponCode: { col: 'coupon_code', type: 'string' },
            couponId: { col: 'coupon_id', type: 'string' },
            couponType: { col: 'coupon_type', type: 'string' },
            razorpayOrderId: { col: 'razorpay_order_id', type: 'string' },
            razorpayPaymentId: { col: 'razorpay_payment_id', type: 'string' },
            razorpaySignature: { col: 'razorpay_signature', type: 'string' },
            razorpayAmount: { col: 'razorpay_amount', type: 'int' },
            trackingNumber: { col: 'tracking_number', type: 'string' },
            carrier: { col: 'carrier', type: 'string' },
            estimatedDelivery: { col: 'estimated_delivery', type: 'string' },
            adminNotes: { col: 'admin_notes', type: 'string' },
            refundStatus: { col: 'refund_status', type: 'string' },
            refundedAt: { col: 'refunded_at', type: 'datetime' },
            paidAt: { col: 'paid_at', type: 'datetime' },
            cancelledAt: { col: 'cancelled_at', type: 'datetime' },
            createdBy: { col: 'created_by', type: 'string' },
            createdAt: { col: 'created_at', type: 'datetime' },
            updatedAt: { col: 'updated_at', type: 'datetime' },
        };

        const row = {};
        for (const [key, meta] of Object.entries(map)) {
            if (!(key in data)) continue;
            const v = data[key];
            row[meta.col] = meta.type === 'int' ? (v === null ? null : Number.parseInt(v, 10))
                : meta.type === 'float' ? (v === null ? null : Number.parseFloat(v))
                : meta.type === 'datetime' ? (v === null ? null : this.toDbDatetime(String(v)))
                : meta.type === 'nullableString' ? (v === null || v === '' ? null : v)
                : v;
        }
        return row;
    }

    // ── Child table fetchers ─────────────────────────────────────────────

    async fetchShipping(orderId) {
        const [rows] = await this.pool().query('SELECT * FROM order_shipping WHERE order_id = ? LIMIT 1', [orderId]);
        const row = rows[0];
        if (!row) return {};
        return { name: row.name, phone: row.phone, address: row.address, landmark: row.landmark, city: row.city, state: row.state, pincode: row.pincode };
    }

    async fetchItems(orderId) {
        const [rows] = await this.pool().query('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC', [orderId]);
        return rows.map((r) => ({
            productId: r.product_id, variantId: r.variant_id ?? null, variantLabel: r.variant_label ?? null,
            bundleId: r.bundle_id ?? null, bundleTitle: r.bundle_title ?? null,
            title: r.title, price: Number(r.price), quantity: Number(r.quantity), image: r.image, isCustom: this.bool(r.is_custom),
        }));
    }

    async fetchStatusHistory(orderId) {
        const [rows] = await this.pool().query('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY changed_at ASC', [orderId]);
        return rows.map((r) => ({ status: r.status, at: this.toIso(r.changed_at), by: r.changed_by, note: r.note }));
    }

    // ── Child table writers ──────────────────────────────────────────────

    async upsertShipping(orderId, shipping, conn = this.pool()) {
        if (!shipping || Object.keys(shipping).length === 0) return;
        await conn.query('DELETE FROM order_shipping WHERE order_id = ?', [orderId]);
        await conn.query(
            'INSERT INTO order_shipping (order_id, name, phone, address, landmark, city, state, pincode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [orderId, shipping.name ?? '', shipping.phone ?? '', shipping.address ?? '', shipping.landmark ?? null, shipping.city ?? '', shipping.state ?? null, shipping.pincode ?? ''],
        );
    }

    async replaceItems(orderId, items, conn = this.pool()) {
        await conn.query('DELETE FROM order_items WHERE order_id = ?', [orderId]);
        if (!items || items.length === 0) return;
        for (const item of items) {
            await conn.query(
                `INSERT INTO order_items (order_id, product_id, variant_id, variant_label, bundle_id, bundle_title, title, price, quantity, image, is_custom)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [orderId, item.productId ?? null, item.variantId ?? null, item.variantLabel ?? null, item.bundleId ?? null, item.bundleTitle ?? null,
                    item.title ?? '', Number(item.price ?? 0), Number.parseInt(item.quantity ?? 1, 10), item.image ?? null, item.isCustom ? 1 : 0],
            );
        }
    }

    async appendStatusHistory(orderId, status, changedBy = 'system', note = null, conn = this.pool()) {
        await conn.query(
            'INSERT INTO order_status_history (order_id, status, changed_at, changed_by, note) VALUES (?, ?, ?, ?, ?)',
            [orderId, status, new Date().toISOString().slice(0, 23).replace('T', ' '), changedBy, note],
        );
    }

    async replaceStatusHistory(orderId, history, conn = this.pool()) {
        await conn.query('DELETE FROM order_status_history WHERE order_id = ?', [orderId]);
        if (!history || history.length === 0) return;
        for (const h of history) {
            const at = h.at ?? h.changedAt ?? null;
            await conn.query(
                'INSERT INTO order_status_history (order_id, status, changed_at, changed_by, note) VALUES (?, ?, ?, ?, ?)',
                [orderId, String(h.status ?? ''), at ? (this.toDbDatetime(String(at)) ?? new Date().toISOString().slice(0, 23).replace('T', ' ')) : new Date().toISOString().slice(0, 23).replace('T', ' '),
                    String(h.by ?? h.changedBy ?? 'system'), h.note ?? null],
            );
        }
    }

    // ── create/update — transactional (order + children are one logical unit) ──

    async create(data) {
        const row = this.arrayToRow(data);
        row.id = data.id;
        const cols = Object.keys(row);
        const id = data.id;

        const conn = await this.pool().getConnection();
        try {
            await conn.beginTransaction();
            await conn.query(`INSERT INTO orders (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, Object.values(row));

            if (data.shipping && Object.keys(data.shipping).length > 0) await this.upsertShipping(id, data.shipping, conn);
            if ('items' in data) await this.replaceItems(id, data.items || [], conn);
            if (data.statusHistory && data.statusHistory.length > 0) {
                await this.replaceStatusHistory(id, data.statusHistory, conn);
            } else if (data.status) {
                await this.appendStatusHistory(id, data.status, data.createdBy || 'system', null, conn);
            }
            await conn.commit();
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }

        return (await this.getById(id)) ?? data;
    }

    async update(id, changes) {
        const conn = await this.pool().getConnection();
        try {
            await conn.beginTransaction();
            const row = this.arrayToRow(changes);
            if (Object.keys(row).length > 0) {
                const sets = Object.keys(row).map((c) => `\`${c}\` = ?`).join(', ');
                await conn.query(`UPDATE orders SET ${sets} WHERE id = ?`, [...Object.values(row), id]);
            }

            if ('shipping' in changes) await this.upsertShipping(id, changes.shipping, conn);
            if ('items' in changes) await this.replaceItems(id, changes.items || [], conn);
            if (changes.statusHistory && changes.statusHistory.length > 0) await this.replaceStatusHistory(id, changes.statusHistory, conn);

            await conn.commit();
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }

        return this.getById(id);
    }

    async getById(id) {
        const [rows] = await this.pool().query('SELECT * FROM orders WHERE id = ?', [id]);
        return rows[0] ? this.rowToArray(rows[0]) : null;
    }

    // ── Domain methods ──────────────────────────────────────────────────

    async findByRazorpayOrderId(razorpayOrderId) {
        if (!razorpayOrderId) return null;
        const [rows] = await this.pool().query('SELECT * FROM orders WHERE razorpay_order_id = ? LIMIT 1', [razorpayOrderId]);
        return rows[0] ? this.rowToArray(rows[0]) : null;
    }

    async getByUserId(userId) {
        const [rows] = await this.pool().query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        return this.mapRowsBatched(rows);
    }

    /** Gate for "only people who bought this can review it" — true once this user has any non-cancelled order containing this product. */
    async hasUserPurchasedProduct(userId, productId) {
        const [rows] = await this.pool().query(
            `SELECT 1 FROM order_items oi INNER JOIN orders o ON o.id = oi.order_id
             WHERE o.user_id = ? AND oi.product_id = ? AND o.status != ? LIMIT 1`,
            [userId, productId, 'cancelled'],
        );
        return rows.length > 0;
    }

    async countNonCancelledOrders(userId) {
        if (!userId) return 0;
        const [rows] = await this.pool().query('SELECT COUNT(*) AS count FROM orders WHERE user_id = ? AND status != ?', [userId, 'cancelled']);
        return Number(rows[0].count);
    }

    async getForUser(userId, email) {
        const normalizedEmail = email.toLowerCase().trim();
        const [rows] = await this.pool().query('SELECT * FROM orders WHERE user_id = ? OR LOWER(email) = ? ORDER BY created_at DESC', [userId || null, normalizedEmail]);

        const seen = new Set();
        const unique = [];
        for (const row of rows) {
            if (!seen.has(row.id)) { seen.add(row.id); unique.push(row); }
        }
        return this.mapRowsBatched(unique);
    }

    async computeStatsForUser(userId, email) {
        const stats = { orderCount: 0, totalSpent: 0, deliveredCount: 0, lastOrderAt: '' };
        for (const order of await this.getForUser(userId, email)) {
            stats.orderCount += 1;
            const status = order.status || '';
            if (!['cancelled', 'returned'].includes(status)) stats.totalSpent += Number(order.total || 0);
            if (status === 'delivered') stats.deliveredCount += 1;
            const createdAt = order.createdAt || '';
            if (createdAt > stats.lastOrderAt) stats.lastOrderAt = createdAt;
        }
        return stats;
    }

    async listAdminFiltered(filters = {}) {
        let sql = 'SELECT o.* FROM orders o';
        const params = [];

        if (filters.search) sql += ' LEFT JOIN order_shipping os ON os.order_id = o.id';
        sql += ' WHERE 1=1';

        if (filters.source === 'direct' || filters.source === 'website') {
            sql += ' AND o.order_source = ?';
            params.push(filters.source);
        }

        if (filters.status) {
            const statuses = String(filters.status).split(',').map((s) => s.trim());
            sql += ` AND o.status IN (${statuses.map(() => '?').join(', ')})`;
            params.push(...statuses);
        }

        if (filters.payment) {
            sql += ' AND o.payment = ?';
            params.push(String(filters.payment));
        }

        if (filters.search) {
            const q = `%${String(filters.search).toLowerCase().trim()}%`;
            sql += ` AND (LOWER(o.id) LIKE ? OR LOWER(o.email) LIKE ?
                       OR LOWER(IFNULL(os.name,"")) LIKE ?
                       OR LOWER(IFNULL(os.phone,"")) LIKE ?
                       OR LOWER(IFNULL(os.city,"")) LIKE ?
                       OR LOWER(IFNULL(o.tracking_number,"")) LIKE ?)`;
            params.push(q, q, q, q, q, q);
        }

        if (filters.from) {
            const t = new Date(filters.from);
            sql += ' AND o.created_at >= ?';
            params.push(Number.isNaN(t.getTime()) ? '1970-01-01 00:00:00' : t.toISOString().slice(0, 19).replace('T', ' '));
        }

        if (filters.to) {
            const t = new Date(`${filters.to} 23:59:59`);
            sql += ' AND o.created_at <= ?';
            params.push(Number.isNaN(t.getTime()) ? '9999-12-31 23:59:59' : t.toISOString().slice(0, 19).replace('T', ' '));
        }

        const sortMap = { createdAt: 'o.created_at', total: 'o.total', status: 'o.status', email: 'o.email' };
        const sortCol = sortMap[filters.sort || 'createdAt'] || 'o.created_at';
        const dir = String(filters.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ${sortCol} ${dir}`;

        const [rows] = await this.pool().query(sql, params);
        return this.mapRowsBatched(rows);
    }

    /** A coupon usage "counts" once placed and, for Razorpay orders, once payment is confirmed. */
    static USAGE_FILTER = "status != 'cancelled' AND (payment != 'razorpay' OR payment_status = 'paid')";

    async countUsagesOfCoupon(couponCode) {
        const [rows] = await this.pool().query(`SELECT COUNT(*) AS count FROM orders WHERE coupon_code = ? AND ${OrderRepository.USAGE_FILTER}`, [couponCode]);
        return Number(rows[0].count);
    }

    async countUsagesOfCouponByUser(couponCode, userId, email) {
        const normalizedEmail = email.toLowerCase().trim();
        let sql = `SELECT COUNT(*) AS count FROM orders WHERE coupon_code = ? AND ${OrderRepository.USAGE_FILTER}`;
        const params = [couponCode];

        if (userId && normalizedEmail) {
            sql += ' AND (user_id = ? OR LOWER(email) = ?)';
            params.push(userId, normalizedEmail);
        } else if (userId) {
            sql += ' AND user_id = ?';
            params.push(userId);
        } else if (normalizedEmail) {
            sql += ' AND LOWER(email) = ?';
            params.push(normalizedEmail);
        } else {
            return 0;
        }

        const [rows] = await this.pool().query(sql, params);
        return Number(rows[0].count);
    }

    async statsForCoupon(couponCode) {
        const [rows] = await this.pool().query(
            `SELECT
                COUNT(*) AS total_orders,
                COUNT(DISTINCT NULLIF(user_id, '')) AS unique_customers,
                COALESCE(SUM(total), 0) AS total_revenue,
                COALESCE(SUM(discount_amount), 0) AS total_discount,
                COALESCE(SUM(CASE WHEN coupon_type = 'free_delivery' AND delivery_saved IS NOT NULL THEN delivery_saved ELSE 0 END), 0) AS free_delivery_saved,
                SUM(CASE WHEN coupon_type = 'free_delivery' AND delivery_saved IS NULL THEN 1 ELSE 0 END) AS free_delivery_missing_saved
             FROM orders WHERE coupon_code = ? AND ${OrderRepository.USAGE_FILTER}`,
            [couponCode],
        );
        const row = rows[0] || {};
        return {
            totalOrders: Number(row.total_orders || 0),
            uniqueCustomers: Number(row.unique_customers || 0),
            totalRevenue: Number(row.total_revenue || 0),
            totalDiscountGiven: Number(row.total_discount || 0) + Number(row.free_delivery_saved || 0),
            freeDeliveryOrdersMissingSavedAmount: Number(row.free_delivery_missing_saved || 0),
        };
    }
}
