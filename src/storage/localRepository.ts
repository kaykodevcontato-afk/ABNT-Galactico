import {
  CURRENT_STANDARDS_VERSION,
  DEFAULT_ABNT_STANDARDS,
  DOCUMENT_TYPE_SPECS,
  INSTITUTIONAL_PROFILES,
  createDefaultFormatting,
} from '../abnt/standards';
import {
  AbntDocument,
  AbntFormattingConfig,
  AbntStandardRule,
  DocumentMetadata,
  DocumentTypeId,
  InstitutionalProfile,
} from '../abnt/types';
import { DocumentRepository } from './types';

const DOCS_KEY = 'abnt_smart_editor_docs_v1';
const RECOVERY_KEY = 'abnt_smart_editor_recovery_v1';
const STANDARDS_KEY = 'abnt_smart_editor_standards_v1';
const PROFILES_KEY = 'abnt_smart_editor_profiles_v1';
const SEEDED_KEY = 'abnt_smart_editor_seeded_v1';

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createDocumentFromTemplate(
  type: DocumentTypeId,
  partialMeta: Partial<DocumentMetadata> = {},
  formattingOverrides: Partial<AbntFormattingConfig> = {}
): AbntDocument {
  const spec = DOCUMENT_TYPE_SPECS[type];
  const yearNow = String(new Date().getFullYear());
  const baseMeta: DocumentMetadata = {
    institution: partialMeta.institution ?? 'Universidade Federal Exemplo',
    department: partialMeta.department ?? '',
    course: partialMeta.course ?? 'Ciência da Computação',
    author: partialMeta.author ?? 'Nome Completo do Autor',
    title: partialMeta.title ?? `Novo ${spec.name}`,
    subtitle: partialMeta.subtitle ?? '',
    advisor: partialMeta.advisor ?? 'Prof. Dr. Orientador(a)',
    coAdvisor: partialMeta.coAdvisor ?? '',
    natureNote: '',
    city: partialMeta.city ?? 'São Paulo',
    year: partialMeta.year ?? yearNow,
    approvalDate: partialMeta.approvalDate ?? `${yearNow}`,
    bancaMembers: partialMeta.bancaMembers ?? ['Prof. Dr. Membro Titular 1', 'Prof. Dr. Membro Titular 2'],
    reviewedWorkRef: partialMeta.reviewedWorkRef ?? '',
    authorCredentials: partialMeta.authorCredentials ?? '',
  };

  baseMeta.natureNote = partialMeta.natureNote?.trim()
    ? partialMeta.natureNote
    : spec.recommendedNatureTemplate(baseMeta);

  const defaultFmt = createDefaultFormatting(formattingOverrides.institutionalProfileId || 'abnt_padrao', type);

  return {
    id: uid('doc'),
    type,
    metadata: baseMeta,
    formatting: {
      ...defaultFmt,
      ...formattingOverrides,
      startPageNumberOnFirstTextual: spec.startPageNumberOnFirstTextual,
    },
    sections: spec.defaultSections.map((s) => ({
      ...s,
      id: uid('sec'),
    })),
    references: [],
    footnotes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    standardsSnapshotVersion: CURRENT_STANDARDS_VERSION,
  };
}

function createInitialSampleDocument(): AbntDocument {
  const doc = createDocumentFromTemplate('tcc', {
    institution: 'Universidade Estadual Paulista',
    course: 'Sistemas de Informação',
    author: 'Mariana Costa Ferreira',
    title: 'Ambientes Digitais de Aprendizagem e Acessibilidade no Ensino Superior',
    subtitle: 'Uma análise baseada em diretrizes pedagógicas e usabilidade',
    advisor: 'Prof. Dr. Ricardo Almeida Nogueira',
    city: 'Campinas',
    year: '2026',
  });

  doc.references = [
    {
      id: uid('ref'),
      type: 'livro',
      authors: 'GIL, Antonio Carlos',
      title: 'Como elaborar projetos de pesquisa',
      edition: '7. ed.',
      city: 'São Paulo',
      publisher: 'Atlas',
      year: '2022',
      pages: '192',
    },
    {
      id: uid('ref'),
      type: 'artigo',
      authors: 'MORAN, José Manuel',
      title: 'Metodologias ativas e modelos híbridos na educação superior',
      journalName: 'Revista Brasileira de Educação Digital',
      city: 'Curitiba',
      volume: '14',
      issue: '2',
      pages: '45-62',
      year: '2024',
    },
  ];

  const intro = doc.sections.find((s) => s.kind === 'introducao');
  if (intro) {
    intro.content =
      '<p>A transformação digital no ensino superior brasileiro intensificou a adoção de ambientes virtuais de aprendizagem como extensão estratégica das salas de aula presenciais. Segundo a literatura contemporânea, o desenho pedagógico desses ambientes determina diretamente o engajamento e a permanência estudantil (Moran, 2024).</p><p>Apesar dos avanços tecnológicos recentes, diversas plataformas institucionais ainda apresentam barreiras de usabilidade e acessibilidade que dificultam a autonomia acadêmica dos estudantes.</p><blockquote><p>O planejamento metodológico rigoroso permite transformar ferramentas digitais em instrumentos efetivos de inclusão e produção científica colaborativa no contexto universitário (Gil, 2022, p. 38).</p></blockquote>';
  }

  const refTeorico = doc.sections.find((s) => s.kind === 'desenvolvimento');
  if (refTeorico) {
    refTeorico.content =
      '<p>Os ambientes virtuais de aprendizagem evoluíram de meros repositórios de arquivos para ecossistemas interativos. Para que essa mediação ocorra com qualidade, torna-se indispensável alinhar requisitos técnicos de interface às práticas docentes.</p><p>Em pesquisas exploratórias, a triangulação entre avaliação heurística e entrevistas semiestruturadas fornece evidências consistentes sobre gargalos de navegação e legibilidade (Gil, 2022).</p>';
  }

  return doc;
}

