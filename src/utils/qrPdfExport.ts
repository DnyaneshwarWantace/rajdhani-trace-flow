import jsPDF from 'jspdf';

export interface QRItem {
  qr_code: string;
  roll_number?: string;
  id?: string;
}

async function fetchImageAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generates a PDF with QR codes in a 3-per-row grid.
 * Below each QR: Roll No and QR No printed clearly.
 */
export async function downloadQRsAsPdf(
  items: QRItem[],
  pdfTitle: string,
  fileName: string,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const validItems = items.filter((i) => i.qr_code);
  if (validItems.length === 0) throw new Error('No QR codes to export');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = 210;
  const pageH = 297;
  const marginX = 10;
  const marginY = 14;
  const cols = 3;
  const qrSize = 50; // mm
  const labelHeight = 10; // mm for roll + qr text below QR
  const cellW = (pageW - marginX * 2) / cols;
  const cellH = qrSize + labelHeight + 6;

  // Title on first page
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(pdfTitle, marginX, marginY - 2);

  let x = 0;
  let y = 0;
  let col = 0;
  let row = 0;
  let page = 1;

  const rowsPerPage = Math.floor((pageH - marginY - 6) / cellH);

  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];

    col = i % cols;
    row = Math.floor(i / cols) % rowsPerPage;
    const pageNum = Math.floor(i / (cols * rowsPerPage)) + 1;

    if (pageNum > page) {
      doc.addPage();
      page = pageNum;
    }

    x = marginX + col * cellW;
    y = marginY + 4 + row * cellH;

    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(item.qr_code)}`;
      const dataUrl = await fetchImageAsDataUrl(qrUrl);

      // QR image centered in cell
      const imgX = x + (cellW - qrSize) / 2;
      doc.addImage(dataUrl, 'PNG', imgX, y, qrSize, qrSize);

      // Roll No below QR
      const rollNo = item.roll_number || item.id || '—';
      const qrNo = item.qr_code;

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(`Roll: ${rollNo}`, x + cellW / 2, y + qrSize + 4, { align: 'center', maxWidth: cellW - 2 });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text(`QR: ${qrNo}`, x + cellW / 2, y + qrSize + 8, { align: 'center', maxWidth: cellW - 2 });
    } catch {
      // Draw placeholder box on error
      doc.setDrawColor(200, 200, 200);
      doc.rect(x + (cellW - qrSize) / 2, y, qrSize, qrSize);
      doc.setFontSize(7);
      doc.text('QR Error', x + cellW / 2, y + qrSize / 2, { align: 'center' });
    }

    onProgress?.(i + 1, validItems.length);
  }

  doc.save(fileName);
}
