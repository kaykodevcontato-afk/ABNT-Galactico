import React, { useState } from 'react';
import {
  ArrowLeft,
  BookMarked,
  CheckCircle2,
  Download,
  FileArchive,
  FileCheck2,
  FileDown,
  FileText,
  Moon,
  Printer,
  Scale,
  Settings2,
  Sun,
} from 'lucide-react';
import { DOCUMENT_TYPE_SPECS } from '../abnt/standards';
import {
  AbntDocument,
  BibliographicReference,
  ComplianceCheckItem,
  DocumentSection,
  InstitutionalProfile,
} from '../abnt/types';
import { exportDocumentToDocx } from '../export/docxExporter';
import { exportDocumentToPdf, sanitizeFileName } from '../export/pdfExporter';
import { exportDocumentToSeparatedWebZip } from '../export/webBundleExporter';
import { AbntPreviewPanel, AbntPrintRoot } from './AbntPreviewPanel';
import { CitationsReferencesModal } from './CitationsReferencesModal';
import { ComplianceModal } from './ComplianceModal';
import { CoverMetadataModal } from './CoverMetadataModal';
import { RichEditorPanel } from './RichEditorPanel';
import { StructurePanel } from './StructurePanel';

interface EditorViewProps {
  doc: AbntDocument;
  darkMode: boolean;
  saveStatusText: string;
  onToggleDarkMode: () => void;
  onBackHome: () => void;
  onChangeDoc: (updated: AbntDocument) => void;
  onOpenStandardsAdmin: () => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  doc,
  darkMode,
  saveStatusText,
  onToggleDarkMode,
  onBackHome,
  onChangeDoc,
  onOpenStandardsAdmin,
}) => {
  const [activeSectionId, setActiveSectionId] = useState<string>(
    doc.sections.find((s) => s.enabled && s.part === 'textual')?.id || doc.sections[0]?.id || ''
  );
  const [mobilePane, setMobilePane] = useState<'structure' | 'editor' | 'preview'>('editor');

  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [citationsModalState, setCitationsModalState] = useState<{
    open: boolean;
    tab: 'cite' | 'references';
    insertCb?: (html: string) => void;
  }>({ open: false, tab: 'references' });

  const [exportingKind, setExportingKind] = useState<'pdf' | 'docx' | 'webzip' | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const activeSection =
    doc.sections.find((s) => s.id === activeSectionId) || doc.sections[0];

  const spec = DOCUMENT_TYPE_SPECS[doc.type];

  const handleUpdateSection = (sectionId: string, patch: Partial<DocumentSection>) => {
    onChangeDoc({
      ...doc,
      sections: doc.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    });
  };

  const handleUpdateSections = (sections: DocumentSection[]) => {
    onChangeDoc({ ...doc, sections });
  };

  const handleUpdateReferences = (references: BibliographicReference[]) => {
    onChangeDoc({ ...doc, references });
  };

  const handleApplyAutoFix = (fixKey: NonNullable<ComplianceCheckItem['autoFixKey']>) => {
    if (fixKey === 'apply_abnt_margins') {
      onChangeDoc({
        ...doc,
        formatting: {
          ...doc.formatting,
          marginsCm: { top: 3, left: 3, bottom: 2, right: 2 },
        },
      });
    } else if (fixKey === 'apply_abnt_typography') {
      onChangeDoc({
        ...doc,
        formatting: {
          ...doc.formatting,
          bodyFontSizePt: 12,
          quoteFontSizePt: 10,
          lineSpacing: 1.5,
          paragraphIndentCm: 1.25,
          fontFamily:
            doc.formatting.fontFamily === 'Arial' || doc.formatting.fontFamily === 'Times New Roman'
              ? doc.formatting.fontFamily
              : 'Times New Roman',
        },
      });
    } else if (fixKey === 'enable_sumario') {
      onChangeDoc({
        ...doc,
        sections: doc.sections.map((s) => (s.kind === 'sumario' ? { ...s, enabled: true } : s)),
      });
    } else if (fixKey === 'enable_capa') {
      onChangeDoc({
        ...doc,
        sections: doc.sections.map((s) => (s.kind === 'capa' ? { ...s, enabled: true } : s)),
      });
    }
  };

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleExportPdf = async () => {
    setExportingKind('pdf');
    try {
      await exportDocumentToPdf(doc);
      showToast('PDF A4 exportado com sucesso.');
    } catch {
      showToast('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setExportingKind(null);
    }
  };

  const handleExportDocx = async () => {
    setExportingKind('docx');
    try {
      await exportDocumentToDocx(doc);
      showToast('Documento Word (.docx) editável exportado com sucesso.');
    } catch {
      showToast('Erro ao gerar DOCX. Tente novamente.');
    } finally {
      setExportingKind(null);
    }
  };

  const handleExportWebZip = async () => {
    setExportingKind('webzip');
    try {
      await exportDocumentToSeparatedWebZip(doc);
      showToast('Pacote separado em pastas html/, css/ e js/ (.zip) exportado.');
    } catch {
      showToast('Erro ao gerar pacote HTML/CSS/JS. Tente novamente.');
    } finally {
      setExportingKind(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadProject = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFileName(doc.metadata.title)}.abntproj.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Cópia do projeto (.abntproj.json) salva.');
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Workspace Top Bar (hidden on print) */}
      <header className="no-print h-14 px-3 sm:px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackHome}
            title="Voltar para a tela inicial"
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-display font-bold text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-xs">
                {doc.metadata.title || 'Trabalho sem título'}
              </h1>
              <span className="hidden md:inline text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                · {spec.name}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {saveStatusText}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setShowCoverModal(true)}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Capa e Margens</span>
          </button>

          <button
            type="button"
            onClick={() => setCitationsModalState({ open: true, tab: 'references' })}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Referências ({doc.references.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowComplianceModal(true)}
            className="px-3 py-1.5 text-xs font-medium text-blue-950 dark:text-blue-200 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Verificar meu trabalho</span>
          </button>

          <button
            type="button"
            onClick={onOpenStandardsAdmin}
            title="Normas ABNT e perfis institucionais"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5" />
          </button>

          <span className="hidden sm:inline h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingKind === 'pdf'}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 disabled:opacity-60 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{exportingKind === 'pdf' ? 'Gerando...' : 'Exportar PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportDocx}
            disabled={exportingKind === 'docx'}
            className="px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-60 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{exportingKind === 'docx' ? 'Gerando...' : 'Exportar Word'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportWebZip}
            disabled={exportingKind === 'webzip'}
            title="Baixar documento separado em pastas html/, css/ e js/ (.zip)"
            className="px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-60 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileArchive className="w-3.5 h-3.5" />
            <span>{exportingKind === 'webzip' ? 'Gerando...' : 'HTML/CSS/JS'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            title="Imprimir trabalho em A4"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleDownloadProject}
            title="Baixar cópia do projeto (.abntproj.json)"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleDarkMode}
            title={darkMode ? 'Tema claro' : 'Tema escuro'}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile / Tablet Pane Switcher */}
      <div className="no-print lg:hidden px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1">
        {[
          { id: 'structure', label: 'Estrutura' },
          { id: 'editor', label: 'Editor' },
          { id: 'preview', label: 'Preview A4' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMobilePane(tab.id as typeof mobilePane)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              mobilePane === tab.id
                ? 'bg-blue-900 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Three-Pane Editor Workspace */}
      <main className="no-print flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
        <div
          className={`lg:col-span-3 xl:col-span-2 min-h-0 ${
            mobilePane === 'structure' ? 'block' : 'hidden lg:block'
          }`}
        >
          <StructurePanel
            doc={doc}
            activeSectionId={activeSection.id}
            onSelectSection={(id) => {
              setActiveSectionId(id);
              setMobilePane('editor');
            }}
            onUpdateSections={handleUpdateSections}
          />
        </div>

        <div
          className={`lg:col-span-5 xl:col-span-6 min-h-0 ${
            mobilePane === 'editor' ? 'block' : 'hidden lg:block'
          }`}
        >
          <RichEditorPanel
            doc={doc}
            activeSection={activeSection}
            onChangeDoc={onChangeDoc}
            onUpdateSection={handleUpdateSection}
            onSelectSection={setActiveSectionId}
            onOpenCitationsModal={(insertCb) =>
              setCitationsModalState({ open: true, tab: 'cite', insertCb })
            }
            onOpenReferencesManager={() =>
              setCitationsModalState({ open: true, tab: 'references' })
            }
          />
        </div>

        <div
          className={`lg:col-span-4 xl:col-span-4 min-h-0 ${
            mobilePane === 'preview' ? 'block' : 'hidden lg:block'
          }`}
        >
          <AbntPreviewPanel
            doc={doc}
            onSelectSection={(id) => {
              setActiveSectionId(id);
              setMobilePane('editor');
            }}
          />
        </div>
      </main>

      {/* Dedicated Print Root for clean A4 printing */}
      <AbntPrintRoot doc={doc} />

      {/* Toast Notification */}
      {feedbackMsg && (
        <div className="no-print fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Modals */}
      {showCoverModal && (
        <CoverMetadataModal
          doc={doc}
          onChangeDoc={onChangeDoc}
          onClose={() => setShowCoverModal(false)}
        />
      )}

      {showComplianceModal && (
        <ComplianceModal
          doc={doc}
          onApplyAutoFix={handleApplyAutoFix}
          onJumpToSection={(id) => setActiveSectionId(id)}
          onClose={() => setShowComplianceModal(false)}
        />
      )}

      {citationsModalState.open && (
        <CitationsReferencesModal
          doc={doc}
          initialTab={citationsModalState.tab}
          onInsertCitation={citationsModalState.insertCb}
          onUpdateReferences={handleUpdateReferences}
          onClose={() => setCitationsModalState({ open: false, tab: 'references' })}
        />
      )}
    </div>
  );
};
