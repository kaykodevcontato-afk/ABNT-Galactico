import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { DOCUMENT_TYPE_SPECS, INSTITUTIONAL_PROFILES } from '../abnt/standards';
import { DocumentTypeId, FontFamilyOption, InstitutionalProfile } from '../abnt/types';

interface CreateDocumentModalProps {
  initialType?: DocumentTypeId;
  profiles: InstitutionalProfile[];
  onClose: () => void;
  onCreate: (payload: {
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
  }) => void;
}

export const CreateDocumentModal: React.FC<CreateDocumentModalProps> = ({
  initialType,
  profiles,
  onClose,
  onCreate,
}) => {
  const [step, setStep] = useState<1 | 2>(initialType ? 2 : 1);
  const [selectedType, setSelectedType] = useState<DocumentTypeId>(initialType || 'tcc');

  const [institution, setInstitution] = useState('');
  const [course, setCourse] = useState('');
  const [author, setAuthor] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [advisor, setAdvisor] = useState('');
  const [city, setCity] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [profileId, setProfileId] = useState(profiles[0]?.id || INSTITUTIONAL_PROFILES[0].id);
  const [fontFamily, setFontFamily] = useState<FontFamilyOption>('Times New Roman');
  const [errorMsg, setErrorMsg] = useState('');

  const spec = DOCUMENT_TYPE_SPECS[selectedType];

  const handleProfileChange = (id: string) => {
    setProfileId(id);
    const prof = profiles.find((p) => p.id === id);
    if (prof) setFontFamily(prof.defaultFont);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Informe o título do trabalho para continuar.');
      return;
    }
    if (!author.trim()) {
      setErrorMsg('Informe o nome completo do aluno ou autor.');
      return;
    }
    setErrorMsg('');
    onCreate({
      type: selectedType,
      institution: institution.trim() || 'Instituição de Ensino',
      course: course.trim() || 'Curso / Disciplina',
      author: author.trim(),
      title: title.trim(),
      subtitle: subtitle.trim(),
      advisor: advisor.trim(),
      city: city.trim() || 'Cidade',
      year: year.trim() || String(new Date().getFullYear()),
      fontFamily,
      profileId,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Passo {step} de 2 · {step === 1 ? 'Escolha o tipo de documento' : `Configuração inicial — ${spec.name}`}
            </p>
            <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white">
              Criar novo trabalho ABNT
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

        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Selecione a modalidade do trabalho. O editor carregará automaticamente apenas a estrutura e as regras ABNT aplicáveis a este tipo:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.values(DOCUMENT_TYPE_SPECS).map((item) => {
                  const isSelected = item.id === selectedType;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedType(item.id)}
                      className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-blue-900 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-display font-semibold text-slate-900 dark:text-white">
                          {item.name}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-blue-900 dark:text-blue-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-blue-900 dark:text-blue-400 mb-1.5">{item.governingStandard}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.shortDescription}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <form id="create-doc-form" onSubmit={handleSubmit} className="space-y-5">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nome da Instituição
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Ex.: Universidade de São Paulo"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Curso / Programa / Disciplina
                  </label>
                  <input
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="Ex.: Engenharia de Software"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Aluno / Autor *
                  </label>
                  <input
                    type="text"
                    required
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Orientador(a) (opcional)
                  </label>
                  <input
                    type="text"
                    value={advisor}
                    onChange={(e) => setAdvisor(e.target.value)}
                    placeholder="Ex.: Prof. Dr. Carlos Eduardo Lima"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Título do Trabalho *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título principal"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Subtítulo (opcional)
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Subtítulo explicativo"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex.: Belo Horizonte"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Ano
                  </label>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="2026"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fonte ABNT
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value as FontFamilyOption)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
                  >
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Arial">Arial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Perfil de Regras Institucionais
                </label>
                <select
                  value={profileId}
                  onChange={(e) => handleProfileChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-800"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.description}
                    </option>
                  ))}
                </select>
              </div>
            </form>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar aos modelos</span>
            </button>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Selecionado: <strong className="text-slate-800 dark:text-slate-200">{spec.name}</strong>
            </span>
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg flex items-center gap-2 cursor-pointer"
            >
              <span>Avançar para dados do trabalho</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              form="create-doc-form"
              className="px-5 py-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Criar e abrir editor</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
