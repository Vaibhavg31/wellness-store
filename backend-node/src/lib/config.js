import fs from 'node:fs';

/**
 * Loads config.json's active environment block into process.env, mirroring
 * backend/lib/ConfigLoader.php exactly — same file, same "environment" key
 * picks which block, same "real env var always wins over the file" rule.
 */
export function loadConfig(configPath) {
    if (!fs.existsSync(configPath)) return;

    let json;
    try {
        json = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
        return;
    }
    if (!json || typeof json !== 'object') return;

    const environment = json.environment || 'development';
    const values = json[environment];
    if (!values || typeof values !== 'object') return;

    for (const [key, value] of Object.entries(values)) {
        if (Object.prototype.hasOwnProperty.call(process.env, key)) continue; // real env var wins
        process.env[key] = typeof value === 'string' ? value : String(value);
    }
}
