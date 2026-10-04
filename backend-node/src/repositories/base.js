import { getPool } from '../lib/db.js';

/**
 * MySQL base repository — mirrors backend/lib/Repository/MysqlRepository.php.
 * Subclasses implement tableName()/rowToArray()/arrayToRow() the same way.
 */
export class BaseRepository {
    tableName() {
        throw new Error('tableName() not implemented');
    }

    rowToArray(row) {
        throw new Error('rowToArray() not implemented');
    }

    arrayToRow(data) {
        throw new Error('arrayToRow() not implemented');
    }

    pool() {
        return getPool();
    }

    async getAll() {
        const [rows] = await this.pool().query(`SELECT * FROM \`${this.tableName()}\``);
        return rows.map((r) => this.rowToArray(r));
    }

    async getById(id) {
        const [rows] = await this.pool().query(`SELECT * FROM \`${this.tableName()}\` WHERE id = ?`, [id]);
        return rows[0] ? this.rowToArray(rows[0]) : null;
    }

    async create(data) {
        const row = this.arrayToRow(data);
        if (data.id !== undefined) row.id = data.id;

        const cols = Object.keys(row);
        const placeholders = cols.map(() => '?').join(', ');
        const colList = cols.map((c) => `\`${c}\``).join(', ');
        const sql = `INSERT INTO \`${this.tableName()}\` (${colList}) VALUES (${placeholders})`;
        await this.pool().query(sql, Object.values(row));
        return data;
    }

    async update(id, changes) {
        const existing = await this.getById(id);
        if (!existing) return null;

        const row = this.arrayToRow(changes);
        if (Object.keys(row).length === 0) return existing;

        const sets = Object.keys(row).map((c) => `\`${c}\` = ?`).join(', ');
        const sql = `UPDATE \`${this.tableName()}\` SET ${sets} WHERE id = ?`;
        await this.pool().query(sql, [...Object.values(row), id]);
        return this.getById(id);
    }

    async delete(id) {
        const [result] = await this.pool().query(`DELETE FROM \`${this.tableName()}\` WHERE id = ?`, [id]);
        return result.affectedRows > 0;
    }

    async findBy(dbCol, value) {
        const [rows] = await this.pool().query(`SELECT * FROM \`${this.tableName()}\` WHERE \`${dbCol}\` = ?`, [value]);
        return rows.map((r) => this.rowToArray(r));
    }

    async findOneBy(dbCol, value) {
        const [rows] = await this.pool().query(`SELECT * FROM \`${this.tableName()}\` WHERE \`${dbCol}\` = ? LIMIT 1`, [value]);
        return rows[0] ? this.rowToArray(rows[0]) : null;
    }

    /** Nullable ISO-8601 string -> MySQL DATETIME string, or null. */
    toDbDatetime(iso) {
        if (iso === null || iso === undefined || iso === '') return null;
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString().slice(0, 19).replace('T', ' ');
    }

    /** MySQL DATETIME value (string or Date) -> ISO-8601, or null. */
    toIso(dt) {
        if (dt === null || dt === undefined || dt === '') return null;
        const d = dt instanceof Date ? dt : new Date(String(dt).replace(' ', 'T') + 'Z');
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString();
    }

    bool(v) {
        return Boolean(v);
    }

    intOrNull(v) {
        return v === null || v === undefined ? null : Number.parseInt(v, 10);
    }

    floatOrNull(v) {
        return v === null || v === undefined ? null : Number.parseFloat(v);
    }
}
