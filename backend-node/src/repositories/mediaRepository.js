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

    /**
     * Where an uploaded file is still shown on the store: product photos and their packs, ingredients, categories,
     * banners, offers, bundles, Instagram tiles, review photos and the website content. Returns short labels such as
     * 'Product "Aloe Vera Juice"' (at most `limit`), so the admin can be warned before a picture vanishes from a page.
     * Past orders are not counted: they keep their own copy of the price and title, and only lose the thumbnail.
     */
    async findUsage(url, limit = 8) {
        if (!url) return [];
        const like = `%${String(url).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
        const checks = [
            ['SELECT DISTINCT p.title AS label FROM product_images i JOIN products p ON p.id = i.product_id WHERE i.url = ?', url, (l) => `Product "${l}"`],
            ['SELECT DISTINCT p.title AS label FROM product_variants v JOIN products p ON p.id = v.product_id WHERE v.image = ?', url, (l) => `Product "${l}" (pack picture)`],
            ['SELECT DISTINCT p.title AS label FROM product_ingredients g JOIN products p ON p.id = g.product_id WHERE g.image = ?', url, (l) => `Product "${l}" (ingredient)`],
            ['SELECT title AS label FROM products WHERE extras_json LIKE ?', like, (l) => `Product "${l}" (banners, reels or sections)`],
            ['SELECT label FROM categories WHERE image = ?', url, (l) => `Category "${l}"`],
            ['SELECT title AS label FROM promo_banners WHERE image = ? OR mobile_image = ?', [url, url], (l) => `Banner "${l || 'untitled'}"`],
            ['SELECT title AS label FROM offers WHERE image = ? OR mobile_image = ?', [url, url], (l) => `Offer "${l}"`],
            ['SELECT title AS label FROM bundles WHERE image = ?', url, (l) => `Bundle "${l}"`],
            ['SELECT COUNT(*) AS label FROM site_instagram_images WHERE url = ? HAVING COUNT(*) > 0', url, () => 'Instagram section on the homepage'],
            ['SELECT COUNT(*) AS label FROM reviews WHERE images LIKE ? HAVING COUNT(*) > 0', like, (n) => `${n} customer review${Number(n) === 1 ? '' : 's'}`],
            [`SELECT 1 AS label FROM site_settings WHERE CONCAT_WS(' ', extras_json, popup_image, video_banner_url, video_banner_poster,
                about_story_image, quality_promise_image, hero_video_url, hero_video_poster) LIKE ? LIMIT 1`, like, () => 'Website content (Content or Settings page)'],
        ];
        const found = [];
        for (const [sql, params, label] of checks) {
            try {
                const [rows] = await this.pool().query(sql, Array.isArray(params) ? params : [params]);
                for (const row of rows) found.push(label(row.label));
            } catch {
                // A table this database does not have (older installs) simply has nothing to report.
            }
            if (found.length >= limit) break;
        }
        return [...new Set(found)].slice(0, limit);
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
