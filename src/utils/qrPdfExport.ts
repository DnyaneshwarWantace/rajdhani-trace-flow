import jsPDF from 'jspdf';

export interface QRItem {
  qr_code: string;
  roll_number?: string;
  id?: string;
}

export interface ProductInfo {
  name?: string;
  color?: string;
  pattern?: string;
  patternImageUrl?: string; // R2 image URL for pattern
  length?: string;
  length_unit?: string;
  width?: string;
  width_unit?: string;
  weight?: string;
  weight_unit?: string;
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

export async function downloadQRsAsPdf(
  items: QRItem[],
  pdfTitle: string,
  fileName: string,
  onProgress?: (done: number, total: number) => void,
  productInfo?: ProductInfo
): Promise<void> {
  const validItems = items.filter((i) => i.qr_code);
  if (validItems.length === 0) throw new Error('No QR codes to export');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = 210;
  const pageH = 297;
  const marginX = 10;
  const cols = 3;
  const qrSize = 44;
  const labelH = 12; // space below QR for roll + qr text
  const cellW = (pageW - marginX * 2) / cols;
  const cellH = qrSize + labelH + 6;

  // ── Pre-fetch pattern image if available ──────────────────────────────────
  let patternDataUrl: string | null = null;
  if (productInfo?.patternImageUrl) {
    try { patternDataUrl = await fetchImageAsDataUrl(productInfo.patternImageUrl); } catch { /* skip */ }
  }

  // ── Build header block ────────────────────────────────────────────────────
  // Header sits at top of every page; calculate its height first
  const headerMarginTop = 8;
  let headerHeight = 0;

  // We'll draw header after we know its height; calculate first pass
  const titleFontSize = 12;
  const infoFontSize = 7.5;
  const patternThumbSize = 14; // mm square

  // Title line
  headerHeight += 6; // title
  // Info line (color / pattern / dimensions)
  const hasInfo = productInfo && (productInfo.color || productInfo.pattern || productInfo.length || productInfo.width || productInfo.weight);
  if (hasInfo) headerHeight += 5;
  headerHeight += 3; // bottom padding / divider gap

  const contentStartY = headerMarginTop + headerHeight + 2;
  const rowsPerPage = Math.floor((pageH - contentStartY - 8) / cellH);

  // ── Helper: draw header on current page ──────────────────────────────────
  function drawHeader() {
    let curY = headerMarginTop;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(titleFontSize);
    doc.setTextColor(20, 20, 20);
    doc.text(pdfTitle, marginX, curY + 4);
    curY += 6;

    if (hasInfo && productInfo) {
      // Pattern thumbnail (left of info text)
      let textX = marginX;
      if (patternDataUrl) {
        doc.addImage(patternDataUrl, 'PNG', marginX, curY - 1, patternThumbSize, patternThumbSize);
        textX = marginX + patternThumbSize + 3;
        // adjust curY if thumb is taller than one line
        if (patternThumbSize > 5) {
          // anchor text to center of thumb
        }
      }

      // Info line
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(infoFontSize);
      doc.setTextColor(80, 80, 80);

      const parts: string[] = [];
      if (productInfo.color) parts.push(`Color: ${productInfo.color}`);
      if (productInfo.pattern) parts.push(`Pattern: ${productInfo.pattern}`);
      if (productInfo.length && productInfo.width)
        parts.push(`Size: ${productInfo.length}${productInfo.length_unit || 'm'} × ${productInfo.width}${productInfo.width_unit || 'm'}`);
      else if (productInfo.length)
        parts.push(`L: ${productInfo.length}${productInfo.length_unit || 'm'}`);
      if (productInfo.weight)
        parts.push(`GSM: ${productInfo.weight}${productInfo.weight_unit || ''}`);

      const infoText = parts.join('   |   ');
      // If thumb present, vertically center the text with it
      const textY = patternDataUrl ? curY + (patternThumbSize / 2) : curY + 3;
      doc.text(infoText, textX, textY, { maxWidth: pageW - textX - marginX });
    }

    // Divider line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(marginX, contentStartY - 1, pageW - marginX, contentStartY - 1);
  }

  // ── Draw cutting guides FIRST (behind content) on each page ──────────────
  const totalPages = Math.ceil(validItems.length / (cols * rowsPerPage));

  for (let p = 1; p <= totalPages; p++) {
    if (p > 1) doc.addPage();

    // Dashed cutting guides (drawn behind QR content)
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.25);

    const dashLen = 3;   // mm of dash
    const gapLen = 2;    // mm of gap

    function dashedLine(x1: number, y1: number, x2: number, y2: number) {
      const totalLen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const dx = (x2 - x1) / totalLen;
      const dy = (y2 - y1) / totalLen;
      let pos = 0;
      let drawing = true;
      while (pos < totalLen) {
        const segEnd = Math.min(pos + (drawing ? dashLen : gapLen), totalLen);
        if (drawing) {
          doc.line(x1 + dx * pos, y1 + dy * pos, x1 + dx * segEnd, y1 + dy * segEnd);
        }
        pos = segEnd;
        drawing = !drawing;
      }
    }

    // Vertical guides — between cells only, with a small gap around QR boxes
    const vGap = 3; // mm gap around QR so line doesn't touch box
    for (let c = 1; c < cols; c++) {
      const xg = marginX + c * cellW;
      dashedLine(xg, contentStartY + vGap, xg, contentStartY + rowsPerPage * cellH - vGap);
    }

    // Horizontal guides — between rows only
    const hGap = 3;
    for (let r = 1; r < rowsPerPage; r++) {
      const yg = contentStartY + r * cellH;
      dashedLine(marginX + hGap, yg, pageW - marginX - hGap, yg);
    }

    drawHeader();
  }

  // ── Draw QR codes ─────────────────────────────────────────────────────────
  let currentPage = 1;
  doc.setPage(1);

  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    const col = i % cols;
    const posInPage = Math.floor(i / cols) % rowsPerPage;
    const pageNum = Math.floor(i / (cols * rowsPerPage)) + 1;

    if (pageNum !== currentPage) {
      doc.setPage(pageNum);
      currentPage = pageNum;
    }

    const x = marginX + col * cellW;
    const y = contentStartY + posInPage * cellH;
    const imgX = x + (cellW - qrSize) / 2;

    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(item.qr_code)}`;
      const dataUrl = await fetchImageAsDataUrl(qrUrl);

      // Border + QR image
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.4);
      doc.rect(imgX - 1, y + 1, qrSize + 2, qrSize + 2);
      doc.addImage(dataUrl, 'PNG', imgX, y + 1, qrSize, qrSize);
    } catch {
      doc.setDrawColor(200, 200, 200);
      doc.rect(imgX - 1, y + 1, qrSize + 2, qrSize + 2);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text('QR Error', x + cellW / 2, y + qrSize / 2 + 1, { align: 'center' });
    }

    // Roll number (bold)
    const rollNo = item.roll_number || item.id || '—';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(20, 20, 20);
    doc.text(`Roll: ${rollNo}`, x + cellW / 2, y + qrSize + 6, { align: 'center', maxWidth: cellW - 4 });

    // QR code text (smaller)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(80, 80, 80);
    doc.text(`QR: ${item.qr_code}`, x + cellW / 2, y + qrSize + 10, { align: 'center', maxWidth: cellW - 4 });

    onProgress?.(i + 1, validItems.length);
  }

  doc.save(fileName);
}
