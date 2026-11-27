import React, { useMemo } from 'react';
import { AlertCircle, CheckCircle2, HelpCircle, Wrench, X } from 'lucide-react';
import { analyzeAbntCompliance } from '../abnt/compliance';
import { AbntDocument, ComplianceCheckItem } from '../abnt/types';

interface ComplianceModalProps {
  doc: AbntDocument;
  onApplyAutoFix: (fixKey: NonNullable<ComplianceCheckItem['autoFixKey']>) => void;
  onJumpToSection: (sectionId: string) => void;
  onClose: () => void;
}

export const ComplianceModal: React.FC<ComplianceModalProps> = ({
  doc,
  onApplyAutoFix,
  onJumpToSection,
  onClose,
}) => {
  const report = useMemo(() => analyzeAbntCompliance(doc), [doc]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verificador de Conformidade ABNT · {report.documentType}
            </p>
            <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white">
              Relatório: Verificar meu trabalho
            </h2>
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
          {/* Honest Summary Banner */}
          <div
            className={`p-4 rounded-xl border ${
              report.isFullyCompliant
                ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900'
                : 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900'
            }`}
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {report.isFullyCompliant
                ? 'Todos os critérios automáticos verificados para esta modalidade estão conformes.'
                : 'Foram identificados pontos que exigem ajuste ou preenchimento antes da entrega final.'}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <strong>{report.okCount}</strong> corretos
              </span>
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <strong>{report.warningCount}</strong> precisam de ajuste
              </span>
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-red-600" />
                <strong>{report.missingCount}</strong> não identificados / ausentes
              </span>
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-3">
            {report.items.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {item.status === 'ok' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    ) : item.status === 'warning' ? (
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.category}</p>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{item.label}</h3>
                    </div>
                  </div>
                  <span className="text-xs font-medium shrink-0 text-slate-600 dark:text-slate-300">
                    {item.status === 'ok' ? 'Conforme' : item.status === 'warning' ? 'Ajustar' : 'Ausente'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-6">{item.detail}</p>

                {(item.suggestion || item.autoFixKey || item.sectionId) && (
                  <div className="pl-6 pt-1 flex flex-wrap items-center justify-between gap-2">
                    {item.suggestion && (
                      <p className="text-xs text-blue-900 dark:text-blue-400">
                        Sugestão: {item.suggestion}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      {item.sectionId && (
                        <button
                          type="button"
                          onClick={() => {
                            onJumpToSection(item.sectionId!);
                            onClose();
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Ir para seção
                        </button>
                      )}
                      {item.autoFixKey && (
                        <button
                          type="button"
                          onClick={() => onApplyAutoFix(item.autoFixKey!)}
                          className="px-3 py-1 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md flex items-center gap-1.5 cursor-pointer"
                        >
                          <Wrench className="w-3 h-3" />
                          <span>Corrigir automaticamente</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg cursor-pointer"
          >
            Fechar relatório
          </button>
        </div>
      </div>
    </div>
  );
};
