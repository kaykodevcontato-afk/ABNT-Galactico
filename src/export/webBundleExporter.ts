import JSZip from 'jszip';
import { escapeHtml, paginateDocument } from '../abnt/formatter';
import { AbntDocument, A4Page, PaginatedElement } from '../abnt/types';
import { sanitizeFileName } from './pdfExporter';

function renderElementHtml(doc: AbntDocument, el: PaginatedElement): string {
  const { marginsCm } = doc.formatting;
  const contentHeightMm = 297 - marginsCm.top * 10 - marginsCm.bottom * 10;

  if (el.kind === 'cover_block') {
    const isFolhaRosto = el.text === 'folha_rosto';
    return `
      <div class="abnt-cover" style="height: ${contentHeightMm}mm;">
        <div class="abnt-cover-top">
          ${
            !isFolhaRosto
              ? `<p class="abnt-bold abnt-upper">${escapeHtml(doc.metadata.institution)}</p>
                 ${doc.metadata.course ? `<p class="abnt-upper">${escapeHtml(doc.metadata.course)}</p>` : ''}
                 <p class="abnt-bold abnt-upper abnt-author-gap">${escapeHtml(doc.metadata.author)}</p>`
              : `<p class="abnt-bold abnt-upper">${escapeHtml(doc.metadata.author)}</p>`
          }
        </div>
        <div class="abnt-cover-center">
          <p class="abnt-cover-title">${escapeHtml(doc.metadata.title)}</p>
          ${doc.metadata.subtitle ? `<p class="abnt-cover-subtitle">${escapeHtml(doc.metadata.subtitle)}</p>` : ''}
        </div>
        <div class="abnt-cover-bottom">
          ${
            isFolhaRosto && doc.metadata.natureNote
              ? `<div class="abnt-nature-note">
                   <p>${escapeHtml(doc.metadata.natureNote)}</p>
                   ${doc.metadata.advisor ? `<p class="abnt-advisor">Orientador(a): ${escapeHtml(doc.metadata.advisor)}</p>` : ''}
                 </div>`
              : ''
          }
          <div class="abnt-city-year">
            <p class="abnt-upper">${escapeHtml(doc.metadata.city)}</p>
            <p>${escapeHtml(doc.metadata.year)}</p>
          </div>
        </div>
      </div>`;
  }

  if (el.kind === 'approval_block') {
    const members = [doc.metadata.advisor, ...(doc.metadata.bancaMembers || [])].filter(Boolean);
    return `
      <div class="abnt-cover" style="height: ${contentHeightMm}mm;">
        <div class="abnt-approval-top">
          <p class="abnt-bold abnt-upper abnt-center">${escapeHtml(doc.metadata.author)}</p>
          <p class="abnt-bold abnt-upper abnt-center abnt-mt-lg">${escapeHtml(doc.metadata.title)}</p>
          ${
            doc.metadata.natureNote
              ? `<div class="abnt-nature-note abnt-mt-lg"><p>${escapeHtml(doc.metadata.natureNote)}</p></div>`
              : ''
          }
          <p class="abnt-mt-lg">Aprovado em: ${escapeHtml(doc.metadata.approvalDate || '____ / ____ / ______')}</p>
        </div>
        <div class="abnt-banca">
          <p class="abnt-bold abnt-upper abnt-center">Banca Examinadora</p>
          ${members
            .map(
              (m) => `
            <div class="abnt-signature">
              <div class="abnt-signature-line"></div>
              <p>${escapeHtml(m)}</p>
            </div>`
            )
            .join('')}
        </div>
      </div>`;
  }

  if (el.kind === 'epigraph_block') {
    return `
      <div class="abnt-epigraph-wrap" style="height: ${contentHeightMm}mm;">
        <div class="abnt-epigraph">
          <p>${escapeHtml(el.text || '')}</p>
          ${el.caption ? `<p class="abnt-epigraph-author">(${escapeHtml(el.caption)})</p>` : ''}
        </div>
      </div>`;
  }

  if (el.kind === 'reviewed_work_header') {
    return `
      <header class="abnt-article-header">
        <h1 class="abnt-cover-title">${escapeHtml(doc.metadata.title)}</h1>
        ${doc.metadata.subtitle ? `<p class="abnt-center">${escapeHtml(doc.metadata.subtitle)}</p>` : ''}
        <p class="abnt-center abnt-article-author">${escapeHtml(doc.metadata.author)}</p>
        ${
          doc.type === 'resenha_critica' && doc.metadata.reviewedWorkRef
            ? `<p class="abnt-reviewed-ref"><strong>Obra resenhada:</strong> ${escapeHtml(doc.metadata.reviewedWorkRef)}</p>`
            : ''
        }
      </header>`;
  }

  if (el.kind === 'unnumbered_heading' || el.kind === 'heading') {
    const levelClass = el.level === 1 ? 'abnt-h1' : el.level === 3 ? 'abnt-h3' : 'abnt-h2';
    const alignClass = el.align === 'center' ? 'abnt-center' : 'abnt-left';
    const fullText = el.numberPrefix ? `${el.numberPrefix} ${el.text || ''}` : el.text || '';
    return `<h2 class="abnt-heading ${levelClass} ${alignClass}">${escapeHtml(fullText)}</h2>`;
  }

  if (el.kind === 'toc_row' || el.kind === 'list_row') {
    const boldClass = el.kind === 'toc_row' && el.level === 1 ? 'abnt-bold' : '';
    const label = el.numberPrefix ? `${el.numberPrefix}  ${el.text || ''}` : el.text || '';
    return `
      <div class="abnt-toc-row ${boldClass}">
        <span class="abnt-toc-label">${escapeHtml(label)}</span>
        <span class="abnt-toc-dots"></span>
        <span class="abnt-toc-page">${escapeHtml(String(el.pageRef ?? ''))}</span>
      </div>`;
  }

  if (el.kind === 'long_quote') {
    return `<blockquote class="abnt-long-quote">${escapeHtml(el.text || '')}</blockquote>`;
  }

  if (el.kind === 'equation') {
    return `<div class="abnt-equation">${escapeHtml(el.text || '')}</div>`;
  }

  if (el.kind === 'keywords') {
    return `<p class="abnt-keywords">${escapeHtml(el.text || '')}</p>`;
  }

  if (el.kind === 'reference_item') {
    return `<p class="abnt-reference-item">${el.html || escapeHtml(el.text || '')}</p>`;
  }

  if (el.kind === 'image') {
    return `
      <figure class="abnt-figure">
        <figcaption class="abnt-figure-caption">${escapeHtml(el.caption || 'Figura')}</figcaption>
        ${el.src ? `<img src="${el.src}" alt="${escapeHtml(el.caption || 'Ilustração')}" class="abnt-figure-img" />` : ''}
        <p class="abnt-source">Fonte: ${escapeHtml(el.sourceNote || 'Elaboração própria.')}</p>
      </figure>`;
  }

  if (el.kind === 'table' && el.rows?.length) {
    return `
      <div class="abnt-table-wrap">
        <p class="abnt-figure-caption">${escapeHtml(el.caption || 'Tabela')}</p>
        <table class="abnt-table">
          <tbody>
            ${el.rows
              .map(
                (row, rIdx) => `
              <tr class="${rIdx === 0 ? 'abnt-tr-first' : ''} ${rIdx === el.rows!.length - 1 ? 'abnt-tr-last' : ''}">
                ${row
                  .map(
                    (cell) =>
                      `<td class="${rIdx === 0 && el.hasHeaderRow ? 'abnt-bold' : ''}">${escapeHtml(cell)}</td>`
                  )
                  .join('')}
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
        <p class="abnt-source">Fonte: ${escapeHtml(el.sourceNote || 'Elaboração própria.')}</p>
      </div>`;
  }

  const align = el.align || 'justify';
  const indentClass = el.indentFirstLine ? 'abnt-indent' : '';
  const listClass = el.kind === 'list_item' ? 'abnt-list-item' : '';
  return `<p class="abnt-paragraph ${indentClass} ${listClass}" style="text-align: ${align};">${escapeHtml(el.text || '')}</p>`;
}

function renderPageHtml(doc: AbntDocument, page: A4Page): string {
  const footnotesHtml =
    page.footnotes.length > 0
      ? `
      <footer class="abnt-footnotes">
        <div class="abnt-footnote-rule"></div>
        ${page.footnotes
          .map((fn) => `<p class="abnt-footnote-item"><sup>${fn.number}</sup> ${escapeHtml(fn.text)}</p>`)
          .join('')}
      </footer>`
      : '';

  return `
    <article class="abnt-page" data-page-index="${page.pageIndex + 1}">
      ${page.displayPageNumber !== null ? `<div class="abnt-page-number">${page.displayPageNumber}</div>` : ''}
      <div class="abnt-page-body">
        <div>${page.elements.map((el) => renderElementHtml(doc, el)).join('\n')}</div>
        ${footnotesHtml}
      </div>
    </article>`;
}

function buildCss(doc: AbntDocument): string {
  const { marginsCm, fontFamily, bodyFontSizePt, quoteFontSizePt, lineSpacing, paragraphIndentCm, quoteIndentCm } =
    doc.formatting;

  const fontStack =
    fontFamily === 'Arial'
      ? 'Arial, "Helvetica Neue", Helvetica, sans-serif'
      : '"Times New Roman", Times, Georgia, serif';

  return `/* Estilos ABNT gerados automaticamente pelo ABNT GALÁCTICO */
:root {
  --abnt-font: ${fontStack};
  --abnt-body-size: ${bodyFontSizePt}pt;
  --abnt-quote-size: ${quoteFontSizePt}pt;
  --abnt-line-height: ${lineSpacing};
  --abnt-indent: ${paragraphIndentCm}cm;
  --abnt-quote-indent: ${quoteIndentCm}cm;
  --abnt-margin-top: ${marginsCm.top}cm;
  --abnt-margin-left: ${marginsCm.left}cm;
  --abnt-margin-bottom: ${marginsCm.bottom}cm;
  --abnt-margin-right: ${marginsCm.right}cm;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #e2e8f0;
  color: #0f172a;
  font-family: system-ui, -apple-system, sans-serif;
}

.viewer-toolbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #0f172a;
  color: #f8fafc;
  padding: 12px 20px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #1e293b;
}

.viewer-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}

