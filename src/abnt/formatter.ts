import { DOCUMENT_TYPE_SPECS } from './standards';
import {
  A4Page,
  AbntDocument,
  BibliographicReference,
  CitationKind,
  DocumentSection,
  MediaIndexEntry,
  PaginatedDocumentResult,
  PaginatedElement,
  TocEntry,
} from './types';

export function stripHtml(html: string): string {
  if (!html) return '';
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  }
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function countWordsAndChars(html: string): { words: number; chars: number } {
  const text = stripHtml(html);
  if (!text) return { words: 0, chars: 0 };
  const words = text.split(/\s+/).filter(Boolean).length;
  return { words, chars: text.length };
}

export function extractFirstAuthorSurname(authors: string, uppercase: boolean): string {
  const clean = (authors || '').trim();
  if (!clean) return '[AUTOR NÃO INFORMADO]';
  const firstAuthor = clean.split(';')[0].trim();
  let surname = '';
  if (firstAuthor.includes(',')) {
    surname = firstAuthor.split(',')[0].trim();
  } else {
    const parts = firstAuthor.split(/\s+/).filter(Boolean);
    surname = parts[parts.length - 1] || firstAuthor;
  }
  const hasMultiple = clean.includes(';');
  const base = uppercase
    ? surname.toUpperCase()
    : surname.charAt(0).toUpperCase() + surname.slice(1).toLowerCase();
  return hasMultiple ? `${base} et al.` : base;
}

export function getReferenceMissingFields(ref: BibliographicReference): string[] {
  const missing: string[] = [];
  if (!ref.title?.trim()) missing.push('Título');
  if (!ref.year?.trim()) missing.push('Ano');
  if (ref.type !== 'legislacao' && !ref.authors?.trim() && !ref.publicationOrgan?.trim()) {
    missing.push('Autor / Órgão');
  }
  if (ref.type === 'livro') {
    if (!ref.city?.trim()) missing.push('Cidade');
    if (!ref.publisher?.trim()) missing.push('Editora');
  }
  if (ref.type === 'artigo') {
    if (!ref.journalName?.trim()) missing.push('Nome do periódico');
  }
  if (ref.type === 'site' || ref.type === 'documento_digital') {
    if (!ref.url?.trim()) missing.push('URL');
    if (!ref.accessDate?.trim()) missing.push('Data de acesso');
  }
  if (ref.type === 'tese_dissertacao' || ref.type === 'trabalho_academico') {
    if (!ref.institution?.trim()) missing.push('Instituição');
  }
  if (ref.type === 'legislacao') {
    if (!ref.jurisdiction?.trim()) missing.push('Jurisdição');
    if (!ref.lawNumber?.trim()) missing.push('Número da norma/lei');
  }
  return missing;
}

export interface FormattedReferenceParts {
  plainText: string;
  segments: { text: string; bold?: boolean; italic?: boolean }[];
  missingFields: string[];
}

