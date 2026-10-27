import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './lib/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../'); // backend-node/src -> repo root

// Same root config.json both backends read — see config.json itself.
loadConfig(path.join(repoRoot, 'config.json'));

const { initDatabase } = await import('./lib/db.js');
initDatabase(path.resolve(__dirname, '..')); // backend-node/uploads

const { createApp } = await import('./app.js');
const app = createApp();

// 8000 matches vite.config.js's /api and /uploads proxy target — same port
// the PHP backend used, so no frontend config changes on cutover.
const port = Number(process.env.NODE_PORT || process.env.PORT || 8000);
app.listen(port, () => {
    console.log(`[chikit-backend-node] listening on http://127.0.0.1:${port}`);
});