.viewer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.viewer-btn {
  background: #1e3a8a;
  color: #ffffff;
  border: 1px solid #1d4ed8;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.viewer-btn.secondary {
  background: #1e293b;
  border-color: #334155;
}

.viewer-zoom-label {
  font-size: 12px;
  min-width: 44px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.pages-container {
  padding: 28px 16px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  transform-origin: top center;
}

.abnt-page {
  position: relative;
  width: 210mm;
  height: 297mm;
  background: #ffffff;
  color: #000000;
  padding: var(--abnt-margin-top) var(--abnt-margin-right) var(--abnt-margin-bottom) var(--abnt-margin-left);
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.14);
  font-family: var(--abnt-font);
  font-size: var(--abnt-body-size);
  overflow: hidden;
}

.abnt-page-number {
  position: absolute;
  top: 2cm;
  right: var(--abnt-margin-right);
  font-family: var(--abnt-font);
  font-size: 10pt;
  line-height: 1;
}

.abnt-page-body {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.abnt-bold { font-weight: 700; }
.abnt-upper { text-transform: uppercase; }
.abnt-center { text-align: center; }
.abnt-left { text-align: left; }
.abnt-mt-lg { margin-top: 24px; }

.abnt-cover {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.abnt-cover-top p {
  margin: 0 0 4px;
  text-align: center;
}

.abnt-author-gap {
  margin-top: 48px !important;
}

.abnt-cover-center {
  text-align: center;
  padding: 0 12px;
}

.abnt-cover-title {
  font-size: 14pt;
  font-weight: 700;
  text-transform: uppercase;
  margin: 0;
}

.abnt-cover-subtitle {
  margin: 8px 0 0;
}

.abnt-nature-note {
  margin-left: auto;
  width: 52%;
  text-align: justify;
  font-size: 10pt;
  line-height: 1.25;
}

.abnt-nature-note p {
  margin: 0 0 8px;
}

.abnt-city-year {
  text-align: center;
  line-height: 1.25;
}

.abnt-city-year p {
  margin: 0;
}

.abnt-banca {
  padding-bottom: 18px;
}

.abnt-signature {
  text-align: center;
  margin-top: 28px;
}

.abnt-signature-line {
  width: 72mm;
  border-top: 1px solid #000000;
  margin: 0 auto 4px;
}

.abnt-epigraph-wrap {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-end;
}

.abnt-epigraph {
  width: 55%;
  text-align: right;
  font-style: italic;
  line-height: 1.5;
  padding-bottom: 32px;
}

.abnt-epigraph-author {
  font-style: normal;
  margin-top: 8px;
}

.abnt-article-header {
  margin-bottom: 18px;
}

.abnt-article-author {
  font-size: 11pt;
  margin-top: 8px;
}

.abnt-reviewed-ref {
  font-size: 10pt;
  border-bottom: 1px solid rgba(0, 0, 0, 0.25);
  padding-bottom: 6px;
}

.abnt-heading {
  font-size: var(--abnt-body-size);
  margin: 0 0 4mm;
}

.abnt-h1 { font-weight: 700; }
.abnt-h2 { font-weight: 700; margin-top: 3mm; margin-bottom: 2.5mm; }
.abnt-h3 { font-weight: 400; font-style: italic; margin-top: 2mm; margin-bottom: 2mm; }

.abnt-paragraph {
  margin: 0 0 4px;
  line-height: var(--abnt-line-height);
}

.abnt-indent {
  text-indent: var(--abnt-indent);
}

.abnt-list-item {
  padding-left: 0.6cm;
}

.abnt-long-quote {
  margin: 8px 0 8px var(--abnt-quote-indent);
  font-size: var(--abnt-quote-size);
  line-height: 1.15;
  text-align: justify;
}

.abnt-equation {
  text-align: center;
  font-style: italic;
  margin: 10px 0;
}

.abnt-keywords {
  margin-top: 12px;
  line-height: var(--abnt-line-height);
}

.abnt-toc-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  line-height: 1.45;
}

.abnt-toc-dots {
  flex: 1;
  border-bottom: 1px dotted #000000;
}

.abnt-reference-item {
  text-align: left;
  line-height: 1.15;
  margin: 0 0 12px;
}

.abnt-figure {
  margin: 12px 0;
  text-align: center;
}

.abnt-figure-caption {
  font-size: 10pt;
  font-weight: 700;
  text-align: center;
  margin: 0 0 6px;
}

.abnt-figure-img {
  max-width: 100%;
  max-height: 48mm;
  object-fit: contain;
}

.abnt-source {
  font-size: 10pt;
  margin: 4px 0 0;
}

.abnt-table-wrap {
  margin: 12px 0;
}

.abnt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10pt;
}

