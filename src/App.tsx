import { useEffect, useRef, useState } from 'react';
import { escapeHtml } from './abnt/formatter';
import { DEFAULT_ABNT_STANDARDS, INSTITUTIONAL_PROFILES } from './abnt/standards';
import {
  AbntDocument,
  AbntStandardRule,
  DocumentTypeId,
  FontFamilyOption,
  InstitutionalProfile,
} from './abnt/types';
import { CreateDocumentModal } from './components/CreateDocumentModal';
import { EditorView } from './components/EditorView';
import { HomeView } from './components/HomeView';
import { StandardsAdminModal } from './components/StandardsAdminModal';
import { sanitizeFileName } from './export/pdfExporter';
import {
  clearRecoverySnapshot,
  createDocumentFromTemplate,
  documentRepository,
  getRecoverySnapshot,
  saveRecoverySnapshot,
  uid,
} from './storage/localRepository';

const THEME_KEY = 'abnt_smart_editor_theme_v1';

export default function App() {
  const [documents, setDocuments] = useState<AbntDocument[]>([]);
  const [activeDoc, setActiveDoc] = useState<AbntDocument | null>(null);
  const [standards, setStandards] = useState<AbntStandardRule[]>(DEFAULT_ABNT_STANDARDS);
  const [profiles, setProfiles] = useState<InstitutionalProfile[]>(INSTITUTIONAL_PROFILES);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  const [saveStatusText, setSaveStatusText] = useState('Salvo localmente');
  const [createModalState, setCreateModalState] = useState<{ open: boolean; preselected?: DocumentTypeId }>({
    open: false,
  });
  const [showStandardsModal, setShowStandardsModal] = useState(false);
  const [recoveryCandidate, setRecoveryCandidate] = useState<{ savedAt: string; doc: AbntDocument } | null>(null);
  const [appToast, setAppToast] = useState<string | null>(null);

  const autosaveTimer = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage error
    }
  }, [darkMode]);

  useEffect(() => {
    const loadInitial = async () => {
      const [docs, stds, profs] = await Promise.all([
        documentRepository.listDocuments(),
        documentRepository.getStandardsCatalog(),
        documentRepository.getInstitutionalProfiles(),
      ]);
      setDocuments(docs);
      setStandards(stds);
      setProfiles(profs);

      const snapshot = getRecoverySnapshot();
      if (snapshot) {
        const stored = docs.find((d) => d.id === snapshot.doc.id);
        if (!stored || new Date(snapshot.savedAt).getTime() > new Date(stored.updatedAt).getTime() + 1500) {
          setRecoveryCandidate(snapshot);
        } else {
          clearRecoverySnapshot();
        }
      }
    };
    loadInitial();
  }, []);

  const notify = (msg: string) => {
    setAppToast(msg);
    setTimeout(() => setAppToast(null), 3500);
  };

  const handleCreateDocument = async (payload: {
    type: DocumentTypeId;
    institution: string;
    course: string;
    author: string;
    title: string;
    subtitle: string;
    advisor: string;
    city: string;
    year: string;
    fontFamily: FontFamilyOption;
    profileId: string;
  }) => {
    const prof = profiles.find((p) => p.id === payload.profileId) || profiles[0];
    const newDoc = createDocumentFromTemplate(
      payload.type,
      {
        institution: payload.institution,
        course: payload.course,
        author: payload.author,
        title: payload.title,
        subtitle: payload.subtitle,
        advisor: payload.advisor,
        city: payload.city,
        year: payload.year,
      },
      {
        fontFamily: payload.fontFamily,
        institutionalProfileId: prof.id,
        marginsCm: { ...prof.marginsCm },
        paragraphIndentCm: prof.paragraphIndentCm,
        uppercaseInTextParentheses: prof.uppercaseInTextParentheses,
      }
    );

    const saved = await documentRepository.saveDocument(newDoc);
    const updatedList = await documentRepository.listDocuments();
    setDocuments(updatedList);
    setActiveDoc(saved);
    setCreateModalState({ open: false });
    setSaveStatusText('Documento criado e salvo');
  };

  const handleChangeDoc = (updated: AbntDocument) => {
    setActiveDoc(updated);
    setSaveStatusText('Salvando alterações...');
    saveRecoverySnapshot(updated);

    if (autosaveTimer.current) {
      window.clearTimeout(autosaveTimer.current);
    }

    autosaveTimer.current = window.setTimeout(async () => {
      const saved = await documentRepository.saveDocument(updated);
      clearRecoverySnapshot();
      setDocuments((prev) => {
        const exists = prev.some((d) => d.id === saved.id);
        const next = exists ? prev.map((d) => (d.id === saved.id ? saved : d)) : [saved, ...prev];
        return next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setSaveStatusText(`Salvo automaticamente às ${timeStr}`);
    }, 550);
  };

  const handleBackHome = async () => {
    if (activeDoc) {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
      await documentRepository.saveDocument(activeDoc);
      clearRecoverySnapshot();
      const freshList = await documentRepository.listDocuments();
      setDocuments(freshList);
    }
    setActiveDoc(null);
  };

  const handleDeleteDocument = async (id: string) => {
    await documentRepository.deleteDocument(id);
    const freshList = await documentRepository.listDocuments();
    setDocuments(freshList);
    notify('Documento excluído.');
  };

  const handleDuplicateDocument = async (doc: AbntDocument) => {
    const copy: AbntDocument = {
      ...doc,
      id: uid('doc'),
      metadata: {
        ...doc.metadata,
        title: `${doc.metadata.title} (Cópia)`,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await documentRepository.saveDocument(copy);
    const freshList = await documentRepository.listDocuments();
    setDocuments(freshList);
    notify('Cópia do trabalho criada.');
  };

  const handleExportSingleProject = (doc: AbntDocument) => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFileName(doc.metadata.title)}.abntproj.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAllBackup = async () => {
    const json = await documentRepository.exportAllBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abnt-smart-editor-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Cópia de segurança exportada.');
  };

  const handleImportProjectFile = async (file: File) => {
    try {
      const text = await file.text();
      if (file.name.endsWith('.json') || file.name.endsWith('.abntproj')) {
        const merged = await documentRepository.importBackup(text);
        setDocuments(merged);
        if (merged[0]) setActiveDoc(merged[0]);
        notify('Projeto importado com sucesso.');
      } else {
        // Import plain text / markdown / html into a structured academic work
        const paragraphs = text
          .split(/\r?\n\s*\r?\n/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => `<p>${escapeHtml(p)}</p>`)
          .join('');
        const importedDoc = createDocumentFromTemplate('trabalho_academico', {
          title: file.name.replace(/\.[^.]+$/, ''),
        });
        const devSec = importedDoc.sections.find((s) => s.kind === 'desenvolvimento');
        if (devSec && paragraphs) {
          devSec.content = paragraphs;
        }
        const saved = await documentRepository.saveDocument(importedDoc);
        const list = await documentRepository.listDocuments();
        setDocuments(list);
        setActiveDoc(saved);
        notify('Texto importado e estruturado no formato ABNT.');
      }
    } catch {
      notify('Não foi possível abrir o arquivo selecionado.');
    }
  };

  const handleUpdateStandards = async (updated: AbntStandardRule[]) => {
    setStandards(updated);
    await documentRepository.saveStandardsCatalog(updated);
    notify('Catálogo de normas atualizado.');
  };

  const handleUpdateProfiles = async (updated: InstitutionalProfile[]) => {
    setProfiles(updated);
    await documentRepository.saveInstitutionalProfiles(updated);
    notify('Perfil institucional salvo.');
  };

  const handleApplyProfileToActiveDoc = (prof: InstitutionalProfile) => {
    if (!activeDoc) return;
    handleChangeDoc({
      ...activeDoc,
      formatting: {
        ...activeDoc.formatting,
        institutionalProfileId: prof.id,
        fontFamily: prof.defaultFont,
        marginsCm: { ...prof.marginsCm },
        paragraphIndentCm: prof.paragraphIndentCm,
        uppercaseInTextParentheses: prof.uppercaseInTextParentheses,
      },
    });
    setShowStandardsModal(false);
    notify(`Perfil "${prof.name}" aplicado ao trabalho atual.`);
  };

  return (
    <>
      {activeDoc ? (
        <EditorView
          doc={activeDoc}
          darkMode={darkMode}
          saveStatusText={saveStatusText}
          onToggleDarkMode={() => setDarkMode((v) => !v)}
          onBackHome={handleBackHome}
          onChangeDoc={handleChangeDoc}
          onOpenStandardsAdmin={() => setShowStandardsModal(true)}
        />
      ) : (
        <HomeView
          documents={documents}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((v) => !v)}
          onCreateNew={(preselected) => setCreateModalState({ open: true, preselected })}
          onOpenDocument={(doc) => {
            setActiveDoc(doc);
            setSaveStatusText('Salvo localmente');
          }}
          onDeleteDocument={handleDeleteDocument}
          onDuplicateDocument={handleDuplicateDocument}
          onImportProjectFile={handleImportProjectFile}
          onExportBackup={handleExportAllBackup}
          onExportSingleProject={handleExportSingleProject}
          onOpenStandardsAdmin={() => setShowStandardsModal(true)}
        />
      )}

      {/* Document Creation Wizard */}
      {createModalState.open && (
        <CreateDocumentModal
          initialType={createModalState.preselected}
          profiles={profiles}
          onClose={() => setCreateModalState({ open: false })}
          onCreate={handleCreateDocument}
        />
      )}

      {/* Standards Admin & Institutional Profiles */}
      {showStandardsModal && (
        <StandardsAdminModal
          standards={standards}
          profiles={profiles}
          currentDoc={activeDoc}
          onUpdateStandards={handleUpdateStandards}
          onUpdateProfiles={handleUpdateProfiles}
          onApplyProfileToDoc={activeDoc ? handleApplyProfileToActiveDoc : undefined}
          onClose={() => setShowStandardsModal(false)}
        />
      )}

      {/* Document Recovery Prompt */}
      {recoveryCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white">
              Recuperação de documento disponível
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Encontramos alterações não finalizadas para{' '}
              <strong>{recoveryCandidate.doc.metadata.title}</strong> de{' '}
              {new Date(recoveryCandidate.savedAt).toLocaleString('pt-BR')}. Deseja restaurar esta versão?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  clearRecoverySnapshot();
                  setRecoveryCandidate(null);
                }}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const saved = await documentRepository.saveDocument(recoveryCandidate.doc);
                  clearRecoverySnapshot();
                  setDocuments(await documentRepository.listDocuments());
                  setActiveDoc(saved);
                  setRecoveryCandidate(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                Restaurar trabalho
              </button>
            </div>
          </div>
        </div>
      )}

      {appToast && (
        <div className="no-print fixed bottom-5 left-5 z-50 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium shadow-lg">
          {appToast}
        </div>
      )}
    </>
  );
}
