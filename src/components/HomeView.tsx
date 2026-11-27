import React, { useRef, useState } from 'react';
import {
  BookOpen,
  Download,
  FilePlus2,
  FileText,
  FolderOpen,
  Moon,
  Scale,
  Search,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { computeDocumentProgress } from '../abnt/formatter';
import { DOCUMENT_TYPE_SPECS } from '../abnt/standards';
import { AbntDocument, DocumentTypeId } from '../abnt/types';

interface HomeViewProps {
  documents: AbntDocument[];
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onCreateNew: (preselectedType?: DocumentTypeId) => void;
  onOpenDocument: (doc: AbntDocument) => void;
  onDeleteDocument: (id: string) => void;
  onDuplicateDocument: (doc: AbntDocument) => void;
  onImportProjectFile: (file: File) => void;
  onExportBackup: () => void;
  onExportSingleProject: (doc: AbntDocument) => void;
  onOpenStandardsAdmin: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  documents,
  darkMode,
  onToggleDarkMode,
  onCreateNew,
  onOpenDocument,
  onDeleteDocument,
  onDuplicateDocument,
  onImportProjectFile,
  onExportBackup,
  onExportSingleProject,
  onOpenStandardsAdmin,
}) => {
  const [activeNav, setActiveNav] = useState<'inicio' | 'meus_trabalhos' | 'modelos'>('inicio');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AbntDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDocs = documents.filter((d) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const specName = DOCUMENT_TYPE_SPECS[d.type]?.name.toLowerCase() || '';
    return (
      d.metadata.title.toLowerCase().includes(q) ||
      d.metadata.author.toLowerCase().includes(q) ||
      d.metadata.institution.toLowerCase().includes(q) ||
      specName.includes(q)
    );
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportProjectFile(file);
      e.target.value = '';
    }
  };

  const scrollToSection = (nav: 'inicio' | 'meus_trabalhos' | 'modelos', elementId: string) => {
    setActiveNav(nav);
    const el = document.getElementById(elementId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const docTypeList = Object.values(DOCUMENT_TYPE_SPECS);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <input
        ref={fileInputRef}
        type="file"
        accept=".abntproj,.json,.txt,.md,.html"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Navigation Bar - Strict 3-zone layout */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => scrollToSection('inicio', 'home-hero')}
            className="text-lg font-display font-bold tracking-tight text-blue-950 dark:text-white whitespace-nowrap shrink-0 flex items-center gap-2.5 cursor-pointer"
          >
            <BookOpen className="w-5 h-5 text-blue-900 dark:text-blue-400" />
            <span>ABNT GALÁCTICO</span>
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => scrollToSection('inicio', 'home-hero')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                activeNav === 'inicio'
                  ? 'border-blue-900 text-blue-950 dark:border-blue-400 dark:text-white'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Início
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('meus_trabalhos', 'meus-trabalhos-section')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                activeNav === 'meus_trabalhos'
                  ? 'border-blue-900 text-blue-950 dark:border-blue-400 dark:text-white'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Meus trabalhos
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('modelos', 'modelos-section')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                activeNav === 'modelos'
                  ? 'border-blue-900 text-blue-950 dark:border-blue-400 dark:text-white'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Modelos
            </button>
            <button
              type="button"
              onClick={onOpenStandardsAdmin}
              className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Normas ABNT
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onToggleDarkMode}
              title={darkMode ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => onCreateNew()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-600 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Criar novo trabalho</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-14">
        {/* Hero / Quick Start */}
        <section id="home-hero" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-400">
              Editor Acadêmico Inteligente · NBR 14724 · NBR 10520 · NBR 6023
            </p>
            <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-slate-900 dark:text-white text-balance">
              Você escreve. Nós organizamos conforme a ABNT.
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Crie trabalhos escolares, TCCs, artigos científicos, monografias, dissertações e teses com visualização A4 em tempo real, sumário automático, citações vinculadas e exportação fiel em PDF e Word.
            </p>

            <div className="pt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onCreateNew()}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>Criar novo trabalho</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('meus_trabalhos', 'meus-trabalhos-section')}
                className="px-5 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Meus trabalhos</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Abrir documento</span>
              </button>
            </div>
          </div>
        </section>

        {/* Recent Documents / My Works */}
        <section id="meus-trabalhos-section" className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">
                Documentos recentes e Meus trabalhos
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {documents.length} {documents.length === 1 ? 'trabalho salvo localmente' : 'trabalhos salvos localmente'} com salvamento automático ativo
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar título, autor ou tipo..."
                  className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-800 w-64"
                />
              </div>
              <button
                type="button"
                onClick={onExportBackup}
                className="px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Cópia de segurança</span>
              </button>
            </div>
          </div>

          {filteredDocs.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-base font-medium text-slate-800 dark:text-slate-200">
                Nenhum documento encontrado
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Crie um novo trabalho acadêmico ou abra um arquivo de projeto salvo.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onCreateNew()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                >
                  Criar novo trabalho
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => {
                const spec = DOCUMENT_TYPE_SPECS[doc.type];
                const progress = computeDocumentProgress(doc);
                const updatedDate = new Date(doc.updatedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <div
                    key={doc.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-blue-800/40 dark:hover:border-blue-500/40 transition-colors"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-blue-900 dark:text-blue-400">
                          {spec?.name || 'Documento'}
                        </span>
                        <span className="tabular-nums">{updatedDate}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenDocument(doc)}
                        className="text-left w-full group cursor-pointer"
                      >
                        <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white group-hover:text-blue-900 dark:group-hover:text-blue-400 line-clamp-2 transition-colors">
                          {doc.metadata.title || 'Documento sem título'}
                        </h3>
                      </button>

                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {doc.metadata.author} · {doc.metadata.institution || 'Instituição não informada'}
                      </p>

                      {/* Progress indicator */}
                      <div className="pt-1 space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                          <span>
                            {progress.completedSections}/{progress.totalSections} seções · {progress.wordCount} palavras
                          </span>
                          <span className="font-medium">{progress.percent}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-900 dark:bg-blue-500 transition-all"
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenDocument(doc)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-600 rounded-md transition-colors cursor-pointer"
                      >
                        Abrir editor
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onDuplicateDocument(doc)}
                          title="Duplicar trabalho"
                          className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                        >
                          Duplicar
                        </button>
                        <button
                          type="button"
                          onClick={() => onExportSingleProject(doc)}
                          title="Baixar arquivo do projeto (.abntproj)"
                          className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(doc)}
                          title="Excluir documento"
                          className="p-1.5 text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Document Templates Grid */}
        <section id="modelos-section" className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">
                Modelos de trabalhos disponíveis
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Cada modelo aplica automaticamente a estrutura e as normas ABNT específicas da categoria selecionada.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenStandardsAdmin}
              className="text-sm font-medium text-blue-900 dark:text-blue-400 hover:underline flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Scale className="w-4 h-4" />
              <span>Gerenciar versões das normas ABNT</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docTypeList.map((spec) => (
              <div
                key={spec.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {spec.governingStandard} · {spec.defaultSections.filter((s) => s.enabled).length} seções iniciais
                  </div>
                  <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white">
                    {spec.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {spec.shortDescription}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                  <span>
                    {spec.hasCover ? 'Com capa' : 'Sem capa'} · {spec.hasSumario ? 'Com sumário' : 'Sem sumário'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onCreateNew(spec.id)}
                    className="px-3 py-1.5 text-xs font-medium text-blue-900 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md transition-colors cursor-pointer"
                  >
                    Usar modelo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white">
              Confirmar exclusão do documento
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Tem certeza que deseja excluir permanentemente o trabalho{' '}
              <strong className="text-slate-900 dark:text-white">{deleteTarget.metadata.title}</strong>? Esta ação não poderá ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteDocument(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
              >
                Excluir trabalho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
