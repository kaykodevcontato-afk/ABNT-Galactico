import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Eye,
  EyeOff,
  Indent,
  Outdent,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { computeSectionNumbers, countWordsAndChars } from '../abnt/formatter';
import { AbntDocument, DocumentSection, SectionKind, SectionPart } from '../abnt/types';
import { uid } from '../storage/localRepository';

interface StructurePanelProps {
  doc: AbntDocument;
  activeSectionId: string;
  onSelectSection: (sectionId: string) => void;
  onUpdateSections: (sections: DocumentSection[]) => void;
}

const ADDABLE_PRESETS: { label: string; kind: SectionKind; part: SectionPart; level: 1 | 2 | 3 }[] = [
  { label: 'Novo Capítulo (Nível 1)', kind: 'custom_textual', part: 'textual', level: 1 },
  { label: 'Nova Subseção (Nível 2)', kind: 'custom_textual', part: 'textual', level: 2 },
  { label: 'Nova Subseção (Nível 3)', kind: 'custom_textual', part: 'textual', level: 3 },
  { label: 'Dedicatória', kind: 'dedicatoria', part: 'pre_textual', level: 1 },
  { label: 'Agradecimentos', kind: 'agradecimentos', part: 'pre_textual', level: 1 },
  { label: 'Epígrafe', kind: 'epigrafe', part: 'pre_textual', level: 1 },
  { label: 'Lista de Ilustrações', kind: 'lista_ilustracoes', part: 'pre_textual', level: 1 },
  { label: 'Lista de Tabelas', kind: 'lista_tabelas', part: 'pre_textual', level: 1 },
  { label: 'Apêndice', kind: 'apendice', part: 'post_textual', level: 1 },
  { label: 'Anexo', kind: 'anexo', part: 'post_textual', level: 1 },
];

