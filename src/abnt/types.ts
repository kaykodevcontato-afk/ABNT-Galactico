export type DocumentTypeId =
  | 'trabalho_escolar'
  | 'trabalho_academico'
  | 'tcc'
  | 'monografia'
  | 'artigo_cientifico'
  | 'projeto_pesquisa'
  | 'relatorio_tecnico'
  | 'resenha_critica'
  | 'relatorio_estagio'
  | 'dissertacao'
  | 'tese'
  | 'personalizado';

export type SectionPart = 'pre_textual' | 'textual' | 'post_textual';

export type SectionKind =
  | 'capa'
  | 'folha_rosto'
  | 'folha_aprovacao'
  | 'dedicatoria'
  | 'agradecimentos'
  | 'epigrafe'
  | 'resumo'
  | 'abstract'
  | 'lista_ilustracoes'
  | 'lista_tabelas'
  | 'sumario'
  | 'introducao'
  | 'desenvolvimento'
  | 'metodologia'
  | 'resultados'
  | 'discussao'
  | 'conclusao'
  | 'referencias'
  | 'apendice'
  | 'anexo'
  | 'custom_textual'
  | 'custom_pre'
  | 'custom_post';

export interface DocumentSection {
  id: string;
  kind: SectionKind;
  part: SectionPart;
  title: string;
  level: 1 | 2 | 3; // 1 = Seção primária, 2 = Secundária, 3 = Terciária
  content: string; // Rich HTML from Tiptap
  keywords?: string; // Used for Resumo / Abstract Palavras-chave / Keywords
  epigraphAuthor?: string; // Used for Epígrafe
  enabled: boolean;
  locked?: boolean;
}

export interface DocumentMetadata {
  institution: string;
  department: string;
  course: string;
  author: string;
  title: string;
  subtitle: string;
  advisor: string;
  coAdvisor?: string;
  natureNote: string;
  city: string;
  year: string;
  approvalDate?: string;
  bancaMembers?: string[];
  reviewedWorkRef?: string; // For Resenha Crítica
  authorCredentials?: string; // For Artigo Científico / Resenha
}

export type FontFamilyOption = 'Times New Roman' | 'Arial';

