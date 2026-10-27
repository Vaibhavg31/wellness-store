import { BaseRepository } from './base.js';
import { generateId } from '../lib/db.js';

/** Customer accounts — `users` + `user_addresses`. Mirrors UserRepository.php. */
export class UserRepository extends BaseRepository {
    tableName() { return 'users'; }

    async rowToArray(row) {
        return { ...this.scalarFields(row), addresses: await this.fetchAddresses(row.id) };
    }

    scalarFields(row) {
        return {
            id: row.id,
            email: row.email,
            name: row.name,
            avatar: row.avatar,
            passwordHash: row.password_hash,
            phone: row.phone,
            phoneVerified: this.bool(row.phone_verified),
            phoneVerifiedAt: this.toIso(row.phone_verified_at),
            emailVerified: this.bool(row.email_verified),
            emailVerifiedAt: this.toIso(row.email_verified_at),
            isBlocked: this.bool(row.is_blocked),
            blockedAt: this.toIso(row.blocked_at),
            createdAt: this.toIso(row.created_at),
            lastLogin: this.toIso(row.last_login),
            lastUsedAddressId: row.last_used_address_id,
        };
    }

    arrayToRow(data) {
        const map = {
            email: 'email', name: 'name', avatar: 'avatar', passwordHash: 'password_hash', phone: 'phone',
            phoneVerified: 'phone_verified', phoneVerifiedAt: 'phone_verified_at',
            emailVerified: 'email_verified', emailVerifiedAt: 'email_verified_at',
            isBlocked: 'is_blocked', blockedAt: 'blocked_at', createdAt: 'created_at',
            lastLogin: 'last_login', lastUsedAddressId: 'last_used_address_id',
        };
        const boolCols = new Set(['phone_verified', 'email_verified', 'is_blocked']);
        const dateCols = new Set(['phone_verified_at', 'email_verified_at', 'blocked_at', 'created_at', 'last_login']);

        const row = {};
        for (const [key, col] of Object.entries(map)) {
            if (!(key in data)) continue;
            const v = data[key];
            if (boolCols.has(col)) row[col] = v ? 1 : 0;
            else if (dateCols.has(col)) row[col] = this.toDbDatetime(v);
            else row[col] = v;
        }
        return row;
    }

    // Override getAll/getById/findOneBy to resolve the async rowToArray (BaseRepository's are sync-mapped).
    async getAll() {
        const [rows] = await this.pool().query(`SELECT * FROM \`${this.tableName()}\``);
        return Promise.all(rows.map((r) => this.rowToArray(r)));
    }

    async getById(id) {
        const [rows] = await this.pool().query(`SELECT * FROM \`${this.tableName()}\` WHERE id = ?`, [id]);
        return rows[0] ? this.rowToArray(rows[0]) : null;
    }

    async findOneBy(dbCol, value) {
        const [rows] = await this.pool().query(`SELECT * FROM \`${this.tableName()}\` WHERE \`${dbCol}\` = ? LIMIT 1`, [value]);
        return rows[0] ? this.rowToArray(rows[0]) : null;
    }

    async fetchAddresses(userId) {
        const [rows] = await this.pool().query('SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at ASC', [userId]);
        return rows.map((r) => this.addressRowToArray(r));
    }

    addressRowToArray(row) {
        return {
            id: row.id, label: row.label, name: row.name, phone: row.phone, address: row.address,
            landmark: row.landmark, city: row.city, state: row.state, pincode: row.pincode,
            isDefault: this.bool(row.is_default), createdAt: this.toIso(row.created_at),
        };
    }

