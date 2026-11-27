import { jsPDF } from 'jspdf';
import { paginateDocument } from '../abnt/formatter';
import { AbntDocument } from '../abnt/types';

export function sanitizeFileName(name: string): string {
  return (
    (name || 'trabalho-abnt')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'trabalho-abnt'
  );
}

export async function exportDocumentToPdf(doc: AbntDocument): Promise<void> {
  const paginated = paginateDocument(doc);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const baseFont = doc.formatting.fontFamily === 'Arial' ? 'helvetica' : 'times';
  const { marginsCm, bodyFontSizePt, quoteFontSizePt, lineSpacing, paragraphIndentCm, quoteIndentCm } =
    doc.formatting;

  const leftMm = marginsCm.left * 10;
  const rightMm = marginsCm.right * 10;
  const topMm = marginsCm.top * 10;
  const bottomMm = marginsCm.bottom * 10;
  const contentWidthMm = 210 - leftMm - rightMm;
  const ptToMm = 0.3528;

  for (let pIdx = 0; pIdx < paginated.pages.length; pIdx++) {
    if (pIdx > 0) pdf.addPage('a4', 'portrait');
    const page = paginated.pages[pIdx];

    // Page number (2cm from top, aligned right at 210 - rightMm)
    if (page.displayPageNumber !== null) {
      pdf.setFont(baseFont, 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(30, 30, 30);
      pdf.text(String(page.displayPageNumber), 210 - rightMm, 20, { align: 'right' });
    }

    let y = topMm;
    pdf.setTextColor(15, 15, 15);

    for (const el of page.elements) {
      if (el.kind === 'cover_block') {
        const isFolhaRosto = el.text === 'folha_rosto';
        pdf.setFont(baseFont, 'bold');
        pdf.setFontSize(12);

        if (!isFolhaRosto) {
          pdf.text((doc.metadata.institution || '').toUpperCase(), leftMm + contentWidthMm / 2, topMm + 4, {
            align: 'center',
            maxWidth: contentWidthMm,
          });
          if (doc.metadata.course) {
            pdf.setFont(baseFont, 'normal');
            pdf.text((doc.metadata.course || '').toUpperCase(), leftMm + contentWidthMm / 2, topMm + 12, {
              align: 'center',
              maxWidth: contentWidthMm,
            });
          }
          pdf.setFont(baseFont, 'bold');
          pdf.text((doc.metadata.author || '').toUpperCase(), leftMm + contentWidthMm / 2, topMm + 38, {
            align: 'center',
            maxWidth: contentWidthMm,
          });
        } else {
          pdf.text((doc.metadata.author || '').toUpperCase(), leftMm + contentWidthMm / 2, topMm + 6, {
            align: 'center',
            maxWidth: contentWidthMm,
          });
        }

        // Title centered vertically around 125mm
        pdf.setFont(baseFont, 'bold');
        pdf.setFontSize(14);
        const titleStr = (doc.metadata.title || 'TÍTULO DO TRABALHO').toUpperCase();
        const titleLines = pdf.splitTextToSize(titleStr, contentWidthMm);
        pdf.text(titleLines, leftMm + contentWidthMm / 2, 128, { align: 'center' });

        if (doc.metadata.subtitle) {
          pdf.setFont(baseFont, 'normal');
          pdf.setFontSize(12);
          const subLines = pdf.splitTextToSize(doc.metadata.subtitle, contentWidthMm);
          pdf.text(subLines, leftMm + contentWidthMm / 2, 128 + titleLines.length * 7 + 3, { align: 'center' });
        }

        if (isFolhaRosto && doc.metadata.natureNote) {
          const natureLeft = leftMm + contentWidthMm * 0.48;
          const natureWidth = contentWidthMm * 0.52;
          pdf.setFont(baseFont, 'normal');
          pdf.setFontSize(10);
          const natureLines = pdf.splitTextToSize(
            `${doc.metadata.natureNote}${doc.metadata.advisor ? `\n\nOrientador(a): ${doc.metadata.advisor}` : ''}`,
            natureWidth
          );
          pdf.text(natureLines, natureLeft, 165, { align: 'justify', maxWidth: natureWidth });
        }

        // City and Year at bottom
        pdf.setFont(baseFont, 'normal');
        pdf.setFontSize(12);
        pdf.text((doc.metadata.city || '').toUpperCase(), leftMm + contentWidthMm / 2, 297 - bottomMm - 10, {
          align: 'center',
        });
        pdf.text(doc.metadata.year || '', leftMm + contentWidthMm / 2, 297 - bottomMm - 3, {
          align: 'center',
        });
        continue;
      }

      if (el.kind === 'approval_block') {
        pdf.setFont(baseFont, 'bold');
        pdf.setFontSize(12);
        pdf.text((doc.metadata.author || '').toUpperCase(), leftMm + contentWidthMm / 2, topMm + 6, {
          align: 'center',
        });
        pdf.text((doc.metadata.title || '').toUpperCase(), leftMm + contentWidthMm / 2, topMm + 36, {
          align: 'center',
          maxWidth: contentWidthMm,
        });
        pdf.setFont(baseFont, 'normal');
        pdf.setFontSize(10);
        const natureLines = pdf.splitTextToSize(doc.metadata.natureNote || '', contentWidthMm * 0.52);
        pdf.text(natureLines, leftMm + contentWidthMm * 0.48, topMm + 70, {
          align: 'justify',
          maxWidth: contentWidthMm * 0.52,
        });
        pdf.setFontSize(12);
        pdf.text(
          `Aprovado em: ${doc.metadata.approvalDate || '____ / ____ / ______'}`,
          leftMm,
          topMm + 120
        );
        pdf.setFont(baseFont, 'bold');
        pdf.text('BANCA EXAMINADORA', leftMm + contentWidthMm / 2, topMm + 142, { align: 'center' });
        pdf.setFont(baseFont, 'normal');
        const members = [doc.metadata.advisor, ...(doc.metadata.bancaMembers || [])].filter(Boolean);
        let by = topMm + 162;
        for (const m of members) {
          pdf.line(leftMm + 25, by, 210 - rightMm - 25, by);
          pdf.text(m, leftMm + contentWidthMm / 2, by + 5, { align: 'center' });
          by += 20;
        }
        continue;
      }

      if (el.kind === 'epigraph_block') {
        pdf.setFont(baseFont, 'italic');
        pdf.setFontSize(11);
        const epLines = pdf.splitTextToSize(el.text || '', contentWidthMm * 0.55);
        const epY = 297 - bottomMm - 45;
        pdf.text(epLines, leftMm + contentWidthMm * 0.45, epY, {
          align: 'right',
          maxWidth: contentWidthMm * 0.55,
        });
        if (el.caption) {
          pdf.setFont(baseFont, 'normal');
          pdf.text(`(${el.caption})`, 210 - rightMm, epY + epLines.length * 5.5 + 4, { align: 'right' });
        }
        continue;
      }

      if (el.kind === 'reviewed_work_header') {
        pdf.setFont(baseFont, 'bold');
        pdf.setFontSize(14);
        const tLines = pdf.splitTextToSize((doc.metadata.title || '').toUpperCase(), contentWidthMm);
        pdf.text(tLines, leftMm + contentWidthMm / 2, y + 4, { align: 'center' });
        y += tLines.length * 6.5 + 3;
        pdf.setFont(baseFont, 'normal');
        pdf.setFontSize(11);
        pdf.text(doc.metadata.author || '', leftMm + contentWidthMm / 2, y, { align: 'center' });
        y += 6;
        if (doc.metadata.reviewedWorkRef) {
          pdf.setFontSize(10);
          const refLines = pdf.splitTextToSize(`Obra resenhada: ${doc.metadata.reviewedWorkRef}`, contentWidthMm);
          pdf.text(refLines, leftMm, y);
          y += refLines.length * 4.5 + 4;
        } else {
          y += 4;
        }
        continue;
      }

      if (el.kind === 'unnumbered_heading' || el.kind === 'heading') {
        const isLevel1 = el.level === 1;
        const isLevel3 = el.level === 3;
        pdf.setFont(baseFont, isLevel3 ? 'italic' : 'bold');
        pdf.setFontSize(bodyFontSizePt);
        const fullTitle = el.numberPrefix ? `${el.numberPrefix} ${el.text || ''}` : el.text || '';
        const xPos = el.align === 'center' ? leftMm + contentWidthMm / 2 : leftMm;
        const alignOpt = el.align === 'center' ? 'center' : 'left';
        const lines = pdf.splitTextToSize(fullTitle, contentWidthMm);
        pdf.text(lines, xPos, y + 4, { align: alignOpt });
        y += lines.length * (bodyFontSizePt * ptToMm * 1.4) + (isLevel1 ? 6 : 4);
        continue;
      }

      if (el.kind === 'toc_row' || el.kind === 'list_row') {
        const isBold = el.kind === 'toc_row' && el.level === 1;
        pdf.setFont(baseFont, isBold ? 'bold' : 'normal');
        pdf.setFontSize(bodyFontSizePt);
        const label = el.numberPrefix ? `${el.numberPrefix}  ${el.text || ''}` : el.text || '';
        const pageStr = String(el.pageRef ?? '');
        const labelW = pdf.getTextWidth(label);
        const pageW = pdf.getTextWidth(pageStr);
        pdf.text(label, leftMm, y + 4);
        pdf.text(pageStr, 210 - rightMm, y + 4, { align: 'right' });

        // Dotted leader
        const dotStart = leftMm + labelW + 2;
        const dotEnd = 210 - rightMm - pageW - 2;
        if (dotEnd > dotStart + 4) {
          pdf.setFont(baseFont, 'normal');
          let dx = dotStart;
          while (dx < dotEnd) {
            pdf.text('.', dx, y + 4);
            dx += 1.8;
          }
        }
        y += 6.8;
        continue;
      }

      if (el.kind === 'long_quote') {
        pdf.setFont(baseFont, 'normal');
        pdf.setFontSize(quoteFontSizePt);
        const qLeft = leftMm + quoteIndentCm * 10;
        const qWidth = Math.max(40, contentWidthMm - quoteIndentCm * 10);
        const lines = pdf.splitTextToSize(el.text || '', qWidth);
        const lineMm = quoteFontSizePt * ptToMm * 1.15;
        for (let i = 0; i < lines.length; i++) {
          pdf.text(lines[i], qLeft, y + 3.5 + i * lineMm, { align: 'justify', maxWidth: qWidth });
        }
        y += lines.length * lineMm + 5;
        continue;
      }

      if (el.kind === 'equation') {
        pdf.setFont(baseFont, 'italic');
        pdf.setFontSize(bodyFontSizePt);
        pdf.text(el.text || '', leftMm + contentWidthMm / 2, y + 6, { align: 'center' });
        y += 13;
        continue;
      }

      if (el.kind === 'keywords') {
        pdf.setFont(baseFont, 'normal');
        pdf.setFontSize(bodyFontSizePt);
        const lines = pdf.splitTextToSize(el.text || '', contentWidthMm);
        pdf.text(lines, leftMm, y + 4);
        y += lines.length * (bodyFontSizePt * ptToMm * lineSpacing) + 4;
        continue;
      }

      if (el.kind === 'reference_item') {
        pdf.setFont(baseFont, 'normal');
        pdf.setFontSize(bodyFontSizePt);
        const lines = pdf.splitTextToSize(el.text || '', contentWidthMm);
        const lineMm = bodyFontSizePt * ptToMm * 1.15;
        for (let i = 0; i < lines.length; i++) {
          pdf.text(lines[i], leftMm, y + 4 + i * lineMm);
        }
        y += lines.length * lineMm + 4.5;
        continue;
      }

      if (el.kind === 'image') {
        pdf.setFont(baseFont, 'bold');
        pdf.setFontSize(10);
        pdf.text(el.caption || 'Figura', leftMm + contentWidthMm / 2, y + 4, { align: 'center' });
        y += 7;
        if (el.src && el.src.startsWith('data:image/')) {
          try {
            const format = el.src.includes('image/png') ? 'PNG' : 'JPEG';
            pdf.addImage(el.src, format, leftMm + contentWidthMm * 0.15, y, contentWidthMm * 0.7, 52);
          } catch {
            pdf.rect(leftMm + contentWidthMm * 0.15, y, contentWidthMm * 0.7, 52);
          }
        } else {
          pdf.rect(leftMm + contentWidthMm * 0.15, y, contentWidthMm * 0.7, 52);
        }
        y += 55;
        pdf.setFont(baseFont, 'normal');
        pdf.setFontSize(10);
        pdf.text(`Fonte: ${el.sourceNote || 'Elaboração própria.'}`, leftMm + contentWidthMm / 2, y + 3, {
          align: 'center',
        });
        y += 10;
        continue;
      }

      if (el.kind === 'table' && el.rows?.length) {
        pdf.setFont(baseFont, 'bold');
        pdf.setFontSize(10);
        pdf.text(el.caption || 'Tabela', leftMm + contentWidthMm / 2, y + 4, { align: 'center' });
        y += 7;
        const colCount = Math.max(1, el.rows[0]?.length || 1);
        const colW = contentWidthMm / colCount;
        pdf.setLineWidth(0.25);
        pdf.line(leftMm, y, leftMm + contentWidthMm, y);
        for (let r = 0; r < el.rows.length; r++) {
          const row = el.rows[r];
          const isHead = r === 0 && el.hasHeaderRow;
          pdf.setFont(baseFont, isHead ? 'bold' : 'normal');
          pdf.setFontSize(10);
          for (let c = 0; c < colCount; c++) {
            pdf.text((row[c] || '').slice(0, 32), leftMm + c * colW + 2, y + 5);
          }
          y += 7.5;
          if (isHead) pdf.line(leftMm, y, leftMm + contentWidthMm, y);
        }
        pdf.line(leftMm, y, leftMm + contentWidthMm, y);
        y += 5;
        pdf.setFont(baseFont, 'normal');
        pdf.setFontSize(10);
        pdf.text(`Fonte: ${el.sourceNote || 'Elaboração própria.'}`, leftMm, y);
        y += 8;
        continue;
      }

      // Standard paragraph / list_item
      pdf.setFont(baseFont, 'normal');
      pdf.setFontSize(bodyFontSizePt);
      const lineMm = bodyFontSizePt * ptToMm * lineSpacing;
      const indentMm = el.indentFirstLine ? paragraphIndentCm * 10 : 0;
      const rawText = el.text || '';
      const lines = pdf.splitTextToSize(rawText, contentWidthMm - (indentMm > 0 ? 0 : 0));

      for (let i = 0; i < lines.length; i++) {
        const lineX = i === 0 ? leftMm + indentMm : leftMm;
        const maxW = i === 0 ? contentWidthMm - indentMm : contentWidthMm;
        const alignVal = el.align === 'center' ? 'center' : el.align === 'right' ? 'right' : 'left';
        const drawX = alignVal === 'center' ? leftMm + contentWidthMm / 2 : alignVal === 'right' ? 210 - rightMm : lineX;
        pdf.text(lines[i], drawX, y + 4 + i * lineMm, { align: alignVal, maxWidth: maxW });
      }
      y += lines.length * lineMm + 2;
    }

    // Footnotes at page bottom
    if (page.footnotes.length > 0) {
      let fy = 297 - bottomMm - page.footnotes.length * 4.5 - 4;
      pdf.setLineWidth(0.2);
      pdf.line(leftMm, fy, leftMm + 50, fy);
      fy += 4;
      pdf.setFont(baseFont, 'normal');
      pdf.setFontSize(9.5);
      for (const fn of page.footnotes) {
        pdf.text(`${fn.number} ${fn.text}`, leftMm, fy, { maxWidth: contentWidthMm });
        fy += 4.5;
      }
    }
  }

  pdf.save(`${sanitizeFileName(doc.metadata.title)}-abnt.pdf`);
}
