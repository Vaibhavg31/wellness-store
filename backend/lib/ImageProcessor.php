<?php

declare(strict_types=1);

namespace Wellness;

/**
 * Resize and compress uploaded images for web delivery.
 * Requires the PHP GD extension.
 */
final class ImageProcessor
{
    /** Max width/height for product & category images. */
    private const MAX_DIMENSION = 1600;

    /** JPEG/WebP quality (0–100). */
    private const QUALITY = 85;

    /**
     * Process an image file in place: auto-orient, downscale, recompress.
     * Returns the final extension (may change png → webp when beneficial).
     */
    public static function process(string $path, string $ext): string
    {
        if (!extension_loaded('gd')) {
            return $ext;
        }

        $ext = strtolower($ext);
        $image = self::loadImage($path, $ext);
        if ($image === null) {
            return $ext;
        }

        $image = self::applyExifOrientation($image, $path, $ext);

        $width = imagesx($image);
        $height = imagesy($image);
        $maxSide = max($width, $height);

        if ($maxSide > self::MAX_DIMENSION) {
            $scale = self::MAX_DIMENSION / $maxSide;
            $newW = (int) round($width * $scale);
            $newH = (int) round($height * $scale);
            $resized = imagecreatetruecolor($newW, $newH);
            if ($resized === false) {
                imagedestroy($image);
                return $ext;
            }
            imagealphablending($resized, false);
            imagesavealpha($resized, true);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $newW, $newH, $width, $height);
            imagedestroy($image);
            $image = $resized;
        }

        $outExt = $ext;
        if (in_array($ext, ['png', 'jpg', 'jpeg'], true) && $width * $height > 400_000) {
            $outExt = 'webp';
        }

        self::saveImage($image, $path, $outExt);
        imagedestroy($image);

        return $outExt;
    }

    /** @return \GdImage|null */
    private static function loadImage(string $path, string $ext): ?\GdImage
    {
        return match ($ext) {
            'jpg', 'jpeg' => @imagecreatefromjpeg($path) ?: null,
            'png' => @imagecreatefrompng($path) ?: null,
            'webp' => function_exists('imagecreatefromwebp') ? (@imagecreatefromwebp($path) ?: null) : null,
            default => null,
        };
    }

    /** @param \GdImage $image */
    private static function saveImage(\GdImage $image, string $path, string $ext): void
    {
        match ($ext) {
            'webp' => function_exists('imagewebp')
                ? imagewebp($image, $path, self::QUALITY)
                : imagejpeg($image, $path, self::QUALITY),
            'png' => imagepng($image, $path, 6),
            default => imagejpeg($image, $path, self::QUALITY),
        };
    }

    /**
     * Apply EXIF orientation for JPEG uploads from mobile cameras.
     *
     * @param \GdImage $image
     */
    private static function applyExifOrientation(\GdImage $image, string $path, string $ext): \GdImage
    {
        if (!in_array($ext, ['jpg', 'jpeg'], true) || !function_exists('exif_read_data')) {
            return $image;
        }

        $exif = @exif_read_data($path);
        $orientation = (int) ($exif['Orientation'] ?? 1);

        return match ($orientation) {
            3 => imagerotate($image, 180, 0) ?: $image,
            6 => imagerotate($image, -90, 0) ?: $image,
            8 => imagerotate($image, 90, 0) ?: $image,
            default => $image,
        };
    }
}