export interface AbntMarginsCm {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

export interface AbntFormattingConfig {
  fontFamily: FontFamilyOption;
  bodyFontSizePt: number;
  quoteFontSizePt: number;
  lineSpacing: number;
  paragraphIndentCm: number;
  quoteIndentCm: number;
  marginsCm: AbntMarginsCm;
  justifyBody: boolean;
  uppercaseInTextParentheses: boolean; // NBR 10520:2023 uses Sentence case; institutional overrides may allow uppercase
  pageNumberPosition: 'top-right' | 'bottom-right';
  startPageNumberOnFirstTextual: boolean; // False for artigo científico (starts p.1)
  institutionalProfileId: string;
  standardsVersionId: string;
}

export type ReferenceType =
  | 'livro'
  | 'artigo'
  | 'site'
  | 'documento_oficial'
  | 'legislacao'
  | 'tese_dissertacao'
  | 'trabalho_academico'
  | 'documento_digital';

export interface BibliographicReference {
  id: string;
  type: ReferenceType;
  authors: string; // Ex: "SILVA, João Pedro; SOUZA, Maria"
  title: string;
  subtitle?: string;
  edition?: string;
  city?: string;
  publisher?: string;
  year: string;
  pages?: string;
  // Artigo
  journalName?: string;
  volume?: string;
  issue?: string;
  month?: string;
  // Site / Digital
  url?: string;
  accessDate?: string;
  doi?: string;
  // Tese / Trabalho acadêmico
  degree?: string;
  institution?: string;
  // Legislação / Oficial
  jurisdiction?: string;
  lawNumber?: string;
  lawDate?: string;
  publicationOrgan?: string;
}

export type CitationKind =
  | 'direta_curta'
  | 'direta_longa'
  | 'indireta'
  | 'apud';

export interface DocumentFootnote {
  id: string;
  number: number;
  text: string;
  sectionId: string;
}

export interface AbntDocument {
  id: string;
  type: DocumentTypeId;
  metadata: DocumentMetadata;
  formatting: AbntFormattingConfig;
  sections: DocumentSection[];
  references: BibliographicReference[];
  footnotes: DocumentFootnote[];
  createdAt: string;
  updatedAt: string;
  standardsSnapshotVersion: string;
}

export interface AbntStandardRule {
  id: string;
  code: string; // e.g., "ABNT NBR 14724"
  title: string;
  edition: string;
  effectiveDate: string;
  status: 'vigente' | 'atualizada' | 'revisao_disponivel';
  summary: string;
  relatedRules: string[];
  changelog: { date: string; note: string }[];
}

export interface InstitutionalProfile {
  id: string;
  name: string;
  description: string;
  marginsCm: AbntMarginsCm;
  defaultFont: FontFamilyOption;
  paragraphIndentCm: number;
  uppercaseInTextParentheses: boolean;
  includeFolhaAprovacao: boolean;
}

export interface DocumentTypeSpec {
  id: DocumentTypeId;
  name: string;
  shortDescription: string;
  governingStandard: string;
  hasCover: boolean;
  hasFolhaRosto: boolean;
  hasSumario: boolean;
  startPageNumberOnFirstTextual: boolean;
  mandatoryKinds: SectionKind[];
  recommendedNatureTemplate: (meta: DocumentMetadata) => string;
  defaultSections: Omit<DocumentSection, 'id'>[];
}

export interface ComplianceCheckItem {
  id: string;
  category:
    | 'Estrutura'
    | 'Margens e Papel'
    | 'Tipografia e Espaçamento'
    | 'Numeração e Sumário'
    | 'Citações e Referências'
    | 'Paginação';
  label: string;
  status: 'ok' | 'warning' | 'missing';
  detail: string;
  suggestion?: string;
  sectionId?: string;
  autoFixKey?:
    | 'apply_abnt_margins'
    | 'apply_abnt_typography'
    | 'sort_references'
    | 'enable_sumario'
    | 'enable_capa';
}

export interface ComplianceReport {
  documentType: string;
  analyzedAt: string;
  isFullyCompliant: boolean;
  okCount: number;
  warningCount: number;
  missingCount: number;
  items: ComplianceCheckItem[];
}

export interface PaginatedElement {
  id: string;
  kind:
    | 'heading'
    | 'unnumbered_heading'
    | 'paragraph'
    | 'long_quote'
    | 'list_item'
    | 'image'
    | 'table'
    | 'equation'
    | 'toc_row'
    | 'list_row'
    | 'reference_item'
    | 'keywords'
    | 'epigraph_block'
    | 'cover_block'
    | 'approval_block'
    | 'reviewed_work_header';
  text?: string;
  html?: string;
  level?: 1 | 2 | 3;
  numberPrefix?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  indentFirstLine?: boolean;
  src?: string;
  caption?: string;
  sourceNote?: string;
  rows?: string[][];
  hasHeaderRow?: boolean;
  pageRef?: number | string;
  heightMm: number;
  sectionId?: string;
  footnoteRefs?: { number: number; text: string }[];
}

export interface A4Page {
  pageIndex: number; // 0-based physical sheet index
  logicalPageNumber: number; // NBR 14724 logical count (1 = Folha de Rosto, or 1 = first page for artigo)
  displayPageNumber: number | null; // Null when unnumbered (capa, pre-textual), number when visible
  part: SectionPart | 'cover';
  sectionTitle: string;
  sectionId?: string;
  elements: PaginatedElement[];
  footnotes: { number: number; text: string }[];
}

export interface TocEntry {
  sectionId: string;
  numberPrefix: string;
  title: string;
  level: 1 | 2 | 3;
  pageNumber: number;
  isPostTextual?: boolean;
}

export interface MediaIndexEntry {
  index: number;
  caption: string;
  pageNumber: number;
  kind: 'illustration' | 'table';
}

export interface PaginatedDocumentResult {
  pages: A4Page[];
  toc: TocEntry[];
  illustrations: MediaIndexEntry[];
  tables: MediaIndexEntry[];
  totalPhysicalPages: number;
}