export function formatReferenceNbr6023(ref: BibliographicReference): FormattedReferenceParts {
  const missingFields = getReferenceMissingFields(ref);
  const segs: { text: string; bold?: boolean; italic?: boolean }[] = [];
  const push = (text: string, opts?: { bold?: boolean; italic?: boolean }) => {
    if (text) segs.push({ text, ...opts });
  };

  const authorPart = (ref.authors || ref.publicationOrgan || '[AUTOR NÃO INFORMADO]').trim();
  const formattedAuthors = authorPart.endsWith('.') ? authorPart : `${authorPart}.`;

  const title = (ref.title || '[TÍTULO NÃO INFORMADO]').trim();
  const subtitle = ref.subtitle?.trim() ? `: ${ref.subtitle.trim()}` : '';
  const year = (ref.year || '[S.d.]').trim();

  if (ref.type === 'livro') {
    push(`${formattedAuthors} `);
    push(title, { bold: true });
    if (subtitle) push(`${subtitle}`);
    push('. ');
    if (ref.edition?.trim()) push(`${ref.edition.trim()}. `);
    const city = ref.city?.trim() || '[S.l.]';
    const pub = ref.publisher?.trim() || '[s.n.]';
    push(`${city}: ${pub}, ${year}.`);
    if (ref.pages?.trim()) push(` ${ref.pages.trim()} p.`);
  } else if (ref.type === 'artigo') {
    push(`${formattedAuthors} ${title}${subtitle}. `);
    push(ref.journalName?.trim() || '[PERIÓDICO NÃO INFORMADO]', { bold: true });
    if (ref.city?.trim()) push(`, ${ref.city.trim()}`);
    if (ref.volume?.trim()) push(`, v. ${ref.volume.trim()}`);
    if (ref.issue?.trim()) push(`, n. ${ref.issue.trim()}`);
    if (ref.pages?.trim()) push(`, p. ${ref.pages.trim()}`);
    if (ref.month?.trim()) push(`, ${ref.month.trim()}`);
    push(`, ${year}.`);
    if (ref.doi?.trim()) push(` DOI: ${ref.doi.trim()}.`);
  } else if (ref.type === 'site' || ref.type === 'documento_digital') {
    if (ref.authors?.trim()) {
      push(`${formattedAuthors} `);
      push(title, { bold: true });
    } else {
      push(title.toUpperCase(), { bold: false });
    }
    if (subtitle) push(subtitle);
    push('. ');
    if (ref.publisher?.trim()) push(`${ref.publisher.trim()}, `);
    push(`${year}. `);
    if (ref.url?.trim()) push(`Disponível em: ${ref.url.trim()}. `);
    if (ref.accessDate?.trim()) push(`Acesso em: ${ref.accessDate.trim()}.`);
  } else if (ref.type === 'legislacao') {
    const juris = (ref.jurisdiction || '[JURISDIÇÃO]').trim().toUpperCase();
    const law = (ref.lawNumber || '[LEI/NORMA]').trim();
    push(`${juris}. `);
    push(`${law}${ref.lawDate ? `, de ${ref.lawDate}` : ''}`, { bold: true });
    push(`. ${title}${subtitle}. `);
    if (ref.city?.trim()) push(`${ref.city.trim()}: `);
    if (ref.publicationOrgan?.trim()) push(`${ref.publicationOrgan.trim()}, `);
    push(`${year}.`);
    if (ref.url?.trim()) push(` Disponível em: ${ref.url.trim()}.`);
    if (ref.accessDate?.trim()) push(` Acesso em: ${ref.accessDate.trim()}.`);
  } else if (ref.type === 'documento_oficial') {
    const organ = (ref.publicationOrgan || ref.authors || '[ÓRGÃO OFICIAL]').trim().toUpperCase();
    push(`${organ}. `);
    push(title, { bold: true });
    if (subtitle) push(subtitle);
    push(`. ${ref.city?.trim() || '[S.l.]'}: ${ref.publisher?.trim() || organ}, ${year}.`);
    if (ref.url?.trim()) push(` Disponível em: ${ref.url.trim()}.`);
    if (ref.accessDate?.trim()) push(` Acesso em: ${ref.accessDate.trim()}.`);
  } else {
    // tese_dissertacao / trabalho_academico
    push(`${formattedAuthors} `);
    push(title, { bold: true });
    if (subtitle) push(subtitle);
    push(`. ${year}. `);
    if (ref.pages?.trim()) push(`${ref.pages.trim()} f. `);
    const degree = ref.degree?.trim() || (ref.type === 'tese_dissertacao' ? 'Dissertação/Tese' : 'Trabalho de Conclusão de Curso');
    const inst = ref.institution?.trim() || '[Instituição não informada]';
    push(`${degree} — ${inst}, ${ref.city?.trim() || '[S.l.]'}, ${year}.`);
    if (ref.url?.trim()) push(` Disponível em: ${ref.url.trim()}.`);
  }

  return {
    plainText: segs.map((s) => s.text).join(''),
    segments: segs,
    missingFields,
  };
}

export function sortReferencesAlphabetically(refs: BibliographicReference[]): BibliographicReference[] {
  return [...refs].sort((a, b) => {
    const keyA = (a.authors || a.publicationOrgan || a.jurisdiction || a.title || '').trim().toLowerCase();
    const keyB = (b.authors || b.publicationOrgan || b.jurisdiction || b.title || '').trim().toLowerCase();
    return keyA.localeCompare(keyB, 'pt-BR');
  });
}

