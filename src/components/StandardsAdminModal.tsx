import React, { useState } from 'react';
import { Building2, Check, History, Plus, Scale, X } from 'lucide-react';
import { AbntDocument, AbntStandardRule, FontFamilyOption, InstitutionalProfile } from '../abnt/types';
import { uid } from '../storage/localRepository';

interface StandardsAdminModalProps {
  standards: AbntStandardRule[];
  profiles: InstitutionalProfile[];
  currentDoc: AbntDocument | null;
  onUpdateStandards: (updated: AbntStandardRule[]) => void;
  onUpdateProfiles: (updated: InstitutionalProfile[]) => void;
  onApplyProfileToDoc?: (profile: InstitutionalProfile) => void;
  onClose: () => void;
}

export const StandardsAdminModal: React.FC<StandardsAdminModalProps> = ({
  standards,
  profiles,
  currentDoc,
  onUpdateStandards,
  onUpdateProfiles,
  onApplyProfileToDoc,
  onClose,
}) => {
  const [tab, setTab] = useState<'standards' | 'institutions'>('standards');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editEdition, setEditEdition] = useState('');
  const [editEffectiveDate, setEditEffectiveDate] = useState('');
  const [editChangeNote, setEditChangeNote] = useState('');

  // New institutional profile
  const [newInstName, setNewInstName] = useState('');
  const [newInstDesc, setNewInstDesc] = useState('');
  const [newInstFont, setNewInstFont] = useState<FontFamilyOption>('Times New Roman');
  const [newInstTop, setNewInstTop] = useState(3);
  const [newInstLeft, setNewInstLeft] = useState(3);
  const [newInstBottom, setNewInstBottom] = useState(2);
  const [newInstRight, setNewInstRight] = useState(2);
  const [newInstUppercaseCite, setNewInstUppercaseCite] = useState(false);

  const startEditRule = (rule: AbntStandardRule) => {
    setEditingRuleId(rule.id);
    setEditEdition(rule.edition);
    setEditEffectiveDate(rule.effectiveDate);
    setEditChangeNote('');
  };

  const saveRuleUpdate = (ruleId: string) => {
    const updated = standards.map((r) => {
      if (r.id !== ruleId) return r;
      const newLog = editChangeNote.trim()
        ? [{ date: editEffectiveDate || new Date().toISOString().slice(0, 10), note: editChangeNote.trim() }, ...r.changelog]
        : r.changelog;
      return {
        ...r,
        edition: editEdition.trim() || r.edition,
        effectiveDate: editEffectiveDate || r.effectiveDate,
        status: 'atualizada' as const,
        changelog: newLog,
      };
    });
    onUpdateStandards(updated);
    setEditingRuleId(null);
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstName.trim()) return;
    const created: InstitutionalProfile = {
      id: uid('inst'),
      name: newInstName.trim(),
      description: newInstDesc.trim() || 'Perfil personalizado de exigências institucionais.',
      marginsCm: { top: newInstTop, left: newInstLeft, bottom: newInstBottom, right: newInstRight },
      defaultFont: newInstFont,
      paragraphIndentCm: 1.25,
      uppercaseInTextParentheses: newInstUppercaseCite,
      includeFolhaAprovacao: true,
    };
    onUpdateProfiles([...profiles, created]);
    setNewInstName('');
    setNewInstDesc('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-900 dark:text-blue-400" />
              <span>Painel Administrativo de Normas ABNT</span>
            </h2>
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setTab('standards')}
                className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                  tab === 'standards'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Normas Vigentes ({standards.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('institutions')}
                className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                  tab === 'institutions'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Instituições de Ensino ({profiles.length})
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

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {tab === 'standards' ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Atualizações no catálogo preservam os documentos já criados na versão original, permitindo aplicar uma nova edição somente quando o autor desejar.
              </p>
              {standards.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {rule.edition} · Vigência: {rule.effectiveDate} · Status:{' '}
                        <span className="font-medium text-blue-900 dark:text-blue-400">
                          {rule.status === 'vigente'
                            ? 'Vigente'
                            : rule.status === 'atualizada'
                              ? 'Atualizada'
                              : 'Revisão disponível'}
                        </span>
                      </div>
                      <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white mt-0.5">
                        {rule.code} — {rule.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => startEditRule(rule)}
                      className="px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
                    >
                      Atualizar versão
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{rule.summary}</p>

                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    {rule.relatedRules.map((rr, idx) => (
                      <p key={idx}>• {rr}</p>
                    ))}
                  </div>

                  {rule.changelog.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
                      <p className="font-medium flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <History className="w-3 h-3" />
                        <span>Histórico de alterações</span>
                      </p>
                      {rule.changelog.map((c, idx) => (
                        <p key={idx} className="tabular-nums">
                          {c.date} — {c.note}
                        </p>
                      ))}
                    </div>
                  )}

                  {editingRuleId === rule.id && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={editEdition}
                        onChange={(e) => setEditEdition(e.target.value)}
                        placeholder="Nova edição"
                        className="px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <input
                        type="date"
                        value={editEffectiveDate}
                        onChange={(e) => setEditEffectiveDate(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <input
                        type="text"
                        value={editChangeNote}
                        onChange={(e) => setEditChangeNote(e.target.value)}
                        placeholder="Resumo da alteração..."
                        className="px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <div className="sm:col-span-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingRuleId(null)}
                          className="px-3 py-1 text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => saveRuleUpdate(rule.id)}
                          className="px-3 py-1 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md cursor-pointer"
                        >
                          Registrar atualização
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profiles.map((prof) => {
                  const isActiveOnDoc = currentDoc?.formatting.institutionalProfileId === prof.id;
                  return (
                    <div
                      key={prof.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                            <span>{prof.name}</span>
                          </h3>
                          {isActiveOnDoc && (
                            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              Ativo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{prof.description}</p>
                        <p className="text-[11px] text-slate-500 tabular-nums">
                          Fonte: {prof.defaultFont} · Margens: {prof.marginsCm.top}/{prof.marginsCm.left}/
                          {prof.marginsCm.bottom}/{prof.marginsCm.right} cm · Citações:{' '}
                          {prof.uppercaseInTextParentheses ? 'CAIXA ALTA' : 'Caixa mista (NBR 10520:2023)'}
                        </p>
                      </div>

                      {onApplyProfileToDoc && currentDoc && (
                        <button
                          type="button"
                          onClick={() => onApplyProfileToDoc(prof)}
                          className="self-start px-3 py-1.5 text-xs font-medium text-blue-900 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md cursor-pointer"
                        >
                          Aplicar ao documento atual
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Create Custom Institutional Profile */}
              <form
                onSubmit={handleCreateProfile}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-4"
              >
                <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                  Cadastrar perfil personalizado de instituição
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={newInstName}
                    onChange={(e) => setNewInstName(e.target.value)}
                    placeholder="Nome da instituição (ex.: Manual UFPR)"
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    value={newInstDesc}
                    onChange={(e) => setNewInstDesc(e.target.value)}
                    placeholder="Observações / particularidades"
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Fonte</label>
                    <select
                      value={newInstFont}
                      onChange={(e) => setNewInstFont(e.target.value as FontFamilyOption)}
                      className="w-full px-2 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Arial">Arial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Sup (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newInstTop}
                      onChange={(e) => setNewInstTop(Number(e.target.value) || 3)}
                      className="w-full px-2 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Esq (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newInstLeft}
                      onChange={(e) => setNewInstLeft(Number(e.target.value) || 3)}
                      className="w-full px-2 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Inf (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newInstBottom}
                      onChange={(e) => setNewInstBottom(Number(e.target.value) || 2)}
                      className="w-full px-2 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Dir (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newInstRight}
                      onChange={(e) => setNewInstRight(Number(e.target.value) || 2)}
                      className="w-full px-2 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 tabular-nums"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 pb-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newInstUppercaseCite}
                      onChange={(e) => setNewInstUppercaseCite(e.target.checked)}
                    />
                    <span>Autor CAIXA ALTA</span>
                  </label>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Salvar perfil institucional</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
