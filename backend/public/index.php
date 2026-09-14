<?php
$uri  = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($uri, PHP_URL_PATH) ?? '/';
$base = dirname(__DIR__);

if (str_starts_with($path, '/uploads/')) {
    $file = $base . '/uploads' . substr($path, 8);
    if (!file_exists($file) || !is_file($file)) {
        http_response_code(404);
        exit;
    }

    $mimeTypes = [
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png'  => 'image/png',
        'webp' => 'image/webp',
        'gif'  => 'image/gif',
    ];
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    header('Content-Type: ' . ($mimeTypes[$ext] ?? 'application/octet-stream'));
    header('Content-Length: ' . filesize($file));
    // Upload filenames are content-addressed (timestamp + random hex, never
    // reused/overwritten — see UploadRoutes::saveFile), so it's safe to tell
    // the browser to cache them forever. Previously these had zero cache
    // headers, meaning every product image re-downloaded on every page view.
    header('Cache-Control: public, max-age=31536000, immutable');
    readfile($file);
    exit;
}

// Transparently gzip every response (JSON API + this script's own output)
// when the client supports it — API payloads grow with catalog/order size,
// and this was previously sent uncompressed.
if (!ob_start('ob_gzhandler')) {
    ob_start();
}

require $base . '/vendor/autoload.php';

use Wellness\ConfigLoader;
use Wellness\Cors;
use Wellness\Database;
use Wellness\RateLimiter;
use Wellness\Router;

// Single app-wide config file — normally at the repo root (config.json
// itself explains why), but if you deploy backend/ as a standalone unit
// with its own copy alongside it, that copy is used instead.
$configPath = file_exists($base . '/config.json') ? $base . '/config.json' : dirname($base) . '/config.json';
ConfigLoader::load($configPath);

Database::init($base);
RateLimiter::init($base);
Cors::handle();
Router::dispatch($_SERVER['REQUEST_METHOD'] ?? 'GET', $uri);