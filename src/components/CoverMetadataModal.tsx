import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import { DOCUMENT_TYPE_SPECS } from '../abnt/standards';
import { AbntDocument, FontFamilyOption } from '../abnt/types';

interface CoverMetadataFormProps {
  doc: AbntDocument;
  onChangeDoc: (updated: AbntDocument) => void;
}

export const CoverMetadataForm: React.FC<CoverMetadataFormProps> = ({ doc, onChangeDoc }) => {
  const spec = DOCUMENT_TYPE_SPECS[doc.type];
  const meta = doc.metadata;
  const fmt = doc.formatting;

  const updateMeta = (patch: Partial<typeof meta>) => {
    onChangeDoc({
      ...doc,
      metadata: { ...meta, ...patch },
    });
  };

  const updateFmt = (patch: Partial<typeof fmt>) => {
    onChangeDoc({
      ...doc,
      formatting: { ...fmt, ...patch },
    });
  };

  const regenerateNature = () => {
    updateMeta({ natureNote: spec.recommendedNatureTemplate(meta) });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Nome da Instituição
          </label>
          <input
            type="text"
            value={meta.institution}
            onChange={(e) => updateMeta({ institution: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Nome do Curso / Programa
          </label>
          <input
            type="text"
            value={meta.course}
            onChange={(e) => updateMeta({ course: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Nome do Aluno / Autor
          </label>
          <input
            type="text"
            value={meta.author}
            onChange={(e) => updateMeta({ author: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Orientador(a)
          </label>
          <input
            type="text"
            value={meta.advisor}
            onChange={(e) => updateMeta({ advisor: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Título do Trabalho
          </label>
          <input
            type="text"
            value={meta.title}
            onChange={(e) => updateMeta({ title: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Subtítulo
          </label>
          <input
            type="text"
            value={meta.subtitle}
            onChange={(e) => updateMeta({ subtitle: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Cidade
          </label>
          <input
            type="text"
            value={meta.city}
            onChange={(e) => updateMeta({ city: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Ano
          </label>
          <input
            type="text"
            value={meta.year}
            onChange={(e) => updateMeta({ year: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800 tabular-nums"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Fonte do Documento
          </label>
          <select
            value={fmt.fontFamily}
            onChange={(e) => updateFmt({ fontFamily: e.target.value as FontFamilyOption })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
          >
            <option value="Times New Roman">Times New Roman (12 pt)</option>
            <option value="Arial">Arial (12 pt)</option>
          </select>
        </div>
      </div>

      {spec.hasFolhaRosto && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Nota de Natureza do Trabalho (Folha de Rosto / Aprovação)
            </label>
            <button
              type="button"
              onClick={regenerateNature}
              className="text-xs text-blue-900 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Gerar texto padrão</span>
            </button>
          </div>
          <textarea
            rows={3}
            value={meta.natureNote}
            onChange={(e) => updateMeta({ natureNote: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
          />
        </div>
      )}

      {doc.type === 'resenha_critica' && (
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Referência Bibliográfica da Obra Resenhada
          </label>
          <textarea
            rows={2}
            value={meta.reviewedWorkRef || ''}
            onChange={(e) => updateMeta({ reviewedWorkRef: e.target.value })}
            placeholder="Ex.: ECO, Umberto. Como se faz uma tese. 27. ed. São Paulo: Perspectiva, 2020."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
          />
        </div>
      )}

      {doc.sections.some((s) => s.kind === 'folha_aprovacao' && s.enabled) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Data de Aprovação (Folha de Aprovação)
            </label>
            <input
              type="text"
              value={meta.approvalDate || ''}
              onChange={(e) => updateMeta({ approvalDate: e.target.value })}
              placeholder="Ex.: 12 de dezembro de 2026"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Membros da Banca (1 por linha)
            </label>
            <textarea
              rows={2}
              value={(meta.bancaMembers || []).join('\n')}
              onChange={(e) =>
                updateMeta({
                  bancaMembers: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean),
                })
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
            />
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
          Margens ABNT (cm) e Espaçamento
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Superior</label>
            <input
              type="number"
              step="0.5"
              value={fmt.marginsCm.top}
              onChange={(e) => updateFmt({ marginsCm: { ...fmt.marginsCm, top: Number(e.target.value) || 3 } })}
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Esquerda</label>
            <input
              type="number"
              step="0.5"
              value={fmt.marginsCm.left}
              onChange={(e) => updateFmt({ marginsCm: { ...fmt.marginsCm, left: Number(e.target.value) || 3 } })}
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Inferior</label>
            <input
              type="number"
              step="0.5"
              value={fmt.marginsCm.bottom}
              onChange={(e) => updateFmt({ marginsCm: { ...fmt.marginsCm, bottom: Number(e.target.value) || 2 } })}
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Direita</label>
            <input
              type="number"
              step="0.5"
              value={fmt.marginsCm.right}
              onChange={(e) => updateFmt({ marginsCm: { ...fmt.marginsCm, right: Number(e.target.value) || 2 } })}
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Recuo 1ª linha</label>
            <input
              type="number"
              step="0.25"
              value={fmt.paragraphIndentCm}
              onChange={(e) => updateFmt({ paragraphIndentCm: Number(e.target.value) || 1.25 })}
              className="w-full px-2.5 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface CoverMetadataModalProps {
  doc: AbntDocument;
  onChangeDoc: (updated: AbntDocument) => void;
  onClose: () => void;
}

export const CoverMetadataModal: React.FC<CoverMetadataModalProps> = ({ doc, onChangeDoc, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white">
              Dados da Capa, Folha de Rosto e Formatação
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              As alterações atualizam automaticamente a Capa, Folha de Rosto e o Preview A4.
            </p>
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
          <CoverMetadataForm doc={doc} onChangeDoc={onChangeDoc} />
        </div>
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