export function buildCitationHtml(params: {
  kind: CitationKind;
  reference: BibliographicReference;
  secondaryReference?: BibliographicReference;
  quoteText: string;
  page: string;
  uppercaseParentheses: boolean;
}): { html: string; missingWarning?: string } {
  const { kind, reference, secondaryReference, quoteText, page, uppercaseParentheses } = params;
  const surname = extractFirstAuthorSurname(reference.authors || reference.publicationOrgan || '', uppercaseParentheses);
  const year = reference.year?.trim() || '[ANO?]';
  const pagePart = page.trim() ? `, p. ${page.trim()}` : '';

  if (kind === 'direta_curta') {
    const callout = `(${surname}, ${year}${pagePart})`;
    const cleanQuote = quoteText.trim().replace(/^["“]|["”]$/g, '');
    return {
      html: `<span>“${escapeHtml(cleanQuote)}” ${escapeHtml(callout)}</span>`,
      missingWarning: !page.trim() ? 'Citação direta recomenda indicação de página.' : undefined,
    };
  }

  if (kind === 'direta_longa') {
    const callout = `(${surname}, ${year}${pagePart})`;
    const cleanQuote = quoteText.trim().replace(/^["“]|["”]$/g, '');
    return {
      html: `<blockquote><p>${escapeHtml(cleanQuote)} ${escapeHtml(callout)}</p></blockquote>`,
      missingWarning: !page.trim() ? 'Citação direta longa recomenda indicação de página.' : undefined,
    };
  }

  if (kind === 'indireta') {
    const callout = `(${surname}, ${year})`;
    const body = quoteText.trim() || 'Segundo a perspectiva apresentada pelo autor,';
    return {
      html: `<span>${escapeHtml(body)} ${escapeHtml(callout)}</span>`,
    };
  }

  // apud (citação de citação)
  const citedSurname = extractFirstAuthorSurname(
    secondaryReference?.authors || secondaryReference?.publicationOrgan || '[AUTOR CITADO]',
    uppercaseParentheses
  );
  const citedYear = secondaryReference?.year?.trim() || '[ANO?]';
  const callout = `(${surname}, ${year} apud ${citedSurname}, ${citedYear}${pagePart})`;
  const body = quoteText.trim() || 'Conforme mencionado no estudo citado,';
  return {
    html: `<span>${escapeHtml(body)} ${escapeHtml(callout)}</span>`,
  };
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function computeSectionNumbers(sections: DocumentSection[]): Record<string, string> {
  const map: Record<string, string> = {};
  let c1 = 0;
  let c2 = 0;
  let c3 = 0;

  for (const sec of sections) {
    if (!sec.enabled) continue;
    if (sec.part !== 'textual') {
      map[sec.id] = '';
      continue;
    }
    if (sec.level === 1) {
      c1 += 1;
      c2 = 0;
      c3 = 0;
      map[sec.id] = `${c1}`;
    } else if (sec.level === 2) {
      if (c1 === 0) c1 = 1;
      c2 += 1;
      c3 = 0;
      map[sec.id] = `${c1}.${c2}`;
    } else {
      if (c1 === 0) c1 = 1;
      if (c2 === 0) c2 = 1;
      c3 += 1;
      map[sec.id] = `${c1}.${c2}.${c3}`;
    }
  }
  return map;
}

interface ParsedBlock {
  kind: 'heading' | 'paragraph' | 'long_quote' | 'list_item' | 'image' | 'table' | 'equation';
  text: string;
  html: string;
  level?: 2 | 3;
  align?: 'left' | 'center' | 'right' | 'justify';
  src?: string;
  caption?: string;
  sourceNote?: string;
  rows?: string[][];
  hasHeaderRow?: boolean;
  footnoteRefs: { number: number; text: string }[];
}

export function parseSectionHtmlToBlocks(
  html: string,
  allFootnotes: { id: string; number: number; text: string }[]
): ParsedBlock[] {
  if (!html?.trim()) return [];
  if (typeof DOMParser === 'undefined') {
    const plain = stripHtml(html);
    return plain
      ? [{ kind: 'paragraph', text: plain, html: escapeHtml(plain), align: 'justify', footnoteRefs: [] }]
      : [];
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks: ParsedBlock[] = [];
  const footnoteMap = new Map(allFootnotes.map((f) => [String(f.number), f]));

  const extractFootnotes = (el: Element): { number: number; text: string }[] => {
    const refs: { number: number; text: string }[] = [];
    el.querySelectorAll('sup[data-footnote-num]').forEach((sup) => {
      const numStr = sup.getAttribute('data-footnote-num') || '';
      const fn = footnoteMap.get(numStr);
      if (fn) refs.push({ number: fn.number, text: fn.text });
    });
    return refs;
  };

  const getAlign = (el: Element): 'left' | 'center' | 'right' | 'justify' | undefined => {
    const style = el.getAttribute('style') || '';
    const match = style.match(/text-align:\s*(left|center|right|justify)/i);
    return match ? (match[1].toLowerCase() as 'left' | 'center' | 'right' | 'justify') : undefined;
  };

  const children = Array.from(doc.body.children);
  for (let i = 0; i < children.length; i++) {
    const el = children[i];
    const tag = el.tagName.toLowerCase();

    if (tag === 'div' && el.hasAttribute('data-equation')) {
      blocks.push({
        kind: 'equation',
        text: el.getAttribute('data-equation') || el.textContent || '',
        html: el.innerHTML,
        align: 'center',
        footnoteRefs: [],
      });
      continue;
    }

    if (tag === 'h2' || tag === 'h3') {
      const text = (el.textContent || '').trim();
      if (!text) continue;
      blocks.push({
        kind: 'heading',
        level: tag === 'h2' ? 2 : 3,
        text,
        html: el.innerHTML,
        align: 'left',
        footnoteRefs: extractFootnotes(el),
      });
      continue;
    }

    if (tag === 'blockquote') {
      const text = (el.textContent || '').trim();
      if (!text) continue;
      blocks.push({
        kind: 'long_quote',
        text,
        html: el.innerHTML,
        align: 'justify',
        footnoteRefs: extractFootnotes(el),
      });
      continue;
    }

    if (tag === 'ul' || tag === 'ol') {
      const isOrdered = tag === 'ol';
      const items = Array.from(el.querySelectorAll(':scope > li'));
      items.forEach((li, idx) => {
        const text = (li.textContent || '').trim();
        if (!text) return;
        const prefix = isOrdered ? `${idx + 1}. ` : '• ';
        blocks.push({
          kind: 'list_item',
          text: `${prefix}${text}`,
          html: `${prefix}${li.innerHTML}`,
          align: 'justify',
          footnoteRefs: extractFootnotes(li),
        });
      });
      continue;
    }

    if (tag === 'table') {
      const trList = Array.from(el.querySelectorAll('tr'));
      const rows = trList.map((tr) =>
        Array.from(tr.querySelectorAll('th, td')).map((cell) => (cell.textContent || '').trim())
      );
      const hasHeaderRow = trList[0]?.querySelectorAll('th').length > 0;
      if (rows.length > 0) {
        blocks.push({
          kind: 'table',
          text: `Tabela (${rows.length} linhas)`,
          html: '',
          rows,
          hasHeaderRow,
          caption: el.getAttribute('data-caption') || 'Dados do estudo',
          sourceNote: el.getAttribute('data-source') || 'Elaboração própria.',
          footnoteRefs: [],
        });
      }
      continue;
    }

    if (tag === 'img') {
      const src = el.getAttribute('src') || '';
      if (src) {
        blocks.push({
          kind: 'image',
          text: el.getAttribute('alt') || 'Ilustração',
          html: '',
          src,
          caption: el.getAttribute('title') || el.getAttribute('alt') || 'Ilustração do trabalho',
          sourceNote: el.getAttribute('data-source') || 'Elaboração própria.',
          footnoteRefs: [],
        });
      }
      continue;
    }

    if (tag === 'p') {
      const imgInside = el.querySelector('img');
      if (imgInside) {
        const src = imgInside.getAttribute('src') || '';
        if (src) {
          blocks.push({
            kind: 'image',
            text: imgInside.getAttribute('alt') || 'Ilustração',
            html: '',
            src,
            caption: imgInside.getAttribute('title') || imgInside.getAttribute('alt') || 'Ilustração do trabalho',
            sourceNote: imgInside.getAttribute('data-source') || 'Elaboração própria.',
            footnoteRefs: [],
          });
        }
        const residualText = (el.textContent || '').trim();
        if (!residualText) continue;
      }

      const eqText = (el.textContent || '').trim();
      if (eqText.startsWith('$$') && eqText.endsWith('$$') && eqText.length > 4) {
        blocks.push({
          kind: 'equation',
          text: eqText.slice(2, -2).trim(),
          html: escapeHtml(eqText.slice(2, -2).trim()),
          align: 'center',
          footnoteRefs: [],
        });
        continue;
      }

      if (!eqText && !el.querySelector('img')) continue;
      blocks.push({
        kind: 'paragraph',
        text: eqText,
        html: el.innerHTML,
        align: getAlign(el),
        footnoteRefs: extractFootnotes(el),
      });
    }
  }

  return blocks;
}

function estimateLines(text: string, usableWidthMm: number, fontSizePt: number): number {
  const clean = (text || '').trim();
  if (!clean) return 1;
  // Average glyph width ~ 0.48 * fontSizePt in mm (1pt = 0.3528mm)
  const avgCharWidthMm = fontSizePt * 0.3528 * 0.49;
  const charsPerLine = Math.max(25, Math.floor(usableWidthMm / avgCharWidthMm));
  return Math.max(1, Math.ceil(clean.length / charsPerLine));
}

function estimateBlockHeightMm(
  el: Omit<PaginatedElement, 'heightMm'>,
  usableWidthMm: number,
  bodyPt: number,
  quotePt: number,
  lineSpacing: number
): number {
  const ptToMm = 0.3528;
  const bodyLineMm = bodyPt * ptToMm * lineSpacing; // ~6.35mm at 12pt x 1.5
  const singleLineMm = quotePt * ptToMm * 1.15; // ~4.05mm at 10pt

  switch (el.kind) {
    case 'cover_block':
    case 'approval_block':
      return 240;
    case 'heading':
    case 'unnumbered_heading':
      return el.level === 1 ? 15 : 12;
    case 'paragraph': {
      const lines = estimateLines(el.text || '', usableWidthMm, bodyPt);
      return lines * bodyLineMm + 2.5;
    }
    case 'list_item': {
      const lines = estimateLines(el.text || '', usableWidthMm - 8, bodyPt);
      return lines * bodyLineMm + 1.5;
    }
    case 'long_quote': {
      const lines = estimateLines(el.text || '', Math.max(60, usableWidthMm - 40), quotePt);
      return lines * singleLineMm + 6;
    }
    case 'equation':
      return 14;
    case 'image':
      return 74; // title + image box + source
    case 'table': {
      const rowCount = el.rows?.length || 2;
      return Math.min(180, 18 + rowCount * 8.5);
    }
    case 'toc_row':
    case 'list_row':
      return 6.8;
    case 'reference_item': {
      const lines = estimateLines(el.text || '', usableWidthMm, bodyPt);
      return lines * (bodyPt * ptToMm * 1.15) + 4.5;
    }
    case 'keywords':
      return 12;
    case 'epigraph_block':
      return 24;
    case 'reviewed_work_header':
      return 26;
    default:
      return 10;
  }
}

export function paginateDocument(doc: AbntDocument): PaginatedDocumentResult {
  const spec = DOCUMENT_TYPE_SPECS[doc.type];
  const { marginsCm, bodyFontSizePt, quoteFontSizePt, lineSpacing, justifyBody } = doc.formatting;
  const contentHeightMm = Math.max(140, 297 - marginsCm.top * 10 - marginsCm.bottom * 10);
  const contentWidthMm = Math.max(100, 210 - marginsCm.left * 10 - marginsCm.right * 10);

  const enabledSections = doc.sections.filter((s) => s.enabled);
  const sectionNumbers = computeSectionNumbers(enabledSections);
  const sortedRefs = sortReferencesAlphabetically(doc.references);

  // Two-pass pagination: Pass 1 calculates exact page numbers for textual/post-textual headings, illustrations, and tables.
  // Pass 2 injects the calculated TocEntry[] and MediaIndexEntry[] into Sumário / Listas so page numbers are 100% accurate.
  const runPass = (
    knownToc: TocEntry[],
    knownIllustrations: MediaIndexEntry[],
    knownTables: MediaIndexEntry[]
  ): PaginatedDocumentResult => {
    const pages: A4Page[] = [];
    const toc: TocEntry[] = [];
    const illustrations: MediaIndexEntry[] = [];
    const tables: MediaIndexEntry[] = [];

    let logicalPageCounter = 0; // Cover = 0; Folha de rosto = 1; or first page = 1 for artigo
    let firstTextualLogicalPage: number | null = null;
    let figCounter = 0;
    let tabCounter = 0;
    let idSeq = 0;
    const nextId = () => `pg-el-${++idSeq}`;

    const createNewPage = (
      part: 'cover' | 'pre_textual' | 'textual' | 'post_textual',
      sectionTitle: string,
      sectionId?: string
    ): A4Page => {
      if (part !== 'cover') {
        logicalPageCounter += 1;
      }
      if ((part === 'textual' || part === 'post_textual') && firstTextualLogicalPage === null) {
        firstTextualLogicalPage = logicalPageCounter;
      }
      const showNumber =
        part !== 'cover' &&
        (!doc.formatting.startPageNumberOnFirstTextual || part === 'textual' || part === 'post_textual');

      const page: A4Page = {
        pageIndex: pages.length,
        logicalPageNumber: part === 'cover' ? 0 : logicalPageCounter,
        displayPageNumber: showNumber ? logicalPageCounter : null,
        part,
        sectionTitle,
        sectionId,
        elements: [],
        footnotes: [],
      };
      pages.push(page);
      return page;
    };

    const appendElementsToFlow = (
      startNewPage: boolean,
      part: 'pre_textual' | 'textual' | 'post_textual',
      sectionTitle: string,
      sectionId: string,
      rawElements: Omit<PaginatedElement, 'heightMm'>[],
      onHeadingPlaced?: (el: Omit<PaginatedElement, 'heightMm'>, pageNum: number) => void,
      onMediaPlaced?: (el: Omit<PaginatedElement, 'heightMm'>, pageNum: number) => void
    ) => {
      let currentPage =
        !startNewPage && pages.length > 0 && pages[pages.length - 1].part === part
          ? pages[pages.length - 1]
          : createNewPage(part, sectionTitle, sectionId);

      let usedHeight = currentPage.elements.reduce((acc, item) => acc + item.heightMm, 0);
      const footnoteReserve = () => (currentPage.footnotes.length > 0 ? 10 + currentPage.footnotes.length * 5.5 : 0);

      for (let idx = 0; idx < rawElements.length; idx++) {
        const raw = rawElements[idx];
        const heightMm = estimateBlockHeightMm(raw, contentWidthMm, bodyFontSizePt, quoteFontSizePt, lineSpacing);
        const fnCount = raw.footnoteRefs?.length || 0;
        const extraFnReserve = fnCount > 0 ? (currentPage.footnotes.length === 0 ? 10 : 0) + fnCount * 5.5 : 0;

        // Avoid orphaned headings: if heading + next element wouldn't fit, push heading to next page
        const isHeading = raw.kind === 'heading' || raw.kind === 'unnumbered_heading';
        const nextEl = rawElements[idx + 1];
        const nextMinHeight =
          isHeading && nextEl
            ? Math.min(
                28,
                estimateBlockHeightMm(nextEl, contentWidthMm, bodyFontSizePt, quoteFontSizePt, lineSpacing)
              )
            : 0;

        if (
          currentPage.elements.length > 0 &&
          usedHeight + heightMm + nextMinHeight + footnoteReserve() + extraFnReserve > contentHeightMm
        ) {
          currentPage = createNewPage(part, sectionTitle, sectionId);
          usedHeight = 0;
        }

        const finalized: PaginatedElement = { ...raw, heightMm };
        currentPage.elements.push(finalized);
        usedHeight += heightMm;

        if (raw.footnoteRefs?.length) {
          for (const fn of raw.footnoteRefs) {
            if (!currentPage.footnotes.some((f) => f.number === fn.number)) {
              currentPage.footnotes.push(fn);
            }
          }
        }

        const pageNumberForIndex = currentPage.logicalPageNumber;
        if (onHeadingPlaced && raw.kind === 'heading') {
          onHeadingPlaced(raw, pageNumberForIndex);
        }
        if (onMediaPlaced && (raw.kind === 'image' || raw.kind === 'table')) {
          onMediaPlaced(raw, pageNumberForIndex);
        }
      }
    };

    for (const sec of enabledSections) {
      if (sec.kind === 'capa') {
        const p = createNewPage('cover', sec.title, sec.id);
        p.elements.push({
          id: nextId(),
          kind: 'cover_block',
          heightMm: contentHeightMm,
          sectionId: sec.id,
        });
        continue;
      }

      if (sec.kind === 'folha_rosto') {
        const p = createNewPage('pre_textual', sec.title, sec.id);
        p.elements.push({
          id: nextId(),
          kind: 'cover_block',
          text: 'folha_rosto',
          heightMm: contentHeightMm,
          sectionId: sec.id,
        });
        continue;
      }

      if (sec.kind === 'folha_aprovacao') {
        const p = createNewPage('pre_textual', sec.title, sec.id);
        p.elements.push({
          id: nextId(),
          kind: 'approval_block',
          heightMm: contentHeightMm,
          sectionId: sec.id,
        });
        continue;
      }

      if (sec.kind === 'dedicatoria' || sec.kind === 'epigrafe') {
        const blocks = parseSectionHtmlToBlocks(sec.content, doc.footnotes);
        const text = blocks.map((b) => b.text).join(' ') || (sec.kind === 'dedicatoria' ? 'Dedicatória...' : '');
        const p = createNewPage('pre_textual', sec.title, sec.id);
        p.elements.push({
          id: nextId(),
          kind: 'epigraph_block',
          text,
          caption: sec.kind === 'epigrafe' ? sec.epigraphAuthor : undefined,
          sectionId: sec.id,
          heightMm: 40,
        });
        continue;
      }

      if (sec.kind === 'agradecimentos') {
        const blocks = parseSectionHtmlToBlocks(sec.content, doc.footnotes);
        const elems: Omit<PaginatedElement, 'heightMm'>[] = [
          {
            id: nextId(),
            kind: 'unnumbered_heading',
            level: 1,
            text: 'AGRADECIMENTOS',
            align: 'center',
            sectionId: sec.id,
          },
          ...blocks.map((b) => ({
            id: nextId(),
            kind: b.kind,
            text: b.text,
            html: b.html,
            align: b.align || (justifyBody ? ('justify' as const) : ('left' as const)),
            indentFirstLine: b.kind === 'paragraph',
            footnoteRefs: b.footnoteRefs,
          })),
        ];
        appendElementsToFlow(true, 'pre_textual', sec.title, sec.id, elems);
        continue;
      }

      if (sec.kind === 'resumo' || sec.kind === 'abstract') {
        const isArtigo = doc.type === 'artigo_cientifico';
        const isFirstSectionOfArtigo = isArtigo && enabledSections[0]?.id === sec.id;
        const blocks = parseSectionHtmlToBlocks(sec.content, doc.footnotes);
        const elems: Omit<PaginatedElement, 'heightMm'>[] = [];

        if (isFirstSectionOfArtigo) {
          elems.push({
            id: nextId(),
            kind: 'reviewed_work_header',
            text: 'artigo_header',
            sectionId: sec.id,
          });
        }

        elems.push({
          id: nextId(),
          kind: 'unnumbered_heading',
          level: 1,
          text: sec.title.toUpperCase(),
          align: isArtigo ? 'left' : 'center',
          sectionId: sec.id,
        });

        for (const b of blocks) {
          elems.push({
            id: nextId(),
            kind: 'paragraph',
            text: b.text,
            html: b.html,
            align: 'justify',
            indentFirstLine: false, // NBR 6028: parágrafo único sem recuo
            footnoteRefs: b.footnoteRefs,
          });
        }

        const kwLabel = sec.kind === 'abstract' ? 'Keywords' : 'Palavras-chave';
        const kwText = sec.keywords?.trim() || (sec.kind === 'abstract' ? 'academic research; methodology.' : 'pesquisa acadêmica; metodologia.');
        elems.push({
          id: nextId(),
          kind: 'keywords',
          text: `${kwLabel}: ${kwText}`,
          sectionId: sec.id,
        });

        // In artigo científico, Abstract and Introdução flow continuously without hard page breaks
        appendElementsToFlow(!isArtigo || isFirstSectionOfArtigo, 'pre_textual', sec.title, sec.id, elems);
        continue;
      }

      if (sec.kind === 'lista_ilustracoes') {
        const elems: Omit<PaginatedElement, 'heightMm'>[] = [
          {
            id: nextId(),
            kind: 'unnumbered_heading',
            level: 1,
            text: 'LISTA DE ILUSTRAÇÕES',
            align: 'center',
            sectionId: sec.id,
          },
          ...(knownIllustrations.length > 0
            ? knownIllustrations.map((item) => ({
                id: nextId(),
                kind: 'list_row' as const,
                text: `Figura ${item.index} — ${item.caption}`,
                pageRef: item.pageNumber,
                sectionId: sec.id,
              }))
            : [
                {
                  id: nextId(),
                  kind: 'paragraph' as const,
                  text: 'Nenhuma ilustração inserida até o momento.',
                  align: 'center' as const,
                  indentFirstLine: false,
                },
              ]),
        ];
        appendElementsToFlow(true, 'pre_textual', sec.title, sec.id, elems);
        continue;
      }

      if (sec.kind === 'lista_tabelas') {
        const elems: Omit<PaginatedElement, 'heightMm'>[] = [
          {
            id: nextId(),
            kind: 'unnumbered_heading',
            level: 1,
            text: 'LISTA DE TABELAS',
            align: 'center',
            sectionId: sec.id,
          },
          ...(knownTables.length > 0
            ? knownTables.map((item) => ({
                id: nextId(),
                kind: 'list_row' as const,
                text: `Tabela ${item.index} — ${item.caption}`,
                pageRef: item.pageNumber,
                sectionId: sec.id,
              }))
            : [
                {
                  id: nextId(),
                  kind: 'paragraph' as const,
                  text: 'Nenhuma tabela inserida até o momento.',
                  align: 'center' as const,
                  indentFirstLine: false,
                },
              ]),
        ];
        appendElementsToFlow(true, 'pre_textual', sec.title, sec.id, elems);
        continue;
      }

      if (sec.kind === 'sumario') {
        const elems: Omit<PaginatedElement, 'heightMm'>[] = [
          {
            id: nextId(),
            kind: 'unnumbered_heading',
            level: 1,
            text: 'SUMÁRIO',
            align: 'center',
            sectionId: sec.id,
          },
          ...knownToc.map((entry) => ({
            id: nextId(),
            kind: 'toc_row' as const,
            numberPrefix: entry.numberPrefix,
            text: entry.title,
            level: entry.level,
            pageRef: entry.pageNumber,
            sectionId: entry.sectionId,
          })),
        ];
        appendElementsToFlow(true, 'pre_textual', sec.title, sec.id, elems);
        continue;
      }

      if (sec.kind === 'referencias') {
        const elems: Omit<PaginatedElement, 'heightMm'>[] = [
          {
            id: nextId(),
            kind: 'heading',
            level: 1,
            numberPrefix: '',
            text: 'REFERÊNCIAS',
            align: 'center',
            sectionId: sec.id,
          },
          ...(sortedRefs.length > 0
            ? sortedRefs.map((ref) => {
                const formatted = formatReferenceNbr6023(ref);
                const htmlStr = formatted.segments
                  .map((s) => {
                    const esc = escapeHtml(s.text);
                    if (s.bold) return `<strong>${esc}</strong>`;
                    if (s.italic) return `<em>${esc}</em>`;
                    return esc;
                  })
                  .join('');
                return {
                  id: nextId(),
                  kind: 'reference_item' as const,
                  text: formatted.plainText,
                  html: htmlStr,
                  align: 'left' as const,
                  sectionId: sec.id,
                };
              })
            : [
                {
                  id: nextId(),
                  kind: 'paragraph' as const,
                  text: 'Nenhuma referência bibliográfica cadastrada ainda. Utilize o painel "Citações & Referências" para adicionar livros, artigos, sites ou leis.',
                  align: 'left' as const,
                  indentFirstLine: false,
                },
              ]),
        ];

        const isCompact = doc.type === 'artigo_cientifico' || doc.type === 'resenha_critica';
        appendElementsToFlow(!isCompact, 'post_textual', sec.title, sec.id, elems, (el, pageNum) => {
          toc.push({
            sectionId: sec.id,
            numberPrefix: '',
            title: 'REFERÊNCIAS',
            level: 1,
            pageNumber: pageNum,
            isPostTextual: true,
          });
        });
        continue;
      }

      if (sec.kind === 'apendice' || sec.kind === 'anexo') {
        const blocks = parseSectionHtmlToBlocks(sec.content, doc.footnotes);
        const headingTitle = sec.title.toUpperCase();
        const elems: Omit<PaginatedElement, 'heightMm'>[] = [
          {
            id: nextId(),
            kind: 'heading',
            level: 1,
            numberPrefix: '',
            text: headingTitle,
            align: 'center',
            sectionId: sec.id,
          },
          ...blocks.map((b) => ({
            id: nextId(),
            kind: b.kind,
            text: b.text,
            html: b.html,
            align: b.align || (justifyBody ? ('justify' as const) : ('left' as const)),
            indentFirstLine: b.kind === 'paragraph',
            src: b.src,
            caption: b.caption,
            sourceNote: b.sourceNote,
            rows: b.rows,
            hasHeaderRow: b.hasHeaderRow,
            footnoteRefs: b.footnoteRefs,
          })),
        ];
        appendElementsToFlow(true, 'post_textual', sec.title, sec.id, elems, (_el, pageNum) => {
          toc.push({
            sectionId: sec.id,
            numberPrefix: '',
            title: headingTitle,
            level: 1,
            pageNumber: pageNum,
            isPostTextual: true,
          });
        });
        continue;
      }

      // Textual sections (Introdução, Desenvolvimento, Metodologia, Resultados, Discussão, Conclusão, Custom)
      const numPrefix = sectionNumbers[sec.id] || '';
      const displayTitle = sec.level === 1 ? sec.title.toUpperCase() : sec.title;
      const blocks = parseSectionHtmlToBlocks(sec.content, doc.footnotes);

      const elems: Omit<PaginatedElement, 'heightMm'>[] = [];
      // For Resenha Crítica's first section, include reviewed work header
      if (doc.type === 'resenha_critica' && enabledSections.find((s) => s.part === 'textual')?.id === sec.id) {
        elems.push({
          id: nextId(),
          kind: 'reviewed_work_header',
          text: 'resenha_header',
          sectionId: sec.id,
        });
      }

      elems.push({
        id: nextId(),
        kind: 'heading',
        level: sec.level,
        numberPrefix: numPrefix,
        text: displayTitle,
        align: 'left',
        sectionId: sec.id,
      });

      for (const b of blocks) {
        if (b.kind === 'heading') {
          elems.push({
            id: nextId(),
            kind: 'heading',
            level: b.level === 2 ? 2 : 3,
            numberPrefix: numPrefix ? `${numPrefix}.1` : '',
            text: b.text,
            align: 'left',
            sectionId: sec.id,
            footnoteRefs: b.footnoteRefs,
          });
        } else if (b.kind === 'image') {
          figCounter += 1;
          elems.push({
            id: nextId(),
            kind: 'image',
            src: b.src,
            caption: `Figura ${figCounter} — ${b.caption}`,
            text: b.caption,
            sourceNote: b.sourceNote,
            footnoteRefs: b.footnoteRefs,
          });
        } else if (b.kind === 'table') {
          tabCounter += 1;
          elems.push({
            id: nextId(),
            kind: 'table',
            rows: b.rows,
            hasHeaderRow: b.hasHeaderRow,
            caption: `Tabela ${tabCounter} — ${b.caption}`,
            text: b.caption,
            sourceNote: b.sourceNote,
            footnoteRefs: b.footnoteRefs,
          });
        } else {
          elems.push({
            id: nextId(),
            kind: b.kind,
            text: b.text,
            html: b.html,
            align: b.align || (justifyBody ? ('justify' as const) : ('left' as const)),
            indentFirstLine: b.kind === 'paragraph',
            footnoteRefs: b.footnoteRefs,
          });
        }
      }

      const isCompactDoc = doc.type === 'artigo_cientifico' || doc.type === 'resenha_critica';
      // Primary sections (level 1) start on a new page in formal NBR 14724 works; subsections flow naturally
      const startNewPage = !isCompactDoc && sec.level === 1;

      let primaryHeadingRecorded = false;
      appendElementsToFlow(
        startNewPage,
        'textual',
        sec.title,
        sec.id,
        elems,
        (el, pageNum) => {
          if (!primaryHeadingRecorded && el.sectionId === sec.id && el.text === displayTitle) {
            primaryHeadingRecorded = true;
            toc.push({
              sectionId: sec.id,
              numberPrefix: numPrefix,
              title: displayTitle,
              level: sec.level,
              pageNumber: pageNum,
            });
          }
        },
        (el, pageNum) => {
          if (el.kind === 'image') {
            illustrations.push({
              index: illustrations.length + 1,
              caption: el.text || 'Ilustração',
              pageNumber: pageNum,
              kind: 'illustration',
            });
          } else if (el.kind === 'table') {
            tables.push({
              index: tables.length + 1,
              caption: el.text || 'Tabela',
              pageNumber: pageNum,
              kind: 'table',
            });
          }
        }
      );
    }

    if (pages.length === 0) {
      createNewPage('textual', spec.name);
    }

    return {
      pages,
      toc,
      illustrations,
      tables,
      totalPhysicalPages: pages.length,
    };
  };

  // Pass 1 discovers real page numbers; Pass 2 populates Sumário / Listas with those numbers;
  // Pass 3 guarantees stability if Sumário itself grew across pages.
  const pass1 = runPass([], [], []);
  const pass2 = runPass(pass1.toc, pass1.illustrations, pass1.tables);
  const pass3 = runPass(pass2.toc, pass2.illustrations, pass2.tables);
  return pass3;
}

export function computeDocumentProgress(doc: AbntDocument): {
  percent: number;
  wordCount: number;
  completedSections: number;
  totalSections: number;
} {
  const enabled = doc.sections.filter((s) => s.enabled);
  const metaFields = [
    doc.metadata.institution,
    doc.metadata.author,
    doc.metadata.title,
    doc.metadata.city,
    doc.metadata.year,
  ];
  const filledMeta = metaFields.filter((v) => v?.trim().length > 0).length;

  const writableSections = enabled.filter(
    (s) =>
      s.kind !== 'capa' &&
      s.kind !== 'folha_rosto' &&
      s.kind !== 'folha_aprovacao' &&
      s.kind !== 'sumario' &&
      s.kind !== 'lista_ilustracoes' &&
      s.kind !== 'lista_tabelas'
  );

  let completedSections = 0;
  let totalWords = 0;

  for (const s of writableSections) {
    if (s.kind === 'referencias') {
      if (doc.references.length > 0) completedSections += 1;
      continue;
    }
    const { words } = countWordsAndChars(s.content);
    totalWords += words;
    if (words >= 8) completedSections += 1;
  }

  const totalWeight = metaFields.length + writableSections.length;
  const doneWeight = filledMeta + completedSections;
  const percent = totalWeight > 0 ? Math.min(100, Math.round((doneWeight / totalWeight) * 100)) : 0;

  return {
    percent,
    wordCount: totalWords,
    completedSections,
    totalSections: writableSections.length,
  };
}
