import React, { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  BookMarked,
  FileText,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  MessageSquareQuote,
  Redo2,
  Sigma,
  StickyNote,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import {
  computeSectionNumbers,
  countWordsAndChars,
  formatReferenceNbr6023,
  paginateDocument,
  sortReferencesAlphabetically,
} from '../abnt/formatter';
import { AbntDocument, DocumentSection } from '../abnt/types';
import { uid } from '../storage/localRepository';
import { CoverMetadataForm } from './CoverMetadataModal';

interface RichEditorPanelProps {
  doc: AbntDocument;
  activeSection: DocumentSection;
  onChangeDoc: (updated: AbntDocument) => void;
  onUpdateSection: (sectionId: string, patch: Partial<DocumentSection>) => void;
  onSelectSection: (sectionId: string) => void;
  onOpenCitationsModal: (insertCallback: (html: string) => void) => void;
  onOpenReferencesManager: () => void;
}

export const RichEditorPanel: React.FC<RichEditorPanelProps> = ({
  doc,
  activeSection,
  onChangeDoc,
  onUpdateSection,
  onSelectSection,
  onOpenCitationsModal,
  onOpenReferencesManager,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [showEquationModal, setShowEquationModal] = useState(false);
  const [equationText, setEquationText] = useState('');
  const [showFootnoteModal, setShowFootnoteModal] = useState(false);
  const [footnoteText, setFootnoteText] = useState('');

  const sectionNumbers = computeSectionNumbers(doc.sections);
  const activeNumber = sectionNumbers[activeSection.id];

  const isFormOnlySection =
    activeSection.kind === 'capa' ||
    activeSection.kind === 'folha_rosto' ||
    activeSection.kind === 'folha_aprovacao';

  const isAutoIndexSection =
    activeSection.kind === 'sumario' ||
    activeSection.kind === 'lista_ilustracoes' ||
    activeSection.kind === 'lista_tabelas';

  const isReferencesSection = activeSection.kind === 'referencias';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: 'Escreva o conteúdo desta seção normalmente. A formatação ABNT é aplicada automaticamente...',
      }),
      CharacterCount,
    ],
    content: activeSection.content || '<p></p>',
    editorProps: {
      transformPastedHTML(html) {
        // Strip intrusive inline font/margin/color styles when pasting from Word, Google Docs or web
        if (typeof DOMParser === 'undefined') return html;
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        parsed.body.querySelectorAll('*').forEach((el) => {
          el.removeAttribute('style');
          el.removeAttribute('class');
          el.removeAttribute('color');
          el.removeAttribute('face');
          el.removeAttribute('size');
        });
        return parsed.body.innerHTML;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      if (html !== activeSection.content) {
        onUpdateSection(activeSection.id, { content: html });
      }
    },
  });

  // Sync editor content when switching sections
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== (activeSection.content || '<p></p>')) {
      editor.commands.setContent(activeSection.content || '<p></p>', { emitUpdate: false });
    }
  }, [activeSection.id, editor]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (dataUrl) {
        const cleanTitle = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
        editor.chain().focus().setImage({ src: dataUrl, alt: cleanTitle, title: cleanTitle }).run();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const insertTable = () => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true }).run();
    setShowTableModal(false);
  };

  const insertEquation = () => {
    if (!editor || !equationText.trim()) return;
    editor.chain().focus().insertContent(`<p>$$${equationText.trim()}$$</p>`).run();
    setEquationText('');
    setShowEquationModal(false);
  };

  const insertFootnote = () => {
    if (!editor || !footnoteText.trim()) return;
    const nextNum = doc.footnotes.reduce((max, f) => Math.max(max, f.number), 0) + 1;
    const newFn = {
      id: uid('fn'),
      number: nextNum,
      text: footnoteText.trim(),
      sectionId: activeSection.id,
    };
    onChangeDoc({
      ...doc,
      footnotes: [...doc.footnotes, newFn],
    });
    editor.chain().focus().insertContent(`<sup data-footnote-num="${nextNum}">[${nextNum}]</sup> `).run();
    setFootnoteText('');
    setShowFootnoteModal(false);
  };

  const handleOpenCitation = () => {
    onOpenCitationsModal((htmlToInsert) => {
      if (editor) {
        editor.chain().focus().insertContent(htmlToInsert + ' ').run();
      }
    });
  };

  const sectionCounts = countWordsAndChars(activeSection.content);
  const totalWords = doc.sections
    .filter((s) => s.enabled)
    .reduce((acc, s) => acc + countWordsAndChars(s.content).words, 0);

  const paginated = isAutoIndexSection ? paginateDocument(doc) : null;
  const sortedRefs = isReferencesSection ? sortReferencesAlphabetically(doc.references) : [];

  return (
    <section className="h-full flex flex-col bg-slate-50/70 dark:bg-slate-950 overflow-hidden">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Section Header */}
      <div className="px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {activeSection.part === 'pre_textual'
              ? 'Elemento Pré-textual'
              : activeSection.part === 'textual'
                ? `Seção Textual · Nível ${activeSection.level}`
                : 'Elemento Pós-textual'}
          </p>
          <h2 className="text-base font-display font-bold text-slate-900 dark:text-white truncate">
            {activeNumber ? `${activeNumber} ` : ''}
            {activeSection.title}
          </h2>
        </div>

        {!activeSection.enabled && (
          <button
            type="button"
            onClick={() => onUpdateSection(activeSection.id, { enabled: true })}
            className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-md cursor-pointer shrink-0"
          >
            Seção oculta — Ativar no documento
          </button>
        )}
      </div>

      {/* Rich Text Toolbar (only for writable prose sections) */}
      {!isFormOnlySection && !isAutoIndexSection && !isReferencesSection && editor && (
        <div className="px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Desfazer"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Refazer"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <span className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Subtítulo nível 2"
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Subtítulo nível 3"
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive('heading', { level: 3 })
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <span className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Negrito"
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive('bold')
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Itálico"
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive('italic')
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Sublinhado"
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive('underline')
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>

          <span className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            title="Alinhar à esquerda"
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive({ textAlign: 'left' })
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            title="Centralizar"
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive({ textAlign: 'center' })
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            title="Alinhar à direita"
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive({ textAlign: 'right' })
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            title="Justificar"
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive({ textAlign: 'justify' })
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <AlignJustify className="w-4 h-4" />
          </button>

          <span className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Lista com marcadores"
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive('bulletList')
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Lista numerada"
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive('orderedList')
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <span className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={handleOpenCitation}
            title="Inserir citação ABNT vinculada"
            className="px-2.5 py-1 rounded text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 flex items-center gap-1.5 cursor-pointer"
          >
            <MessageSquareQuote className="w-3.5 h-3.5" />
            <span>Citação</span>
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Citação direta longa (recuo 4 cm)"
            className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${
              editor.isActive('blockquote')
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            Recuo 4cm
          </button>

          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            title="Inserir imagem"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <ImagePlus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowTableModal(true)}
            title="Inserir tabela"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <TableIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowFootnoteModal(true)}
            title="Inserir nota de rodapé"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <StickyNote className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowEquationModal(true)}
            title="Inserir equação"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <Sigma className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {isFormOnlySection ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <CoverMetadataForm doc={doc} onChangeDoc={onChangeDoc} />
          </div>
        ) : isAutoIndexSection && paginated ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                  {activeSection.title} Automático
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Atualizado em tempo real conforme os títulos, figuras, tabelas e páginas do trabalho.
                </p>
              </div>
              <FileText className="w-5 h-5 text-blue-900 dark:text-blue-400" />
            </div>

            {activeSection.kind === 'sumario' && (
              <div className="space-y-2">
                {paginated.toc.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma seção textual ativa encontrada.</p>
                ) : (
                  paginated.toc.map((entry) => (
                    <button
                      key={entry.sectionId}
                      type="button"
                      onClick={() => onSelectSection(entry.sectionId)}
                      className="w-full flex items-baseline gap-2 text-sm text-slate-800 dark:text-slate-200 hover:text-blue-900 dark:hover:text-blue-400 py-1 cursor-pointer"
                    >
                      <span className={entry.level === 1 ? 'font-bold' : 'font-normal'}>
                        {entry.numberPrefix ? `${entry.numberPrefix} ` : ''}
                        {entry.title}
                      </span>
                      <span className="flex-1 border-b border-dotted border-slate-300 dark:border-slate-700" />
                      <span className="font-mono text-xs tabular-nums">{entry.pageNumber}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {activeSection.kind === 'lista_ilustracoes' && (
              <div className="space-y-2">
                {paginated.illustrations.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nenhuma ilustração inserida ainda. Use o botão de imagem nas seções textuais.
                  </p>
                ) : (
                  paginated.illustrations.map((item) => (
                    <div key={item.index} className="flex items-baseline gap-2 text-sm text-slate-800 dark:text-slate-200">
                      <span>
                        Figura {item.index} — {item.caption}
                      </span>
                      <span className="flex-1 border-b border-dotted border-slate-300 dark:border-slate-700" />
                      <span className="font-mono text-xs tabular-nums">{item.pageNumber}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeSection.kind === 'lista_tabelas' && (
              <div className="space-y-2">
                {paginated.tables.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nenhuma tabela inserida ainda. Use o botão de tabela nas seções textuais.
                  </p>
                ) : (
                  paginated.tables.map((item) => (
                    <div key={item.index} className="flex items-baseline gap-2 text-sm text-slate-800 dark:text-slate-200">
                      <span>
                        Tabela {item.index} — {item.caption}
                      </span>
                      <span className="flex-1 border-b border-dotted border-slate-300 dark:border-slate-700" />
                      <span className="font-mono text-xs tabular-nums">{item.pageNumber}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : isReferencesSection ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                  Referências Bibliográficas (NBR 6023:2025)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Organizadas automaticamente em ordem alfabética e alinhadas à esquerda.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenReferencesManager}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg flex items-center gap-2 cursor-pointer shrink-0"
              >
                <BookMarked className="w-3.5 h-3.5" />
                <span>Cadastrar ou editar referências</span>
              </button>
            </div>

            {sortedRefs.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Nenhuma referência cadastrada neste trabalho ainda.
                </p>
                <button
                  type="button"
                  onClick={onOpenReferencesManager}
                  className="text-sm font-medium text-blue-900 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Adicionar primeira referência
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedRefs.map((ref) => {
                  const formatted = formatReferenceNbr6023(ref);
                  return (
                    <div
                      key={ref.id}
                      className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-1.5"
                    >
                      <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed">
                        {formatted.segments.map((seg, i) =>
                          seg.bold ? (
                            <strong key={i}>{seg.text}</strong>
                          ) : seg.italic ? (
                            <em key={i}>{seg.text}</em>
                          ) : (
                            <React.Fragment key={i}>{seg.text}</React.Fragment>
                          )
                        )}
                      </p>
                      {formatted.missingFields.length > 0 && (
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Dados pendentes: {formatted.missingFields.join(', ')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {(activeSection.kind === 'resumo' || activeSection.kind === 'abstract') && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {activeSection.kind === 'abstract'
                    ? 'Keywords (separadas por ponto e vírgula, conforme NBR 6028)'
                    : 'Palavras-chave (separadas por ponto e vírgula, conforme NBR 6028)'}
                </label>
                <input
                  type="text"
                  value={activeSection.keywords || ''}
                  onChange={(e) => onUpdateSection(activeSection.id, { keywords: e.target.value })}
                  placeholder="Ex.: educação digital; metodologia científica; acessibilidade"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
                />
              </div>
            )}

            {activeSection.kind === 'epigrafe' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Autor da Epígrafe
                </label>
                <input
                  type="text"
                  value={activeSection.epigraphAuthor || ''}
                  onChange={(e) => onUpdateSection(activeSection.id, { epigraphAuthor: e.target.value })}
                  placeholder="Ex.: Paulo Freire"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
                />
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 min-h-[480px] text-slate-900 dark:text-slate-100">
              <EditorContent editor={editor} />
            </div>

            {doc.footnotes.filter((f) => f.sectionId === activeSection.id).length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Notas de rodapé desta seção
                </p>
                {doc.footnotes
                  .filter((f) => f.sectionId === activeSection.id)
                  .map((fn) => (
                    <div key={fn.id} className="flex items-start justify-between gap-3 text-xs text-slate-700 dark:text-slate-300">
                      <span>
                        <strong>[{fn.number}]</strong> {fn.text}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onChangeDoc({
                            ...doc,
                            footnotes: doc.footnotes.filter((item) => item.id !== fn.id),
                          })
                        }
                        className="text-red-600 hover:underline shrink-0 cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom word / char counter */}
      <div className="px-4 py-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
        <span>
          Seção: <strong className="text-slate-700 dark:text-slate-200">{sectionCounts.words}</strong> palavras ·{' '}
          <strong className="text-slate-700 dark:text-slate-200">{sectionCounts.chars}</strong> caracteres
        </span>
        <span>
          Total do documento: <strong className="text-slate-700 dark:text-slate-200">{totalWords}</strong> palavras
        </span>
      </div>

      {/* Insert Table Mini-Modal */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-sm w-full space-y-4">
            <h3 className="text-base font-display font-bold text-slate-900 dark:text-white">Inserir Tabela ABNT</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Linhas</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(2, Number(e.target.value) || 2))}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Colunas</label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(2, Number(e.target.value) || 2))}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={insertTable}
                className="px-4 py-1.5 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                Inserir tabela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insert Equation Mini-Modal */}
      {showEquationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-md w-full space-y-4">
            <h3 className="text-base font-display font-bold text-slate-900 dark:text-white">Inserir Equação</h3>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">
                Expressão matemática (ex.: E = m · c² ou ∑(xᵢ - μ)² / n)
              </label>
              <input
                type="text"
                value={equationText}
                onChange={(e) => setEquationText(e.target.value)}
                placeholder="f(x) = a·x² + b·x + c"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['∑', '∫', '√', '±', '≠', '≤', '≥', 'α', 'β', 'μ', 'σ', 'π', '²', '³'].map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => setEquationText((prev) => prev + sym)}
                    className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEquationModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={insertEquation}
                className="px-4 py-1.5 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                Inserir equação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insert Footnote Mini-Modal */}
      {showFootnoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-md w-full space-y-4">
            <h3 className="text-base font-display font-bold text-slate-900 dark:text-white">
              Inserir Nota de Rodapé
            </h3>
            <textarea
              rows={3}
              value={footnoteText}
              onChange={(e) => setFootnoteText(e.target.value)}
              placeholder="Texto explicativo da nota de rodapé..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFootnoteModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={insertFootnote}
                className="px-4 py-1.5 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                Inserir nota
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
