<?php

declare(strict_types=1);

namespace Krivea\Routes;

use Krivea\Auth;
use Krivea\Database;
use Krivea\ImageProcessor;
use Krivea\Repository\MediaRepository;
use Krivea\Response;

final class UploadRoutes
{
    private const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp'];
    private const MAX_SIZE = 5 * 1024 * 1024;

    private const ALLOWED_VIDEO_EXT = ['mp4', 'webm', 'mov'];
    private const MAX_VIDEO_SIZE = 20 * 1024 * 1024;

    public static function single(): void
    {
        Auth::requireAdmin();

        if (empty($_FILES['image'])) {
            Response::error('No image uploaded', 400);
        }

        $url = self::saveFile($_FILES['image']);
        Response::json(['url' => $url]);
    }

    /**
     * A banner video, saved as-is (no processing — PHP has no built-in video
     * codec support, unlike ImageProcessor for images). The browser detects
     * and reports the video's own pixel dimensions before upload; that's
     * validated here only to the extent of trusting the client sends sane
     * numbers, and is purely informational for the admin UI, never used for
     * anything security-sensitive.
     */
    public static function video(): void
    {
        Auth::requireAdmin();

        if (empty($_FILES['video'])) {
            Response::error('No video uploaded', 400);
        }

        $file = $_FILES['video'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            Response::error(self::uploadErrorMessage($file['error']), 400);
        }
        if ($file['size'] > self::MAX_VIDEO_SIZE) {
            $maxMb = (int) (self::MAX_VIDEO_SIZE / (1024 * 1024));
            Response::error("Video too large (max {$maxMb}MB). Trim or compress it and try again.", 400);
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, self::ALLOWED_VIDEO_EXT, true)) {
            Response::error('Only MP4, WebM, and MOV videos are allowed', 400);
        }

        $filename = 'video-' . time() . '-' . substr(bin2hex(random_bytes(4)), 0, 6) . '.' . $ext;
        $dest = Database::uploadsDir() . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            Response::error('Failed to save file', 500);
        }

        $url = '/uploads/' . $filename;

        try {
            $size = @filesize($dest) ?: null;
            (new MediaRepository())->record($url, $filename, $file['type'] ?: 'video/mp4', $size);
        } catch (\Throwable) {
            // ignore — media library entry is best-effort
        }

        Response::json(['url' => $url]);
    }

    public static function multiple(): void
    {
        Auth::requireAdmin();

        if (empty($_FILES['images'])) {
            Response::error('No images uploaded', 400);
        }

        $files = self::normalizeFileList($_FILES['images']);
        $count = count($files);

        if ($count === 0) {
            Response::error('No images uploaded', 400);
        }

        if ($count > 10) {
            Response::error('Maximum 10 images allowed', 400);
        }

        $urls = [];
        foreach ($files as $file) {
            $urls[] = self::saveFile($file);
        }

        Response::json(['urls' => $urls]);
    }

    /**
     * Photo reviews — any signed-in customer, not just admins, which is why
     * this doesn't just reuse multiple() above (that one is intentionally
     * admin-only). Capped smaller than the admin uploader on both count and
     * per-file size: this is public-facing input from anyone with an
     * account, not a trusted back-office tool.
     */
    private const MAX_REVIEW_IMAGES = 4;
    private const MAX_REVIEW_IMAGE_SIZE = 3 * 1024 * 1024;

    public static function reviewImages(): void
    {
        Auth::requireCustomer();

        if (empty($_FILES['images'])) {
            Response::error('No images uploaded', 400);
        }

        $files = self::normalizeFileList($_FILES['images']);
        $count = count($files);

        if ($count === 0) {
            Response::error('No images uploaded', 400);
        }

        if ($count > self::MAX_REVIEW_IMAGES) {
            Response::error('Maximum ' . self::MAX_REVIEW_IMAGES . ' photos per review', 400);
        }

        $urls = [];
        foreach ($files as $file) {
            if ($file['size'] > self::MAX_REVIEW_IMAGE_SIZE) {
                $maxMb = (int) (self::MAX_REVIEW_IMAGE_SIZE / (1024 * 1024));
                Response::error("Each photo must be under {$maxMb}MB", 400);
            }
            $urls[] = self::saveFile($file);
        }

        Response::json(['urls' => $urls]);
    }

    /**
     * PHP uses a flat structure for one uploaded file and arrays for multiple files
     * with the same field name. Normalize both into a list of file arrays.
     *
     * @param array<string, mixed> $input
     * @return list<array{name: string, type: string, tmp_name: string, error: int, size: int}>
     */
    private static function normalizeFileList(array $input): array
    {
        if (!isset($input['name'], $input['type'], $input['tmp_name'], $input['error'], $input['size'])) {
            return [];
        }

        if (!is_array($input['name'])) {
            return [[
                'name' => (string) $input['name'],
                'type' => (string) $input['type'],
                'tmp_name' => (string) $input['tmp_name'],
                'error' => (int) $input['error'],
                'size' => (int) $input['size'],
            ]];
        }

        $files = [];
        $count = count($input['name']);
        for ($i = 0; $i < $count; $i++) {
            $files[] = [
                'name' => (string) $input['name'][$i],
                'type' => (string) ($input['type'][$i] ?? ''),
                'tmp_name' => (string) ($input['tmp_name'][$i] ?? ''),
                'error' => (int) ($input['error'][$i] ?? UPLOAD_ERR_NO_FILE),
                'size' => (int) ($input['size'][$i] ?? 0),
            ];
        }

        return $files;
    }

    /** @param array{name: string, type: string, tmp_name: string, error: int, size: int} $file */
    private static function saveFile(array $file): string
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            Response::error(self::uploadErrorMessage($file['error']), 400);
        }

        if ($file['size'] > self::MAX_SIZE) {
            Response::error('File too large (max 5MB)', 400);
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, self::ALLOWED_EXT, true)) {
            Response::error('Only JPG, PNG, and WebP images are allowed', 400);
        }

        $filename = 'product-' . time() . '-' . substr(bin2hex(random_bytes(4)), 0, 6) . '.' . $ext;
        $dest = Database::uploadsDir() . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            Response::error('Failed to save file', 500);
        }

        $finalExt = ImageProcessor::process($dest, $ext);
        if ($finalExt !== $ext) {
            $newFilename = preg_replace('/\.[^.]+$/', '.' . $finalExt, $filename);
            $newDest = Database::uploadsDir() . '/' . $newFilename;
            if (@rename($dest, $newDest)) {
                $filename = $newFilename;
                $dest = $newDest;
            }
        }

        $url = '/uploads/' . $filename;

        // Best-effort catalog entry for the admin Media Library. Never fails
        // the upload itself (e.g. if migration 002 hasn't run yet).
        try {
            $size = @filesize($dest) ?: null;
            (new MediaRepository())->record($url, $filename, $file['type'] ?: null, $size);
        } catch (\Throwable) {
            // ignore
        }

        return $url;
    }

    private static function uploadErrorMessage(int $code): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'File too large (max 5MB)',
            UPLOAD_ERR_PARTIAL => 'Upload incomplete, please try again',
            UPLOAD_ERR_NO_FILE => 'No file uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Server upload folder is not configured',
            UPLOAD_ERR_CANT_WRITE => 'Server could not write the uploaded file',
            UPLOAD_ERR_EXTENSION => 'Upload blocked by server configuration',
            default => 'Upload failed',
        };
    }
}
