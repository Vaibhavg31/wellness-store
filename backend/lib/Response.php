<?php

declare(strict_types=1);

namespace Wellness;

/**
 * JSON response helpers — keeps every endpoint consistent.
 */
final class Response
{
    /**
     * @param int $cacheSeconds When > 0, lets the browser skip re-fetching on
     *   quick back/forward navigation. Only use on public GET responses whose
     *   staleness for a few seconds is harmless (settings, catalog listings) —
     *   never on anything user-specific, mutating, or requiring freshness.
     */
    public static function json(mixed $data, int $status = 200, int $cacheSeconds = 0): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        if ($cacheSeconds > 0) {
            header("Cache-Control: public, max-age={$cacheSeconds}");
        }
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function error(string $message, int $status = 400): never
    {
        self::json(['error' => $message], $status);
    }

    /** Stream a CSV file download. */
    public static function csv(string $filename, array $headers, array $rows): never
    {
        http_response_code(200);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');

        $out = fopen('php://output', 'w');
        if ($out === false) {
            self::error('Failed to generate export', 500);
        }

        // UTF-8 BOM so Excel opens special characters correctly.
        fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF));
        fputcsv($out, $headers);
        foreach ($rows as $row) {
            fputcsv($out, $row);
        }
        fclose($out);
        exit;
    }

    /** Stream a PDF file download generated from HTML. */
    public static function pdf(
        string $filename,
        string $html,
        string $paper = 'A4',
        string $orientation = 'landscape',
    ): never {
        if (!class_exists(\Dompdf\Dompdf::class)) {
            self::error('PDF export is not available. Run composer install in the backend folder.', 500);
        }

        $options = new \Dompdf\Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'DejaVu Sans');

        $dompdf = new \Dompdf\Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper($paper, $orientation);
        $dompdf->render();

        http_response_code(200);
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        echo $dompdf->output();
        exit;
    }
}
