import { getPool } from '../lib/db.js';

/** Catalog of uploaded files (media_library table) — mirrors MediaRepository.php. */
export class MediaRepository {
    pool() { return getPool(); }

    async list() {
        const [rows] = await this.pool().query('SELECT * FROM media_library ORDER BY created_at DESC');
        return rows.map((r) => this.rowToArray(r));
    }

    async record(url, filename, mimeType, sizeBytes, uploadedBy = 'admin') {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await this.pool().query(
            `INSERT INTO media_library (url, filename, mime_type, size_bytes, alt_text, uploaded_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE filename = VALUES(filename)`,
            [url, filename, mimeType, sizeBytes, '', uploadedBy, now],
        );
        const [rows] = await this.pool().query('SELECT * FROM media_library WHERE url = ? LIMIT 1', [url]);
        return rows[0] ? this.rowToArray(rows[0]) : {};
    }

    async findById(id) {
        const [rows] = await this.pool().query('SELECT * FROM media_library WHERE id = ? LIMIT 1', [id]);
        return rows[0] ? this.rowToArray(rows[0]) : null;
    }

    async delete(id) {
        const [result] = await this.pool().query('DELETE FROM media_library WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    rowToArray(row) {
        return {
            id: Number(row.id),
            url: row.url,
            filename: row.filename,
            mimeType: row.mime_type,
            sizeBytes: row.size_bytes !== null ? Number(row.size_bytes) : null,
            width: row.width !== null ? Number(row.width) : null,
            height: row.height !== null ? Number(row.height) : null,
            altText: row.alt_text,
            uploadedBy: row.uploaded_by,
            createdAt: row.created_at,
        };
    }
}
