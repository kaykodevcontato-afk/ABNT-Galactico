import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Grid, ZoomIn, ZoomOut } from 'lucide-react';
import { paginateDocument } from '../abnt/formatter';
import { A4Page, AbntDocument, PaginatedElement } from '../abnt/types';

interface AbntPageSheetProps {
  doc: AbntDocument;
  page: A4Page;
  showMarginGuides?: boolean;
  isPrintMode?: boolean;
  onJumpToSection?: (sectionId: string) => void;
}

export const AbntPageSheet: React.FC<AbntPageSheetProps> = ({
  doc,
  page,
  showMarginGuides = false,
  isPrintMode = false,
  onJumpToSection,
}) => {
  const { marginsCm, fontFamily, bodyFontSizePt, quoteFontSizePt, lineSpacing, paragraphIndentCm, quoteIndentCm } =
    doc.formatting;

  const fontStack =
    fontFamily === 'Arial'
      ? 'Arial, "Helvetica Neue", Helvetica, sans-serif'
      : '"Times New Roman", Times, Georgia, serif';

  const renderElement = (el: PaginatedElement) => {
    if (el.kind === 'cover_block') {
      const isFolhaRosto = el.text === 'folha_rosto';
      return (
        <div
          key={el.id}
          className="flex flex-col justify-between text-black"
          style={{
            height: `${297 - marginsCm.top * 10 - marginsCm.bottom * 10}mm`,
            fontFamily: fontStack,
            fontSize: `${bodyFontSizePt}pt`,
          }}
        >
          <div className="text-center space-y-1">
            {!isFolhaRosto ? (
              <>
                <p className="font-bold uppercase tracking-wide">{doc.metadata.institution}</p>
                {doc.metadata.course && <p className="uppercase">{doc.metadata.course}</p>}
                <p className="font-bold uppercase pt-14">{doc.metadata.author}</p>
              </>
            ) : (
              <p className="font-bold uppercase pt-2">{doc.metadata.author}</p>
            )}
          </div>

          <div className="text-center px-4">
            <p className="font-bold uppercase leading-snug" style={{ fontSize: '14pt' }}>
              {doc.metadata.title}
            </p>
            {doc.metadata.subtitle && <p className="mt-2">{doc.metadata.subtitle}</p>}
          </div>

          <div className="space-y-10">
            {isFolhaRosto && doc.metadata.natureNote && (
              <div className="ml-auto w-[52%] text-justify leading-snug" style={{ fontSize: '10pt' }}>
                <p>{doc.metadata.natureNote}</p>
                {doc.metadata.advisor && <p className="mt-3">Orientador(a): {doc.metadata.advisor}</p>}
              </div>
            )}

            <div className="text-center leading-tight">
              <p className="uppercase">{doc.metadata.city}</p>
              <p>{doc.metadata.year}</p>
            </div>
          </div>
        </div>
      );
    }

    if (el.kind === 'approval_block') {
      const members = [doc.metadata.advisor, ...(doc.metadata.bancaMembers || [])].filter(Boolean);
      return (
        <div
          key={el.id}
          className="flex flex-col justify-between text-black"
          style={{
            height: `${297 - marginsCm.top * 10 - marginsCm.bottom * 10}mm`,
            fontFamily: fontStack,
            fontSize: `${bodyFontSizePt}pt`,
          }}
        >
          <div className="space-y-10">
            <p className="text-center font-bold uppercase">{doc.metadata.author}</p>
            <p className="text-center font-bold uppercase">{doc.metadata.title}</p>
            {doc.metadata.natureNote && (
              <div className="ml-auto w-[52%] text-justify leading-snug" style={{ fontSize: '10pt' }}>
                <p>{doc.metadata.natureNote}</p>
              </div>
            )}
            <p className="pt-4">Aprovado em: {doc.metadata.approvalDate || '____ / ____ / ______'}</p>
          </div>

          <div className="space-y-8 pb-6">
            <p className="text-center font-bold uppercase">Banca Examinadora</p>
            {members.map((m, i) => (
              <div key={i} className="text-center pt-4">
                <div className="w-72 border-t border-black mx-auto mb-1" />
                <p>{m}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (el.kind === 'epigraph_block') {
      return (
        <div
          key={el.id}
          className="flex flex-col justify-end items-end text-black"
          style={{
            height: `${297 - marginsCm.top * 10 - marginsCm.bottom * 10}mm`,
            fontFamily: fontStack,
            fontSize: `${bodyFontSizePt}pt`,
          }}
        >
          <div className="w-[55%] text-right italic leading-relaxed pb-10">
            <p>{el.text}</p>
            {el.caption && <p className="not-italic mt-2">({el.caption})</p>}
          </div>
        </div>
      );
    }

    if (el.kind === 'reviewed_work_header') {
      return (
        <div key={el.id} className="mb-5 text-black" style={{ fontFamily: fontStack }}>
          <h1 className="text-center font-bold uppercase" style={{ fontSize: '14pt' }}>
            {doc.metadata.title}
          </h1>
          {doc.metadata.subtitle && (
            <p className="text-center mt-1" style={{ fontSize: '12pt' }}>
              {doc.metadata.subtitle}
            </p>
          )}
          <p className="text-center mt-2 font-medium" style={{ fontSize: '11pt' }}>
            {doc.metadata.author}
          </p>
          {doc.type === 'resenha_critica' && doc.metadata.reviewedWorkRef && (
            <p className="mt-4 text-left border-b border-black/30 pb-2" style={{ fontSize: '10pt' }}>
              <strong>Obra resenhada:</strong> {doc.metadata.reviewedWorkRef}
            </p>
          )}
        </div>
      );
    }

    if (el.kind === 'unnumbered_heading' || el.kind === 'heading') {
      const isLevel1 = el.level === 1;
      const isLevel3 = el.level === 3;
      return (
        <div
          key={el.id}
          onClick={() => el.sectionId && onJumpToSection?.(el.sectionId)}
          className={`text-black ${onJumpToSection ? 'cursor-pointer hover:text-blue-900' : ''}`}
          style={{
            fontFamily: fontStack,
            fontSize: `${bodyFontSizePt}pt`,
            fontWeight: isLevel3 ? 400 : 700,
            fontStyle: isLevel3 ? 'italic' : 'normal',
            textAlign: el.align || 'left',
            marginBottom: isLevel1 ? '4mm' : '2.5mm',
            marginTop: isLevel1 ? '0mm' : '2mm',
          }}
        >
          {el.numberPrefix ? `${el.numberPrefix} ` : ''}
          {el.text}
        </div>
      );
    }

    if (el.kind === 'toc_row' || el.kind === 'list_row') {
      const isBold = el.kind === 'toc_row' && el.level === 1;
      return (
        <div
          key={el.id}
          onClick={() => el.sectionId && onJumpToSection?.(el.sectionId)}
          className={`flex items-baseline gap-1.5 text-black ${
            onJumpToSection ? 'cursor-pointer hover:text-blue-900' : ''
          }`}
          style={{
            fontFamily: fontStack,
            fontSize: `${bodyFontSizePt}pt`,
            fontWeight: isBold ? 700 : 400,
            lineHeight: 1.4,
          }}
        >
          <span className="shrink-0">
            {el.numberPrefix ? `${el.numberPrefix}  ` : ''}
            {el.text}
          </span>
          <span className="flex-1 border-b border-dotted border-black/60 mx-1" />
          <span className="shrink-0 tabular-nums">{el.pageRef}</span>
        </div>
      );
    }

    if (el.kind === 'long_quote') {
      return (
        <p
          key={el.id}
          className="text-black text-justify my-2"
          style={{
            fontFamily: fontStack,
            fontSize: `${quoteFontSizePt}pt`,
            lineHeight: 1.15,
            marginLeft: `${quoteIndentCm}cm`,
          }}
        >
          {el.text}
        </p>
      );
    }

    if (el.kind === 'equation') {
      return (
        <div
          key={el.id}
          className="text-center italic my-3 text-black"
          style={{ fontFamily: fontStack, fontSize: `${bodyFontSizePt}pt` }}
        >
          {el.text}
        </div>
      );
    }

    if (el.kind === 'keywords') {
      return (
        <p
          key={el.id}
          className="text-black mt-3"
          style={{ fontFamily: fontStack, fontSize: `${bodyFontSizePt}pt`, lineHeight: lineSpacing }}
        >
          {el.text}
        </p>
      );
    }

    if (el.kind === 'reference_item') {
      return (
        <p
          key={el.id}
          className="text-black text-left mb-3"
          style={{
            fontFamily: fontStack,
            fontSize: `${bodyFontSizePt}pt`,
            lineHeight: 1.15,
          }}
        >
          {el.text}
        </p>
      );
    }

    if (el.kind === 'image') {
      return (
        <figure key={el.id} className="my-3 text-center text-black" style={{ fontFamily: fontStack }}>
          <figcaption className="font-bold mb-1.5" style={{ fontSize: '10pt' }}>
            {el.caption}
          </figcaption>
          {el.src && (
            <img
              src={el.src}
              alt={el.caption || 'Ilustração'}
              referrerPolicy="no-referrer"
              className="mx-auto max-h-[48mm] object-contain"
            />
          )}
          <p className="mt-1" style={{ fontSize: '10pt' }}>
            Fonte: {el.sourceNote || 'Elaboração própria.'}
          </p>
        </figure>
      );
    }

    if (el.kind === 'table' && el.rows) {
      return (
        <div key={el.id} className="my-3 text-black" style={{ fontFamily: fontStack }}>
          <p className="text-center font-bold mb-1.5" style={{ fontSize: '10pt' }}>
            {el.caption}
          </p>
          <table className="w-full border-collapse" style={{ fontSize: '10pt' }}>
            <tbody>
              {el.rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  style={{
                    borderTop: rIdx === 0 ? '1px solid #000' : undefined,
                    borderBottom:
                      rIdx === 0 || rIdx === el.rows!.length - 1 ? '1px solid #000' : undefined,
                  }}
                >
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-2 py-1"
                      style={{ fontWeight: rIdx === 0 && el.hasHeaderRow ? 700 : 400 }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1" style={{ fontSize: '10pt' }}>
            Fonte: {el.sourceNote || 'Elaboração própria.'}
          </p>
        </div>
      );
    }

    // Standard paragraph / list item
    return (
      <p
        key={el.id}
        className="text-black mb-1"
        style={{
          fontFamily: fontStack,
          fontSize: `${bodyFontSizePt}pt`,
          lineHeight: lineSpacing,
          textAlign: el.align || 'justify',
          textIndent: el.indentFirstLine ? `${paragraphIndentCm}cm` : '0cm',
          paddingLeft: el.kind === 'list_item' ? '0.6cm' : undefined,
        }}
      >
        {el.text}
      </p>
    );
  };

  return (
    <div
      className={`relative bg-white text-black ${
        isPrintMode ? 'abnt-print-page' : 'shadow-md border border-slate-200 dark:border-slate-700'
      }`}
      style={{
        width: '210mm',
        height: '297mm',
        paddingTop: `${marginsCm.top}cm`,
        paddingLeft: `${marginsCm.left}cm`,
        paddingBottom: `${marginsCm.bottom}cm`,
        paddingRight: `${marginsCm.right}cm`,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Margin Guide Overlay */}
      {showMarginGuides && !isPrintMode && (
        <div
          className="pointer-events-none absolute border border-dashed border-blue-400/70"
          style={{
            top: `${marginsCm.top}cm`,
            left: `${marginsCm.left}cm`,
            bottom: `${marginsCm.bottom}cm`,
            right: `${marginsCm.right}cm`,
          }}
        />
      )}

      {/* Page Number Top Right (2cm from top, aligned to right margin) */}
      {page.displayPageNumber !== null && (
        <div
          className="absolute text-black tabular-nums"
          style={{
            top: '2cm',
            right: `${marginsCm.right}cm`,
            fontFamily: fontStack,
            fontSize: '10pt',
            lineHeight: 1,
          }}
        >
          {page.displayPageNumber}
        </div>
      )}

      {/* Body Elements */}
      <div className="relative h-full flex flex-col justify-between">
        <div>{page.elements.map(renderElement)}</div>

        {page.footnotes.length > 0 && (
          <div className="pt-2 text-black" style={{ fontFamily: fontStack, fontSize: '9.5pt' }}>
            <div className="w-36 border-t border-black mb-1.5" />
            {page.footnotes.map((fn) => (
              <p key={fn.number} className="leading-tight mb-0.5">
                <sup>{fn.number}</sup> {fn.text}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface AbntPreviewPanelProps {
  doc: AbntDocument;
  onSelectSection: (sectionId: string) => void;
}

export const AbntPreviewPanel: React.FC<AbntPreviewPanelProps> = ({ doc, onSelectSection }) => {
  const [zoom, setZoom] = useState(0.58);
  const [showGuides, setShowGuides] = useState(false);
  const [currentPageIdx, setCurrentPageIdx] = useState(0);

  const paginated = useMemo(() => paginateDocument(doc), [doc]);

  const safePageIdx = Math.min(currentPageIdx, Math.max(0, paginated.pages.length - 1));

  const scrollToPage = (idx: number) => {
    const clamped = Math.max(0, Math.min(paginated.pages.length - 1, idx));
    setCurrentPageIdx(clamped);
    const el = document.getElementById(`preview-page-${clamped}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <aside className="h-full flex flex-col bg-slate-200/80 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Preview Toolbar */}
      <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-display font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Preview A4
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            · {paginated.totalPhysicalPages} {paginated.totalPhysicalPages === 1 ? 'página' : 'páginas'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollToPage(safePageIdx - 1)}
            disabled={safePageIdx <= 0}
            title="Página anterior"
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-700 dark:text-slate-300 tabular-nums px-1">
            {safePageIdx + 1}/{paginated.totalPhysicalPages}
          </span>
          <button
            type="button"
            onClick={() => scrollToPage(safePageIdx + 1)}
            disabled={safePageIdx >= paginated.totalPhysicalPages - 1}
            title="Próxima página"
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={() => setShowGuides((v) => !v)}
            title="Mostrar/ocultar guias de margem 3cm/2cm"
            className={`p-1.5 rounded cursor-pointer ${
              showGuides
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
            title="Diminuir zoom"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono text-slate-600 dark:text-slate-300 tabular-nums w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1, Number((z + 0.1).toFixed(2))))}
            title="Aumentar zoom"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable A4 Pages Viewport */}
      <div className="flex-1 overflow-auto p-5 space-y-6 flex flex-col items-center">
        {paginated.pages.map((page) => (
          <div
            key={page.pageIndex}
            id={`preview-page-${page.pageIndex}`}
            style={{
              width: `calc(210mm * ${zoom})`,
              height: `calc(297mm * ${zoom})`,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                width: '210mm',
                height: '297mm',
              }}
            >
              <AbntPageSheet
                doc={doc}
                page={page}
                showMarginGuides={showGuides}
                onJumpToSection={onSelectSection}
              />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export const AbntPrintRoot: React.FC<{ doc: AbntDocument }> = ({ doc }) => {
  const paginated = useMemo(() => paginateDocument(doc), [doc]);
  return (
    <div className="hidden print-only-root">
      {paginated.pages.map((page) => (
        <AbntPageSheet key={page.pageIndex} doc={doc} page={page} isPrintMode />
      ))}
    </div>
  );
};