export const StructurePanel: React.FC<StructurePanelProps> = ({
  doc,
  activeSectionId,
  onSelectSection,
  onUpdateSections,
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);

  const sectionNumbers = computeSectionNumbers(doc.sections);

  const moveSection = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= doc.sections.length) return;
    // Keep sections within their structural part (pre, textual, post)
    if (doc.sections[index].part !== doc.sections[targetIdx].part) return;
    const copy = [...doc.sections];
    const [removed] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, removed);
    onUpdateSections(copy);
  };

  const changeLevel = (id: string, delta: -1 | 1) => {
    const updated = doc.sections.map((s) => {
      if (s.id !== id || s.part !== 'textual') return s;
      const nextLevel = Math.min(3, Math.max(1, s.level + delta)) as 1 | 2 | 3;
      return { ...s, level: nextLevel };
    });
    onUpdateSections(updated);
  };

  const toggleEnabled = (id: string) => {
    const updated = doc.sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    onUpdateSections(updated);
  };

  const removeSection = (sec: DocumentSection) => {
    if (sec.locked) return;
    const updated = doc.sections.filter((s) => s.id !== sec.id);
    onUpdateSections(updated);
    if (activeSectionId === sec.id && updated.length > 0) {
      onSelectSection(updated[0].id);
    }
  };

  const addSection = (preset: (typeof ADDABLE_PRESETS)[number]) => {
    const newSec: DocumentSection = {
      id: uid('sec'),
      kind: preset.kind,
      part: preset.part,
      title:
        preset.kind === 'apendice'
          ? 'Apêndice — Novo Material'
          : preset.kind === 'anexo'
            ? 'Anexo — Novo Documento'
            : preset.kind === 'custom_textual'
              ? preset.level === 1
                ? 'Novo Capítulo'
                : 'Nova Subseção'
              : preset.label,
      level: preset.level,
      content: '<p></p>',
      enabled: true,
    };

    const copy = [...doc.sections];
    // Insert at the end of the matching part (before Referências if textual)
    if (preset.part === 'pre_textual') {
      const sumarioIdx = copy.findIndex((s) => s.kind === 'sumario');
      const insertAt = sumarioIdx >= 0 ? sumarioIdx : copy.filter((s) => s.part === 'pre_textual').length;
      copy.splice(insertAt, 0, newSec);
    } else if (preset.part === 'textual') {
      const lastTextualIdx = copy.reduce((acc, s, i) => (s.part === 'textual' ? i : acc), -1);
      if (lastTextualIdx >= 0) {
        copy.splice(lastTextualIdx + 1, 0, newSec);
      } else {
        const postIdx = copy.findIndex((s) => s.part === 'post_textual');
        copy.splice(postIdx >= 0 ? postIdx : copy.length, 0, newSec);
      }
    } else {
      copy.push(newSec);
    }

    onUpdateSections(copy);
    onSelectSection(newSec.id);
    setShowAddMenu(false);
  };

  const commitRename = (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      onUpdateSections(doc.sections.map((s) => (s.id === id ? { ...s, title: trimmed } : s)));
    }
    setRenamingId(null);
  };

  const parts: { key: SectionPart; label: string }[] = [
    { key: 'pre_textual', label: 'Pré-textuais' },
    { key: 'textual', label: 'Textuais' },
    { key: 'post_textual', label: 'Pós-textuais' },
  ];

  return (
    <aside className="h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 select-none">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <h2 className="text-xs font-display font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Estrutura do Trabalho
        </h2>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAddMenu((v) => !v)}
            className="px-2.5 py-1 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Seção</span>
          </button>

          {showAddMenu && (
            <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1.5 z-40">
              {ADDABLE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => addSection(preset)}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                >
                  <span>{preset.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
        {parts.map((partGroup) => {
          const items = doc.sections
            .map((sec, globalIndex) => ({ sec, globalIndex }))
            .filter(({ sec }) => sec.part === partGroup.key);

          if (items.length === 0) return null;

          return (
            <div key={partGroup.key} className="space-y-1">
              <div className="px-2 pb-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                {partGroup.label}
              </div>

              {items.map(({ sec, globalIndex }) => {
                const isActive = sec.id === activeSectionId;
                const num = sectionNumbers[sec.id];
                const { words } = countWordsAndChars(sec.content);
                const indentPx = sec.part === 'textual' ? (sec.level - 1) * 12 : 0;

                return (
                  <div
                    key={sec.id}
                    style={{ paddingLeft: `${indentPx}px` }}
                    className={`group rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-950 dark:text-white'
                        : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    } ${!sec.enabled ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-1.5 px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectSection(sec.id)}
                        className="flex-1 min-w-0 text-left flex items-center gap-1.5 cursor-pointer"
                      >
                        {num && (
                          <span className="text-[11px] font-mono font-semibold text-blue-900 dark:text-blue-400 tabular-nums shrink-0">
                            {num}
                          </span>
                        )}
                        {renamingId === sec.id ? (
                          <input
                            type="text"
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => commitRename(sec.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename(sec.id);
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-1.5 py-0.5 text-xs bg-white dark:bg-slate-950 border border-blue-800 rounded"
                          />
                        ) : (
                          <span className="text-xs font-medium truncate">{sec.title}</span>
                        )}
                      </button>

                      {sec.part === 'textual' && sec.enabled && (
                        <span className="text-[10px] font-mono text-slate-400 tabular-nums shrink-0 group-hover:hidden">
                          {words}p
                        </span>
                      )}

                      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveSection(globalIndex, -1)}
                          title="Mover para cima"
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSection(globalIndex, 1)}
                          title="Mover para baixo"
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        {sec.part === 'textual' && (
                          <>
                            <button
                              type="button"
                              onClick={() => changeLevel(sec.id, -1)}
                              title="Promover nível"
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                            >
                              <Outdent className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => changeLevel(sec.id, 1)}
                              title="Recuar como subseção"
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                            >
                              <Indent className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(sec.id);
                            setRenameValue(sec.title);
                          }}
                          title="Renomear seção"
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleEnabled(sec.id)}
                          title={sec.enabled ? 'Ocultar do trabalho' : 'Incluir no trabalho'}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                        >
                          {sec.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>
                        {!sec.locked && (
                          <button
                            type="button"
                            onClick={() => removeSection(sec)}
                            title="Remover seção"
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950 text-slate-500 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