class LocalDocumentRepository implements DocumentRepository {
  private ensureSeeded(): AbntDocument[] {
    const raw = localStorage.getItem(DOCS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AbntDocument[];
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Fallback below
      }
    }
    if (!localStorage.getItem(SEEDED_KEY)) {
      const sample = createInitialSampleDocument();
      localStorage.setItem(DOCS_KEY, JSON.stringify([sample]));
      localStorage.setItem(SEEDED_KEY, '1');
      return [sample];
    }
    return [];
  }

  async listDocuments(): Promise<AbntDocument[]> {
    const docs = this.ensureSeeded();
    return [...docs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async getDocument(id: string): Promise<AbntDocument | null> {
    const docs = this.ensureSeeded();
    return docs.find((d) => d.id === id) || null;
  }

  async saveDocument(doc: AbntDocument): Promise<AbntDocument> {
    const docs = this.ensureSeeded();
    const updated: AbntDocument = {
      ...doc,
      updatedAt: new Date().toISOString(),
    };
    const idx = docs.findIndex((d) => d.id === updated.id);
    if (idx >= 0) {
      docs[idx] = updated;
    } else {
      docs.unshift(updated);
    }
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
    return updated;
  }

  async deleteDocument(id: string): Promise<void> {
    const docs = this.ensureSeeded().filter((d) => d.id !== id);
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  }

  async exportAllBackup(): Promise<string> {
    const docs = await this.listDocuments();
    return JSON.stringify(
      {
        app: 'ABNT GALÁCTICO',
        exportedAt: new Date().toISOString(),
        version: 1,
        documents: docs,
      },
      null,
      2
    );
  }

  async importBackup(jsonContent: string): Promise<AbntDocument[]> {
    const parsed = JSON.parse(jsonContent);
    const incoming: AbntDocument[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.documents)
        ? parsed.documents
        : parsed.document
          ? [parsed.document]
          : parsed.id && parsed.sections
            ? [parsed]
            : [];

    if (incoming.length === 0) {
      throw new Error('Arquivo inválido: nenhum documento ABNT reconhecido.');
    }

    const existing = this.ensureSeeded();
    const merged = [...existing];
    for (const item of incoming) {
      const idx = merged.findIndex((d) => d.id === item.id);
      if (idx >= 0) {
        merged[idx] = item;
      } else {
        merged.unshift(item);
      }
    }
    localStorage.setItem(DOCS_KEY, JSON.stringify(merged));
    return merged;
  }

  async getStandardsCatalog(): Promise<AbntStandardRule[]> {
    const raw = localStorage.getItem(STANDARDS_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as AbntStandardRule[];
      } catch {
        // default
      }
    }
    return DEFAULT_ABNT_STANDARDS;
  }

  async saveStandardsCatalog(rules: AbntStandardRule[]): Promise<void> {
    localStorage.setItem(STANDARDS_KEY, JSON.stringify(rules));
  }

  async getInstitutionalProfiles(): Promise<InstitutionalProfile[]> {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as InstitutionalProfile[];
      } catch {
        // default
      }
    }
    return INSTITUTIONAL_PROFILES;
  }

  async saveInstitutionalProfiles(profiles: InstitutionalProfile[]): Promise<void> {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  }
}

export const documentRepository = new LocalDocumentRepository();

export function saveRecoverySnapshot(doc: AbntDocument): void {
  try {
    localStorage.setItem(RECOVERY_KEY, JSON.stringify({ savedAt: new Date().toISOString(), doc }));
  } catch {
    // Ignore quota overflow silently
  }
}

export function getRecoverySnapshot(): { savedAt: string; doc: AbntDocument } | null {
  try {
    const raw = localStorage.getItem(RECOVERY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.doc?.id && Array.isArray(parsed?.doc?.sections)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearRecoverySnapshot(): void {
  localStorage.removeItem(RECOVERY_KEY);
}
