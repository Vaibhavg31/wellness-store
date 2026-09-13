import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Reads config.json's ACTIVE environment block — the single app-wide config
 * file used by both the PHP backend (see backend/lib/ConfigLoader.php) and
 * this frontend. Vite only auto-loads files named .env*, so we read this one
 * ourselves and inject its VITE_* keys via `define`, which makes every
 * existing `import.meta.env.VITE_X` reference in the app keep working
 * completely unchanged.
 */
function loadActiveConfig(filePath) {
  if (!fs.existsSync(filePath)) return {}

  const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const values = json[json.environment]
  return values && typeof values === 'object' ? values : {}
}

const activeConfig = loadActiveConfig(path.resolve(__dirname, 'config.json'))

// A shell-level env var (e.g. `VITE_SKIP_PHONE_VERIFY=false vite`, used by
// the `dev:web:prod-like` script) wins over config.json's value — mirroring
// how the PHP side already behaves (ConfigLoader never overrides a variable
// the environment already set).
const viteEnvDefines = Object.fromEntries(
  Object.entries(activeConfig)
    .filter(([key]) => key.startsWith('VITE_'))
    .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(process.env[key] ?? value)]),
)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: viteEnvDefines,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Bind to all interfaces (not just localhost) so devices on the same
    // Wi-Fi/LAN — e.g. a phone — can reach the dev server via this PC's
    // local IP (see README "Testing on your phone").
    host: true,
    // Fixed port so this project never collides with, or silently swaps
    // places with, the other storefronts in the workspace (KriveaJewels,
    // VG Clothing, modern-interiors) — each has its own dedicated port.
    // strictPort makes Vite fail fast instead of silently binding the next
    // free port, which is what let a stale/orphaned dev server from another
    // project quietly answer requests meant for this one.
    port: 5173,
    strictPort: true,
    // Backend JSON stores (orders, rate limits, etc.) must not trigger a dev reload.
    watch: {
      ignored: ['**/backend/data/**'],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['@imgly/background-removal'],
  },
})
