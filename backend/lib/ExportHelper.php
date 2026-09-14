<?php

declare(strict_types=1);

namespace Wellness;

final class ExportHelper
{
    /** @param array<int, string> $headers */
    /** @param array<int, array<int, string>> $rows */
    public static function tableHtml(string $title, array $headers, array $rows): string
    {
        $colCount = count($headers);
        $fontSize = self::fontSizeForColumns($colCount);
        $cellPadding = $colCount > 12 ? '2px 3px' : '4px 6px';

        $headCells = '';
        foreach ($headers as $header) {
            $headCells .= '<th>' . htmlspecialchars($header, ENT_QUOTES, 'UTF-8') . '</th>';
        }

        $bodyRows = '';
        foreach ($rows as $row) {
            $cells = '';
            foreach ($row as $cell) {
                $cells .= '<td>' . htmlspecialchars((string) $cell, ENT_QUOTES, 'UTF-8') . '</td>';
            }
            $bodyRows .= '<tr>' . $cells . '</tr>';
        }

        $safeTitle = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
        $generated = htmlspecialchars(date('d M Y, H:i'), ENT_QUOTES, 'UTF-8');

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    margin: 10mm 8mm 12mm 8mm;
  }
  html, body {
    margin: 0;
    padding: 0;
  }
  body {
    font-family: DejaVu Sans, Arial, sans-serif;
    font-size: {$fontSize};
    line-height: 1.25;
    color: #222;
  }
  h1 {
    font-size: 16px;
    margin: 0 0 4px;
    page-break-after: avoid;
  }
  p.meta {
    font-size: {$fontSize};
    color: #666;
    margin: 0 0 12px;
    page-break-after: avoid;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    page-break-inside: auto;
  }
  thead {
    display: table-header-group;
  }
  tbody {
    display: table-row-group;
  }
  tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  th, td {
    border: 1px solid #ccc;
    padding: {$cellPadding};
    text-align: left;
    vertical-align: top;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  th {
    background: #f3f3f3;
    font-weight: 600;
  }
  tr:nth-child(even) td {
    background: #fafafa;
  }
</style>
</head>
<body>
  <h1>{$safeTitle}</h1>
  <p class="meta">Generated {$generated} &middot; Kriv&#233;a Studio</p>
  <table>
    <thead><tr>{$headCells}</tr></thead>
    <tbody>{$bodyRows}</tbody>
  </table>
</body>
</html>
HTML;
    }

    /** @param array<int, string> $headers */
    /** @param array<int, array<int, string>> $rows */
    public static function exportTablePdf(string $filename, string $title, array $headers, array $rows): never
    {
        $html = self::tableHtml($title, $headers, $rows);
        $paper = count($headers) > 15 ? 'A3' : 'A4';
        Response::pdf($filename, $html, $paper, 'landscape');
    }

    private static function fontSizeForColumns(int $colCount): string
    {
        if ($colCount > 18) {
            return '6px';
        }
        if ($colCount > 12) {
            return '7px';
        }
        if ($colCount > 8) {
            return '8px';
        }

        return '9px';
    }
}
