import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  HeadingLevel,
  ImageRun,
  LeaderType,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  TabStopPosition,
  TabStopType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertMillimetersToTwip,
} from 'docx';
import {
  computeSectionNumbers,
  formatReferenceNbr6023,
  paginateDocument,
  parseSectionHtmlToBlocks,
  sortReferencesAlphabetically,
} from '../abnt/formatter';
import { AbntDocument } from '../abnt/types';
import { sanitizeFileName } from './pdfExporter';

function cmToTwips(cm: number): number {
  return convertMillimetersToTwip(cm * 10);
}

function dataUrlToUint8Array(dataUrl: string): { bytes: Uint8Array; type: 'png' | 'jpg' } | null {
  try {
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
    if (!match) return null;
    const ext = match[1].toLowerCase() === 'png' ? 'png' : 'jpg';
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { bytes, type: ext };
  } catch {
    return null;
  }
}

export async function exportDocumentToDocx(doc: AbntDocument): Promise<void> {
  const paginated = paginateDocument(doc);
  const enabledSections = doc.sections.filter((s) => s.enabled);
  const sectionNumbers = computeSectionNumbers(enabledSections);
  const sortedRefs = sortReferencesAlphabetically(doc.references);
  const font = doc.formatting.fontFamily;
  const { marginsCm, bodyFontSizePt, quoteFontSizePt, paragraphIndentCm, quoteIndentCm } = doc.formatting;

  const halfPtBody = bodyFontSizePt * 2;
  const halfPtQuote = quoteFontSizePt * 2;

  const preTextualChildren: (Paragraph | Table)[] = [];
  const textualChildren: (Paragraph | Table)[] = [];

  const pushPara = (target: (Paragraph | Table)[], p: Paragraph) => target.push(p);

  let preTextualPageCount = 0;
  let figCounter = 0;
  let tabCounter = 0;

  for (const sec of enabledSections) {
    const target = sec.part === 'pre_textual' ? preTextualChildren : textualChildren;

    if (sec.kind === 'capa') {
      preTextualPageCount += 1;
      pushPara(
        target,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: (doc.metadata.institution || '').toUpperCase(), bold: true, font, size: halfPtBody }),
          ],
        })
      );
      if (doc.metadata.course) {
        pushPara(
          target,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: doc.metadata.course.toUpperCase(), font, size: halfPtBody })],
          })
        );
      }
      pushPara(
        target,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 1400, after: 2800 },
          children: [
            new TextRun({ text: (doc.metadata.author || '').toUpperCase(), bold: true, font, size: halfPtBody }),
          ],
        })
      );
      pushPara(
        target,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: doc.metadata.subtitle ? 160 : 3800 },
          children: [
            new TextRun({ text: (doc.metadata.title || '').toUpperCase(), bold: true, font, size: 28 }),
          ],
        })
      );
      if (doc.metadata.subtitle) {
        pushPara(
          target,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 3600 },
            children: [new TextRun({ text: doc.metadata.subtitle, font, size: halfPtBody })],
          })
        );
      }
      pushPara(
        target,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: (doc.metadata.city || '').toUpperCase(), font, size: halfPtBody })],
        })
      );
      pushPara(
        target,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: doc.metadata.year || '', font, size: halfPtBody }),
            new PageBreak(),
          ],
        })
      );
      continue;
    }

    if (sec.kind === 'folha_rosto') {
      preTextualPageCount += 1;
      pushPara(
        target,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 2800 },
          children: [
            new TextRun({ text: (doc.metadata.author || '').toUpperCase(), bold: true, font, size: halfPtBody }),
          ],
        })
      );
      pushPara(
        target,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 1800 },
          children: [
            new TextRun({ text: (doc.metadata.title || '').toUpperCase(), bold: true, font, size: 28 }),
          ],
        })
      );
      if (doc.metadata.natureNote) {
        pushPara(
          target,
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { left: cmToTwips(8) },
            spacing: { after: 2400, line: 240 },
            children: [
              new TextRun({
                text: `${doc.metadata.natureNote}${doc.metadata.advisor ? ` Orientador(a): ${doc.metadata.advisor}.` : ''}`,
                font,
                size: halfPtQuote,
              }),
            ],
          })
        );
      }
      pushPara(
        target,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: (doc.metadata.city || '').toUpperCase(), font, size: halfPtBody })],
        })
      );
      pushPara(
        target,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: doc.metadata.year || '', font, size: halfPtBody }),
            new PageBreak(),
          ],
        })
      );
      continue;
    }

    if (sec.kind === 'folha_aprovacao') {
      preTextualPageCount += 1;
      pushPara(
        target,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 1400 },
          children: [new TextRun({ text: (doc.metadata.author || '').toUpperCase(), bold: true, font, size: halfPtBody })],
        })
      );
      pushPara(
        target,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 1200 },
          children: [new TextRun({ text: (doc.metadata.title || '').toUpperCase(), bold: true, font, size: halfPtBody })],
        })
      );
      pushPara(
        target,
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: cmToTwips(8) },
          spacing: { after: 800, line: 240 },
          children: [new TextRun({ text: doc.metadata.natureNote || '', font, size: halfPtQuote })],
        })
      );
      pushPara(
        target,
        new Paragraph({
          spacing: { after: 600 },
          children: [
            new TextRun({ text: `Aprovado em: ${doc.metadata.approvalDate || '____/____/______'}`, font, size: halfPtBody }),
          ],
        })
      );
      const members = [doc.metadata.advisor, ...(doc.metadata.bancaMembers || [])].filter(Boolean);
      for (const m of members) {
        pushPara(
          target,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 700 },
            children: [
              new TextRun({ text: '____________________________________________\n', font, size: halfPtBody }),
              new TextRun({ text: m, font, size: halfPtBody }),
            ],
          })
        );
      }
      pushPara(target, new Paragraph({ children: [new PageBreak()] }));
      continue;
    }

    if (sec.kind === 'sumario') {
      preTextualPageCount += 1;
      pushPara(
        target,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: 'SUMÁRIO', bold: true, font, size: halfPtBody })],
        })
      );
      for (const entry of paginated.toc) {
        const label = entry.numberPrefix ? `${entry.numberPrefix}  ${entry.title}` : entry.title;
        pushPara(
          target,
          new Paragraph({
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: TabStopPosition.MAX,
                leader: LeaderType.DOT,
              },
            ],
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: `${label}\t${entry.pageNumber}`,
                bold: entry.level === 1,
                font,
                size: halfPtBody,
              }),
            ],
          })
        );
      }
      pushPara(target, new Paragraph({ children: [new PageBreak()] }));
      continue;
    }

    if (sec.kind === 'lista_ilustracoes' || sec.kind === 'lista_tabelas') {
      preTextualPageCount += 1;
      const listTitle = sec.kind === 'lista_ilustracoes' ? 'LISTA DE ILUSTRAÇÕES' : 'LISTA DE TABELAS';
      const entries = sec.kind === 'lista_ilustracoes' ? paginated.illustrations : paginated.tables;
      pushPara(
        target,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: listTitle, bold: true, font, size: halfPtBody })],
        })
      );
      for (const item of entries) {
        const prefix = sec.kind === 'lista_ilustracoes' ? 'Figura' : 'Tabela';
        pushPara(
          target,
          new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX, leader: LeaderType.DOT }],
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: `${prefix} ${item.index} — ${item.caption}\t${item.pageNumber}`,
                font,
                size: halfPtBody,
              }),
            ],
          })
        );
      }
      pushPara(target, new Paragraph({ children: [new PageBreak()] }));
      continue;
    }

    if (sec.kind === 'resumo' || sec.kind === 'abstract') {
      preTextualPageCount += 1;
      pushPara(
        target,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [new TextRun({ text: sec.title.toUpperCase(), bold: true, font, size: halfPtBody })],
        })
      );
      const blocks = parseSectionHtmlToBlocks(sec.content, doc.footnotes);
      for (const b of blocks) {
        pushPara(
          target,
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 360, after: 200 },
            children: [new TextRun({ text: b.text, font, size: halfPtBody })],
          })
        );
      }
      if (sec.keywords) {
        const label = sec.kind === 'abstract' ? 'Keywords' : 'Palavras-chave';
        pushPara(
          target,
          new Paragraph({
            spacing: { before: 120 },
            children: [
              new TextRun({ text: `${label}: `, bold: true, font, size: halfPtBody }),
              new TextRun({ text: sec.keywords, font, size: halfPtBody }),
            ],
          })
        );
      }
      pushPara(target, new Paragraph({ children: [new PageBreak()] }));
      continue;
    }

    if (sec.kind === 'dedicatoria' || sec.kind === 'epigrafe' || sec.kind === 'agradecimentos') {
      preTextualPageCount += 1;
      if (sec.kind === 'agradecimentos') {
        pushPara(
          target,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [new TextRun({ text: 'AGRADECIMENTOS', bold: true, font, size: halfPtBody })],
          })
        );
      }
      const blocks = parseSectionHtmlToBlocks(sec.content, doc.footnotes);
      for (const b of blocks) {
        pushPara(
          target,
          new Paragraph({
            alignment: sec.kind === 'agradecimentos' ? AlignmentType.JUSTIFIED : AlignmentType.RIGHT,
            spacing: { line: 360, after: 180 },
            children: [new TextRun({ text: b.text, italics: sec.kind === 'epigrafe', font, size: halfPtBody })],
          })
        );
      }
      pushPara(target, new Paragraph({ children: [new PageBreak()] }));
      continue;
    }

    if (sec.kind === 'referencias') {
      pushPara(
        target,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 360 },
          pageBreakBefore: textualChildren.length > 0,
          children: [new TextRun({ text: 'REFERÊNCIAS', bold: true, font, size: halfPtBody })],
        })
      );
      for (const ref of sortedRefs) {
        const formatted = formatReferenceNbr6023(ref);
        pushPara(
          target,
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { line: 240, after: 240 },
            children: formatted.segments.map(
              (s) =>
                new TextRun({
                  text: s.text,
                  bold: s.bold,
                  italics: s.italic,
                  font,
                  size: halfPtBody,
                })
            ),
          })
        );
      }
      continue;
    }

    // Textual or Apêndice / Anexo
    const numPrefix = sectionNumbers[sec.id] || '';
    const headingText =
      sec.part === 'post_textual'
        ? sec.title.toUpperCase()
        : numPrefix
          ? `${numPrefix} ${sec.level === 1 ? sec.title.toUpperCase() : sec.title}`
          : sec.title;

    const headingLevel =
      sec.level === 1 ? HeadingLevel.HEADING_1 : sec.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;

    pushPara(
      target,
      new Paragraph({
        heading: headingLevel,
        alignment: sec.part === 'post_textual' ? AlignmentType.CENTER : AlignmentType.LEFT,
        pageBreakBefore: sec.level === 1 && textualChildren.length > 0 && doc.type !== 'artigo_cientifico',
        spacing: { before: 240, after: 240 },
        children: [
          new TextRun({
            text: headingText,
            bold: sec.level !== 3,
            italics: sec.level === 3,
            font,
            size: halfPtBody,
          }),
        ],
      })
    );

    const blocks = parseSectionHtmlToBlocks(sec.content, doc.footnotes);
    for (const b of blocks) {
      if (b.kind === 'heading') {
        pushPara(
          target,
          new Paragraph({
            heading: b.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 160 },
            children: [new TextRun({ text: b.text, bold: b.level === 2, italics: b.level === 3, font, size: halfPtBody })],
          })
        );
      } else if (b.kind === 'long_quote') {
        pushPara(
          target,
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { left: cmToTwips(quoteIndentCm) },
            spacing: { line: 240, before: 160, after: 160 },
            children: [new TextRun({ text: b.text, font, size: halfPtQuote })],
          })
        );
      } else if (b.kind === 'equation') {
        pushPara(
          target,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 160, after: 160 },
            children: [new TextRun({ text: b.text, italics: true, font, size: halfPtBody })],
          })
        );
      } else if (b.kind === 'image' && b.src) {
        figCounter += 1;
        pushPara(
          target,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 160, after: 80 },
            children: [
              new TextRun({ text: `Figura ${figCounter} — ${b.caption || 'Ilustração'}`, bold: true, font, size: halfPtQuote }),
            ],
          })
        );
        const decoded = dataUrlToUint8Array(b.src);
        if (decoded) {
          pushPara(
            target,
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: decoded.bytes,
                  transformation: { width: 420, height: 260 },
                  type: decoded.type,
                }),
              ],
            })
          );
        }
        pushPara(
          target,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 180 },
            children: [new TextRun({ text: `Fonte: ${b.sourceNote || 'Elaboração própria.'}`, font, size: halfPtQuote })],
          })
        );
      } else if (b.kind === 'table' && b.rows?.length) {
        tabCounter += 1;
        pushPara(
          target,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 160, after: 80 },
            children: [
              new TextRun({ text: `Tabela ${tabCounter} — ${b.caption || 'Dados'}`, bold: true, font, size: halfPtQuote }),
            ],
          })
        );
        const table = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: b.rows.map(
            (row, rIdx) =>
              new TableRow({
                children: row.map(
                  (cellText) =>
                    new TableCell({
                      borders: {
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE },
                        top: { style: rIdx === 0 ? BorderStyle.SINGLE : BorderStyle.NONE, size: 6 },
                        bottom: {
                          style: rIdx === 0 || rIdx === b.rows!.length - 1 ? BorderStyle.SINGLE : BorderStyle.NONE,
                          size: 6,
                        },
                      },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: cellText,
                              bold: rIdx === 0 && Boolean(b.hasHeaderRow),
                              font,
                              size: halfPtQuote,
                            }),
                          ],
                        }),
                      ],
                    })
                ),
              })
          ),
        });
        target.push(table);
        pushPara(
          target,
          new Paragraph({
            spacing: { before: 80, after: 180 },
            children: [new TextRun({ text: `Fonte: ${b.sourceNote || 'Elaboração própria.'}`, font, size: halfPtQuote })],
          })
        );
      } else {
        pushPara(
          target,
          new Paragraph({
            alignment:
              b.align === 'center'
                ? AlignmentType.CENTER
                : b.align === 'right'
                  ? AlignmentType.RIGHT
                  : doc.formatting.justifyBody
                    ? AlignmentType.JUSTIFIED
                    : AlignmentType.LEFT,
            indent: b.kind === 'paragraph' ? { firstLine: cmToTwips(paragraphIndentCm) } : { left: cmToTwips(0.8) },
            spacing: { line: 360, after: 120 },
            children: [new TextRun({ text: b.text, font, size: halfPtBody })],
          })
        );
      }
    }
  }

  const pageProps = {
    page: {
      size: { width: cmToTwips(21), height: cmToTwips(29.7) },
      margin: {
        top: cmToTwips(marginsCm.top),
        left: cmToTwips(marginsCm.left),
        bottom: cmToTwips(marginsCm.bottom),
        right: cmToTwips(marginsCm.right),
      },
    },
  };

  const firstTextualNum = Math.max(1, preTextualPageCount);
  const sectionsArray: any[] = [];

  if (preTextualChildren.length > 0) {
    sectionsArray.push({
      properties: pageProps,
      children: preTextualChildren,
    });
  }

  sectionsArray.push({
    properties: {
      ...pageProps,
      page: {
        ...pageProps.page,
        pageNumbers: {
          start: doc.formatting.startPageNumberOnFirstTextual ? firstTextualNum : 1,
        },
      },
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                children: [PageNumber.CURRENT],
                font,
                size: 20,
              }),
            ],
          }),
        ],
      }),
    },
    children:
      textualChildren.length > 0
        ? textualChildren
        : [new Paragraph({ children: [new TextRun({ text: '', font, size: halfPtBody })] })],
  });

  const wordDoc = new Document({
    creator: doc.metadata.author || 'ABNT GALÁCTICO',
    title: doc.metadata.title || 'Trabalho Acadêmico',
    sections: sectionsArray,
  });

  const blob = await Packer.toBlob(wordDoc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFileName(doc.metadata.title)}-abnt.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
