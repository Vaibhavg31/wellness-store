import { BaseRepository } from './base.js';

export class NewsletterRepository extends BaseRepository {
    tableName() { return 'newsletter_subscribers'; }

    rowToArray(row) {
        return { id: row.id, email: row.email, source: row.source, createdAt: this.toIso(row.created_at) };
    }

    arrayToRow(data) {
        const map = { email: { col: 'email', type: 'string' }, source: { col: 'source', type: 'string' }, createdAt: { col: 'created_at', type: 'datetime' } };
        const row = {};
        for (const [key, meta] of Object.entries(map)) {
            if (!(key in data)) continue;
            row[meta.col] = meta.type === 'datetime' ? this.toDbDatetime(data[key]) : data[key];
        }
        return row;
    }

    async findByEmail(email) {
        const [rows] = await this.pool().query('SELECT * FROM newsletter_subscribers WHERE email = ? LIMIT 1', [email.toLowerCase().trim()]);
        return rows[0] ? this.rowToArray(rows[0]) : null;
    }
}