.abnt-table td {
  padding: 4px 8px;
}

.abnt-tr-first {
  border-top: 1px solid #000000;
  border-bottom: 1px solid #000000;
}

.abnt-tr-last {
  border-bottom: 1px solid #000000;
}

.abnt-footnotes {
  padding-top: 8px;
  font-size: 9.5pt;
}

.abnt-footnote-rule {
  width: 36mm;
  border-top: 1px solid #000000;
  margin-bottom: 4px;
}

.abnt-footnote-item {
  margin: 0 0 2px;
  line-height: 1.2;
}

@page {
  size: A4 portrait;
  margin: 0;
}

@media print {
  body {
    background: #ffffff;
  }
  .viewer-toolbar {
    display: none !important;
  }
  .pages-container {
    padding: 0;
    gap: 0;
    transform: none !important;
  }
  .abnt-page {
    box-shadow: none;
    page-break-after: always;
    break-after: page;
  }
  .abnt-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
}
`;
}

function buildJs(): string {
  return `// Script interativo para visualização e impressão do documento ABNT
(function () {
  var zoom = 1;
  var container = document.getElementById('pages-container');
  var zoomLabel = document.getElementById('zoom-label');
  var btnZoomIn = document.getElementById('btn-zoom-in');
  var btnZoomOut = document.getElementById('btn-zoom-out');
  var btnPrint = document.getElementById('btn-print');

  function applyZoom() {
    if (!container || !zoomLabel) return;
    container.style.transform = 'scale(' + zoom + ')';
    zoomLabel.textContent = Math.round(zoom * 100) + '%';
  }

  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', function () {
      zoom = Math.min(1.4, Math.round((zoom + 0.1) * 10) / 10);
      applyZoom();
    });
  }

  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', function () {
      zoom = Math.max(0.5, Math.round((zoom - 0.1) * 10) / 10);
      applyZoom();
    });
  }

  if (btnPrint) {
    btnPrint.addEventListener('click', function () {
      window.print();
    });
  }

  applyZoom();
})();
`;
}

function buildHtml(doc: AbntDocument): string {
  const paginated = paginateDocument(doc);
  const pagesHtml = paginated.pages.map((p) => renderPageHtml(doc, p)).join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(doc.metadata.title || 'Documento ABNT')}</title>
  <link rel="stylesheet" href="../css/style.css" />
</head>
<body>
  <header class="viewer-toolbar">
    <h1 class="viewer-title">${escapeHtml(doc.metadata.title || 'Documento ABNT')} — ${paginated.totalPhysicalPages} página(s)</h1>
    <div class="viewer-actions">
      <button id="btn-zoom-out" class="viewer-btn secondary" type="button">- Zoom</button>
      <span id="zoom-label" class="viewer-zoom-label">100%</span>
      <button id="btn-zoom-in" class="viewer-btn secondary" type="button">+ Zoom</button>
      <button id="btn-print" class="viewer-btn" type="button">Imprimir A4</button>
    </div>
  </header>

  <main id="pages-container" class="pages-container">
    ${pagesHtml}
  </main>

  <script src="../js/script.js"></script>
</body>
</html>
`;
}

export async function exportDocumentToSeparatedWebZip(doc: AbntDocument): Promise<void> {
  const zip = new JSZip();
  const slug = sanitizeFileName(doc.metadata.title);

  const htmlFolder = zip.folder('html');
  const cssFolder = zip.folder('css');
  const jsFolder = zip.folder('js');

  htmlFolder?.file('index.html', buildHtml(doc));
  cssFolder?.file('style.css', buildCss(doc));
  jsFolder?.file('script.js', buildJs());

  zip.file(
    'LEIA-ME.txt',
    `ABNT GALÁCTICO — Pacote Web Separado\n\nEstrutura de pastas:\n- html/index.html : Documento ABNT completo paginado em A4\n- css/style.css   : Folha de estilos ABNT (margens, tipografia, impressão)\n- js/script.js    : Controles de zoom e impressão A4\n\nPara visualizar, abra o arquivo html/index.html no seu navegador.\n`
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}-html-css-js.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
