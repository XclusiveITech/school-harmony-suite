// Shared CSV + PDF export helpers using jsPDF + autoTable.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportCSV(filename: string, head: string[], body: (string | number)[][]) {
  const rows = [head, ...body];
  const csv = rows
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface PDFExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  filters?: Record<string, string | undefined>;
  head: string[];
  body: (string | number)[][];
  schoolName?: string;
}

export function exportPDF(opts: PDFExportOptions) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(opts.schoolName ?? 'Brainstar School', pageWidth / 2, 32, { align: 'center' });

  doc.setFontSize(12);
  doc.text(opts.title, pageWidth / 2, 50, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (opts.subtitle) doc.text(opts.subtitle, pageWidth / 2, 64, { align: 'center' });

  let y = opts.subtitle ? 78 : 64;
  if (opts.filters) {
    const parts = Object.entries(opts.filters)
      .filter(([, v]) => v && v !== 'All')
      .map(([k, v]) => `${k}: ${v}`);
    if (parts.length) {
      doc.text(parts.join('   |   '), 40, y);
      y += 12;
    }
  }

  autoTable(doc, {
    startY: y + 4,
    head: [opts.head],
    body: opts.body.map(r => r.map(c => String(c ?? ''))),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 40, right: 40 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Generated ${new Date().toLocaleString()}   ·   Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 18,
      { align: 'center' },
    );
  }

  doc.save(`${opts.filename}.pdf`);
}
