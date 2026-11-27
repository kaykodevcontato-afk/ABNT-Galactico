import React, { useMemo, useState } from 'react';
import { AlertTriangle, BookPlus, Check, MessageSquareQuote, Plus, Trash2, X } from 'lucide-react';
import {
  buildCitationHtml,
  formatReferenceNbr6023,
  getReferenceMissingFields,
  sortReferencesAlphabetically,
} from '../abnt/formatter';
import {
  AbntDocument,
  BibliographicReference,
  CitationKind,
  ReferenceType,
} from '../abnt/types';
import { uid } from '../storage/localRepository';

interface CitationsReferencesModalProps {
  doc: AbntDocument;
  initialTab: 'cite' | 'references';
  onInsertCitation?: (html: string) => void;
  onUpdateReferences: (refs: BibliographicReference[]) => void;
  onClose: () => void;
}

const REF_TYPE_LABELS: { id: ReferenceType; label: string }[] = [
  { id: 'livro', label: 'Livro' },
  { id: 'artigo', label: 'Artigo científico' },
  { id: 'site', label: 'Site / Página web' },
  { id: 'documento_oficial', label: 'Documento oficial' },
  { id: 'legislacao', label: 'Legislação' },
  { id: 'tese_dissertacao', label: 'Tese ou Dissertação' },
  { id: 'trabalho_academico', label: 'Trabalho acadêmico (TCC/Monografia)' },
  { id: 'documento_digital', label: 'Documento digital / Repositório' },
];

const EMPTY_REF = (type: ReferenceType = 'livro'): Omit<BibliographicReference, 'id'> => ({
  type,
  authors: '',
  title: '',
  subtitle: '',
  edition: '',
  city: '',
  publisher: '',
  year: '',
  pages: '',
  journalName: '',
  volume: '',
  issue: '',
  month: '',
  url: '',
  accessDate: '',
  doi: '',
  degree: '',
  institution: '',
  jurisdiction: '',
  lawNumber: '',
  lawDate: '',
  publicationOrgan: '',
});