    async addAddress(userId, addr) {
        const id = addr.id || generateId('addr');
        const now = addr.createdAt || new Date().toISOString();

        await this.pool().query(
            `INSERT INTO user_addresses (id, user_id, label, name, phone, address, landmark, city, state, pincode, is_default, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, userId, addr.label ?? 'Home', addr.name ?? '', addr.phone ?? '', addr.address ?? '', addr.landmark ?? null,
                addr.city ?? '', addr.state ?? '', addr.pincode ?? '', addr.isDefault ? 1 : 0, this.toDbDatetime(now)],
        );

        return { ...addr, id, createdAt: now };
    }

    async updateAddressData(userId, addressId, data) {
        const [existingRows] = await this.pool().query('SELECT * FROM user_addresses WHERE id = ? AND user_id = ?', [addressId, userId]);
        const existing = existingRows[0];
        if (!existing) return null;

        await this.pool().query(
            `UPDATE user_addresses SET label=?, name=?, phone=?, address=?, landmark=?, city=?, state=?, pincode=?, is_default=? WHERE id=? AND user_id=?`,
            [
                data.label ?? existing.label, data.name ?? existing.name, data.phone ?? existing.phone,
                data.address ?? existing.address, data.landmark ?? existing.landmark, data.city ?? existing.city,
                data.state ?? existing.state, data.pincode ?? existing.pincode,
                data.isDefault !== undefined ? (data.isDefault ? 1 : 0) : existing.is_default,
                addressId, userId,
            ],
        );

        const [updatedRows] = await this.pool().query('SELECT * FROM user_addresses WHERE id = ? AND user_id = ?', [addressId, userId]);
        return updatedRows[0] ? this.addressRowToArray(updatedRows[0]) : null;
    }

    async removeAddress(userId, addressId) {
        const [result] = await this.pool().query('DELETE FROM user_addresses WHERE id = ? AND user_id = ?', [addressId, userId]);
        return result.affectedRows > 0;
    }

    async setDefaultAddressForUser(userId, addressId) {
        await this.pool().query('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [userId]);
        const [result] = await this.pool().query('UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?', [addressId, userId]);
        return result.affectedRows > 0;
    }

    async countAddresses(userId) {
        const [rows] = await this.pool().query('SELECT COUNT(*) AS count FROM user_addresses WHERE user_id = ?', [userId]);
        return Number(rows[0].count);
    }

    async setLastUsedAddress(userId, addressId) {
        await this.pool().query('UPDATE users SET last_used_address_id = ? WHERE id = ?', [addressId, userId]);
    }

    async findByEmail(email) {
        return this.findOneBy('email', email.toLowerCase());
    }

    async upsertByEmail(email, fields) {
        const existing = await this.findByEmail(email);
        if (!existing) {
            const data = { id: generateId('user'), email, ...fields };
            return this.create(data);
        }
        const updated = await this.update(existing.id, fields);
        return updated ?? existing;
    }

    async listAdminFiltered(filters = {}) {
        let sql = 'SELECT * FROM users WHERE 1=1';
        const params = [];

        if (filters.search) {
            const q = `%${filters.search.toLowerCase().trim()}%`;
            sql += ' AND (LOWER(id) LIKE ? OR LOWER(email) LIKE ? OR LOWER(IFNULL(name,"")) LIKE ? OR LOWER(IFNULL(phone,"")) LIKE ?)';
            params.push(q, q, q, q);
        }

        if (filters.phoneVerified !== undefined && filters.phoneVerified !== '') {
            const v = ['1', 'true', 'yes'].includes(String(filters.phoneVerified)) ? 1 : 0;
            sql += ' AND phone_verified = ?';
            params.push(v);
        }

        if (filters.from) {
            const t = new Date(filters.from);
            sql += ' AND created_at >= ?';
            params.push(Number.isNaN(t.getTime()) ? '1970-01-01 00:00:00' : t.toISOString().slice(0, 19).replace('T', ' '));
        }

        if (filters.to) {
            const t = new Date(`${filters.to} 23:59:59`);
            sql += ' AND created_at <= ?';
            params.push(Number.isNaN(t.getTime()) ? '9999-12-31 23:59:59' : t.toISOString().slice(0, 19).replace('T', ' '));
        }

        const sortMap = { createdAt: 'created_at', lastLogin: 'last_login', email: 'email', name: 'name' };
        const sortCol = sortMap[filters.sort] || 'created_at';
        const dir = String(filters.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ${sortCol} ${dir}`;

        const [rows] = await this.pool().query(sql, params);
        // Admin list table never renders addresses — skip the N extra queries; full detail (with addresses) is still available via getById().
        return rows.map((row) => ({ ...this.scalarFields(row), addresses: [] }));
    }

    async setBlocked(id, blocked) {
        const changes = blocked
            ? { isBlocked: true, blockedAt: new Date().toISOString() }
            : { isBlocked: false, blockedAt: null };
        return this.update(id, changes);
    }

    async isBlocked(id) {
        const [rows] = await this.pool().query('SELECT is_blocked FROM users WHERE id = ?', [id]);
        return rows[0] ? this.bool(rows[0].is_blocked) : false;
    }
}
