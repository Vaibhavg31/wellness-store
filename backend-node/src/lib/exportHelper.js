import PDFDocument from 'pdfkit';
import { SettingsRepository } from '../repositories/settingsRepository.js';

/**
 * Table export (CSV + PDF). Mirrors backend/lib/ExportHelper.php's intent —
 * a simple bordered table, landscape, paginated for wide exports — built
 * with pdfkit's drawing primitives instead of porting dompdf+HTML/CSS (a
 * headless-browser-sized dependency for one admin export feature).
 *
 * Also fixes a stale leftover: the PHP version's PDF footer literally says
 * "Krivéa Studio" (the brand this project was before the wellness/Chikit
 * rebrands) — this version uses the real brand name from site settings.
 */
export async function exportTablePdf(res, filename, title, headers, rows) {
    let brand = 'Chikit';
    try {
        const settings = await new SettingsRepository().get();
        brand = settings.brandName || brand;
    } catch {
        // keep default
    }

    const landscape = true;
    const doc = new PDFDocument({ size: headers.length > 15 ? 'A3' : 'A4', layout: landscape ? 'landscape' : 'portrait', margin: 24 });

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    const fontSize = headers.length > 18 ? 6 : headers.length > 12 ? 7 : headers.length > 8 ? 8 : 9;
    doc.fontSize(14).text(title, { continued: false });
    doc.fontSize(8).fillColor('#666').text(`Generated ${new Date().toLocaleString('en-GB')} · ${brand}`);
    doc.moveDown(0.5);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = pageWidth / headers.length;
    const rowHeight = fontSize + 10;

    function drawRow(cells, y, isHeader) {
        doc.fontSize(fontSize);
        let x = doc.page.margins.left;
        for (const cell of cells) {
            doc.rect(x, y, colWidth, rowHeight).stroke('#cccccc');
            if (isHeader) doc.rect(x, y, colWidth, rowHeight).fill('#f3f3f3').fillColor('#000').stroke('#cccccc');
            doc.fillColor('#222').text(String(cell ?? ''), x + 3, y + 4, { width: colWidth - 6, height: rowHeight - 6, ellipsis: true });
            x += colWidth;
        }
    }

    let y = doc.y;
    drawRow(headers, y, true);
    y += rowHeight;

    for (const row of rows) {
        if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
            doc.addPage({ size: headers.length > 15 ? 'A3' : 'A4', layout: landscape ? 'landscape' : 'portrait', margin: 24 });
            y = doc.page.margins.top;
            drawRow(headers, y, true);
            y += rowHeight;
        }
        drawRow(row, y, false);
        y += rowHeight;
    }

    doc.end();
}