export const CitationsReferencesModal: React.FC<CitationsReferencesModalProps> = ({
  doc,
  initialTab,
  onInsertCitation,
  onUpdateReferences,
  onClose,
}) => {
  const [tab, setTab] = useState<'cite' | 'references'>(
    onInsertCitation ? initialTab : 'references'
  );

  // Reference Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formRef, setFormRef] = useState<Omit<BibliographicReference, 'id'>>(EMPTY_REF('livro'));
  const [formError, setFormError] = useState('');

  // Citation Builder State
  const [citeKind, setCiteKind] = useState<CitationKind>('indireta');
  const [selectedRefId, setSelectedRefId] = useState<string>(doc.references[0]?.id || '');
  const [secondaryRefId, setSecondaryRefId] = useState<string>(doc.references[1]?.id || doc.references[0]?.id || '');
  const [quoteText, setQuoteText] = useState('');
  const [pageNumber, setPageNumber] = useState('');

  const sortedRefs = useMemo(() => sortReferencesAlphabetically(doc.references), [doc.references]);

  const previewFormattedRef = useMemo(
    () => formatReferenceNbr6023({ id: 'preview', ...formRef }),
    [formRef]
  );

  const selectedRef = doc.references.find((r) => r.id === selectedRefId) || sortedRefs[0];
  const secondaryRef = doc.references.find((r) => r.id === secondaryRefId);

  const citationPreview = useMemo(() => {
    if (!selectedRef) return null;
    return buildCitationHtml({
      kind: citeKind,
      reference: selectedRef,
      secondaryReference: secondaryRef,
      quoteText:
        quoteText ||
        (citeKind === 'indireta'
          ? 'Conforme evidenciado na análise teórica do estudo'
          : 'Digite aqui o trecho exato da citação'),
      page: pageNumber,
      uppercaseParentheses: doc.formatting.uppercaseInTextParentheses,
    });
  }, [citeKind, selectedRef, secondaryRef, quoteText, pageNumber, doc.formatting.uppercaseInTextParentheses]);

  const handleSaveReference = (e: React.FormEvent) => {
    e.preventDefault();
    const candidate: BibliographicReference = {
      id: editingId || uid('ref'),
      ...formRef,
    };
    const missing = getReferenceMissingFields(candidate);
    if (missing.length > 0) {
      setFormError(
        `Preencha os campos obrigatórios antes de salvar (não inventamos dados): ${missing.join(', ')}.`
      );
      return;
    }
    setFormError('');

    const updated = editingId
      ? doc.references.map((r) => (r.id === editingId ? candidate : r))
      : [...doc.references, candidate];

    onUpdateReferences(sortReferencesAlphabetically(updated));
    setSelectedRefId(candidate.id);
    setEditingId(null);
    setFormRef(EMPTY_REF(formRef.type));
  };

  const handleEditRef = (ref: BibliographicReference) => {
    setEditingId(ref.id);
    const { id: _id, ...rest } = ref;
    setFormRef(rest);
    setTab('references');
  };

  const handleDeleteRef = (id: string) => {
    onUpdateReferences(doc.references.filter((r) => r.id !== id));
    if (selectedRefId === id) setSelectedRefId('');
  };

  const handleInsert = () => {
    if (!citationPreview || !onInsertCitation) return;
    if ((citeKind === 'direta_curta' || citeKind === 'direta_longa') && !quoteText.trim()) {
      setFormError('Informe o texto da citação direta antes de inserir no documento.');
      return;
    }
    setFormError('');
    onInsertCitation(citationPreview.html);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white">
              Citações e Referências ABNT
            </h2>
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {onInsertCitation && (
                <button
                  type="button"
                  onClick={() => {
                    setFormError('');
                    setTab('cite');
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    tab === 'cite'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Inserir Citação (NBR 10520)
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setFormError('');
                  setTab('references');
                }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  tab === 'references'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Gerenciar Referências ({doc.references.length})
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {tab === 'cite' && onInsertCitation ? (
            <div className="space-y-5">
              {sortedRefs.length === 0 ? (
                <div className="p-8 border border-slate-200 dark:border-slate-800 rounded-xl text-center space-y-3">
                  <MessageSquareQuote className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Cadastre uma referência primeiro para associá-la à citação
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    O sistema associa cada citação à sua fonte real sem inventar autores ou páginas.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab('references')}
                    className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg cursor-pointer"
                  >
                    Cadastrar referência agora
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Tipo de Citação (ABNT NBR 10520:2023)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'indireta', label: 'Citação Indireta (paráfrase)' },
                          { id: 'direta_curta', label: 'Direta Curta (até 3 linhas)' },
                          { id: 'direta_longa', label: 'Direta Longa (> 3 linhas, recuo 4cm)' },
                          { id: 'apud', label: 'Citação de Citação (apud)' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setCiteKind(item.id as CitationKind)}
                            className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors cursor-pointer ${
                              citeKind === item.id
                                ? 'border-blue-900 bg-blue-50 text-blue-950 dark:border-blue-500 dark:bg-blue-950/50 dark:text-white'
                                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {citeKind === 'apud' ? 'Fonte Consultada (obra em mãos)' : 'Obra / Referência Associada'}
                      </label>
                      <select
                        value={selectedRef?.id || ''}
                        onChange={(e) => setSelectedRefId(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      >
                        {sortedRefs.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.authors || r.publicationOrgan || r.jurisdiction} ({r.year}) — {r.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {citeKind === 'apud' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Autor Original Citado (apud)
                        </label>
                        <select
                          value={secondaryRefId}
                          onChange={(e) => setSecondaryRefId(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                        >
                          {sortedRefs.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.authors || r.publicationOrgan} ({r.year}) — {r.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          {citeKind === 'indireta' ? 'Texto da paráfrase' : 'Trecho exato citado *'}
                        </label>
                        <textarea
                          rows={4}
                          value={quoteText}
                          onChange={(e) => setQuoteText(e.target.value)}
                          placeholder={
                            citeKind === 'indireta'
                              ? 'Ex.: De acordo com os resultados analisados, a acessibilidade digital melhora a retenção...'
                              : 'Cole ou digite exatamente o trecho da obra consultada...'
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Página(s)
                        </label>
                        <input
                          type="text"
                          value={pageNumber}
                          onChange={(e) => setPageNumber(e.target.value)}
                          placeholder="Ex.: 42 ou 42-43"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Pré-visualização da citação formatada
                      </p>
                      {citationPreview && (
                        <>
                          <div
                            className={`text-sm text-slate-900 dark:text-slate-100 leading-relaxed ${
                              citeKind === 'direta_longa' ? 'pl-8 text-xs' : ''
                            }`}
                          >
                            {citeKind === 'direta_curta' && `“${quoteText || 'Trecho citado'}” `}
                            {citeKind === 'direta_longa' && `${quoteText || 'Trecho citado longo...'} `}
                            {citeKind === 'indireta' &&
                              `${quoteText || 'Conforme evidenciado na análise teórica do estudo'} `}
                            {citeKind === 'apud' && `${quoteText || 'Conforme mencionado no estudo citado'} `}
                            <strong>
                              {citationPreview.html.match(/\([^)]+\)/)?.[0] || ''}
                            </strong>
                          </div>
                          {citationPreview.missingWarning && (
                            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>{citationPreview.missingWarning}</span>
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {formError && (
                      <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>
                    )}

                    <button
                      type="button"
                      onClick={handleInsert}
                      className="w-full py-2.5 px-4 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Inserir citação no texto</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Column */}
              <form onSubmit={handleSaveReference} className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookPlus className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                    <span>{editingId ? 'Editar referência' : 'Nova referência bibliográfica'}</span>
                  </h3>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setFormRef(EMPTY_REF('livro'));
                      }}
                      className="text-xs text-slate-500 hover:underline cursor-pointer"
                    >
                      Cancelar edição
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Fonte
                  </label>
                  <select
                    value={formRef.type}
                    onChange={(e) => setFormRef({ ...EMPTY_REF(e.target.value as ReferenceType), authors: formRef.authors, title: formRef.title, year: formRef.year })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {REF_TYPE_LABELS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formRef.type !== 'legislacao' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Autor(es) ou Órgão (ex.: SILVA, João; SOUZA, Ana) *
                    </label>
                    <input
                      type="text"
                      value={formRef.authors}
                      onChange={(e) => setFormRef({ ...formRef, authors: e.target.value })}
                      placeholder="SOBRENOME, Nome"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Título *
                    </label>
                    <input
                      type="text"
                      value={formRef.title}
                      onChange={(e) => setFormRef({ ...formRef, title: e.target.value })}
                      placeholder="Título da obra, artigo ou página"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Ano *
                    </label>
                    <input
                      type="text"
                      value={formRef.year}
                      onChange={(e) => setFormRef({ ...formRef, year: e.target.value })}
                      placeholder="2025"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Subtítulo (opcional)
                  </label>
                  <input
                    type="text"
                    value={formRef.subtitle || ''}
                    onChange={(e) => setFormRef({ ...formRef, subtitle: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                {formRef.type === 'livro' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Cidade *
                      </label>
                      <input
                        type="text"
                        value={formRef.city || ''}
                        onChange={(e) => setFormRef({ ...formRef, city: e.target.value })}
                        placeholder="São Paulo"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Editora *
                      </label>
                      <input
                        type="text"
                        value={formRef.publisher || ''}
                        onChange={(e) => setFormRef({ ...formRef, publisher: e.target.value })}
                        placeholder="Atlas"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Edição
                      </label>
                      <input
                        type="text"
                        value={formRef.edition || ''}
                        onChange={(e) => setFormRef({ ...formRef, edition: e.target.value })}
                        placeholder="3. ed."
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                  </div>
                )}

                {formRef.type === 'artigo' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Nome do Periódico *
                      </label>
                      <input
                        type="text"
                        value={formRef.journalName || ''}
                        onChange={(e) => setFormRef({ ...formRef, journalName: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Volume</label>
                      <input
                        type="text"
                        value={formRef.volume || ''}
                        onChange={(e) => setFormRef({ ...formRef, volume: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Páginas</label>
                      <input
                        type="text"
                        value={formRef.pages || ''}
                        onChange={(e) => setFormRef({ ...formRef, pages: e.target.value })}
                        placeholder="10-25"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                  </div>
                )}

                {(formRef.type === 'site' || formRef.type === 'documento_digital') && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        URL *
                      </label>
                      <input
                        type="url"
                        value={formRef.url || ''}
                        onChange={(e) => setFormRef({ ...formRef, url: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Data de acesso *
                      </label>
                      <input
                        type="text"
                        value={formRef.accessDate || ''}
                        onChange={(e) => setFormRef({ ...formRef, accessDate: e.target.value })}
                        placeholder="15 nov. 2026"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                  </div>
                )}

                {formRef.type === 'legislacao' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Jurisdição *
                      </label>
                      <input
                        type="text"
                        value={formRef.jurisdiction || ''}
                        onChange={(e) => setFormRef({ ...formRef, jurisdiction: e.target.value })}
                        placeholder="BRASIL"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Número da Lei *
                      </label>
                      <input
                        type="text"
                        value={formRef.lawNumber || ''}
                        onChange={(e) => setFormRef({ ...formRef, lawNumber: e.target.value })}
                        placeholder="Lei nº 9.394"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Data da norma
                      </label>
                      <input
                        type="text"
                        value={formRef.lawDate || ''}
                        onChange={(e) => setFormRef({ ...formRef, lawDate: e.target.value })}
                        placeholder="20 de dezembro de 1996"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                  </div>
                )}

                {(formRef.type === 'tese_dissertacao' || formRef.type === 'trabalho_academico') && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Instituição *
                      </label>
                      <input
                        type="text"
                        value={formRef.institution || ''}
                        onChange={(e) => setFormRef({ ...formRef, institution: e.target.value })}
                        placeholder="Universidade..."
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Grau / Tipo
                      </label>
                      <input
                        type="text"
                        value={formRef.degree || ''}
                        onChange={(e) => setFormRef({ ...formRef, degree: e.target.value })}
                        placeholder="Dissertação (Mestrado)"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                  </div>
                )}

                {formRef.type === 'documento_oficial' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Órgão Emissor
                      </label>
                      <input
                        type="text"
                        value={formRef.publicationOrgan || ''}
                        onChange={(e) => setFormRef({ ...formRef, publicationOrgan: e.target.value })}
                        placeholder="Ministério da Educação"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={formRef.city || ''}
                        onChange={(e) => setFormRef({ ...formRef, city: e.target.value })}
                        placeholder="Brasília"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] font-medium text-slate-500 mb-1">Pré-visualização NBR 6023:2025</p>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                    {previewFormattedRef.segments.map((s, i) =>
                      s.bold ? <strong key={i}>{s.text}</strong> : <React.Fragment key={i}>{s.text}</React.Fragment>
                    )}
                  </p>
                </div>

                {formError && <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>}

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{editingId ? 'Salvar alterações' : 'Adicionar à lista de referências'}</span>
                </button>
              </form>

              {/* Saved References List */}
              <div className="lg:col-span-6 space-y-3">
                <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                  Referências cadastradas (ordem alfabética)
                </h3>
                {sortedRefs.length === 0 ? (
                  <div className="p-8 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-sm text-slate-500">
                    Nenhuma referência cadastrada neste trabalho ainda.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                    {sortedRefs.map((ref) => {
                      const fmt = formatReferenceNbr6023(ref);
                      return (
                        <div
                          key={ref.id}
                          className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2"
                        >
                          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                            {fmt.segments.map((s, i) =>
                              s.bold ? <strong key={i}>{s.text}</strong> : <React.Fragment key={i}>{s.text}</React.Fragment>
                            )}
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>{REF_TYPE_LABELS.find((t) => t.id === ref.type)?.label}</span>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleEditRef(ref)}
                                className="text-blue-900 dark:text-blue-400 hover:underline cursor-pointer"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRef(ref.id)}
                                className="text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
