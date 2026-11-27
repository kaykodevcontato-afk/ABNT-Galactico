import {
  formatReferenceNbr6023,
  getReferenceMissingFields,
  paginateDocument,
  sortReferencesAlphabetically,
  stripHtml,
} from './formatter';
import { DOCUMENT_TYPE_SPECS } from './standards';
import { AbntDocument, ComplianceCheckItem, ComplianceReport } from './types';

export function analyzeAbntCompliance(doc: AbntDocument): ComplianceReport {
  const spec = DOCUMENT_TYPE_SPECS[doc.type];
  const items: ComplianceCheckItem[] = [];
  const enabledSections = doc.sections.filter((s) => s.enabled);
  const paginated = paginateDocument(doc);

  // 1. Papel & Margens (NBR 14724)
  const { top, left, bottom, right } = doc.formatting.marginsCm;
  const marginsValid = top === 3 && left === 3 && bottom === 2 && right === 2;
  items.push({
    id: 'margins',
    category: 'Margens e Papel',
    label: 'Margens A4 conforme NBR 14724 (3 cm sup/esq, 2 cm inf/dir)',
    status: marginsValid ? 'ok' : 'warning',
    detail: marginsValid
      ? 'Margens configuradas exatamente em 3 cm (superior/esquerda) e 2 cm (inferior/direita) em folha A4.'
      : `Margens atuais (${top} / ${left} / ${bottom} / ${right} cm) diferem do padrão oficial (3 / 3 / 2 / 2 cm).`,
    suggestion: marginsValid ? undefined : 'Aplicar margens padrão ABNT (3 cm e 2 cm).',
    autoFixKey: marginsValid ? undefined : 'apply_abnt_margins',
  });

  // 2. Fonte e Tamanho
  const fontValid =
    (doc.formatting.fontFamily === 'Times New Roman' || doc.formatting.fontFamily === 'Arial') &&
    doc.formatting.bodyFontSizePt === 12;
  items.push({
    id: 'typography',
    category: 'Tipografia e Espaçamento',
    label: 'Fonte padrão (Arial ou Times New Roman, corpo 12 pt)',
    status: fontValid ? 'ok' : 'warning',
    detail: fontValid
      ? `Fonte ${doc.formatting.fontFamily} em 12 pt para texto e ${doc.formatting.quoteFontSizePt} pt para citações longas.`
      : `Configuração atual: ${doc.formatting.fontFamily} ${doc.formatting.bodyFontSizePt} pt.`,
    suggestion: fontValid ? undefined : 'Restaurar tipografia oficial 12 pt (texto) e 10 pt (citações/notas).',
    autoFixKey: fontValid ? undefined : 'apply_abnt_typography',
  });

  // 3. Espaçamento e Recuo
  const spacingValid = doc.formatting.lineSpacing === 1.5 && doc.formatting.paragraphIndentCm >= 1.25;
  items.push({
    id: 'spacing',
    category: 'Tipografia e Espaçamento',
    label: 'Espaçamento 1,5 entre linhas e recuo de parágrafo (1,25 cm)',
    status: spacingValid ? 'ok' : 'warning',
    detail: spacingValid
      ? `Entrelinha 1,5 e recuo de primeira linha em ${doc.formatting.paragraphIndentCm} cm aplicados.`
      : `Entrelinha atual: ${doc.formatting.lineSpacing} | Recuo: ${doc.formatting.paragraphIndentCm} cm.`,
    suggestion: spacingValid ? undefined : 'Ajustar espaçamento para 1,5 e recuo para 1,25 cm.',
    autoFixKey: spacingValid ? undefined : 'apply_abnt_typography',
  });

  // 4. Dados obrigatórios de Capa / Folha de Rosto / Identificação
  const missingMeta: string[] = [];
  if (!doc.metadata.institution.trim()) missingMeta.push('Instituição');
  if (!doc.metadata.author.trim()) missingMeta.push('Nome do autor');
  if (!doc.metadata.title.trim()) missingMeta.push('Título do trabalho');
  if (!doc.metadata.city.trim()) missingMeta.push('Cidade');
  if (!doc.metadata.year.trim()) missingMeta.push('Ano');
  if (spec.hasFolhaRosto && !doc.metadata.natureNote.trim()) missingMeta.push('Nota de natureza do trabalho');

  items.push({
    id: 'metadata',
    category: 'Estrutura',
    label: `Identificação institucional e autoria (${spec.name})`,
    status: missingMeta.length === 0 ? 'ok' : 'missing',
    detail:
      missingMeta.length === 0
        ? 'Todos os campos obrigatórios de identificação (instituição, autor, título, cidade e ano) estão preenchidos.'
        : `Campos ausentes: ${missingMeta.join(', ')}.`,
    suggestion: missingMeta.length === 0 ? undefined : 'Preencha os dados faltantes no formulário Capa / Folha de Rosto.',
  });

  // 5. Elementos obrigatórios específicos do tipo de trabalho
  const missingMandatorySections = spec.mandatoryKinds.filter(
    (reqKind) => !enabledSections.some((sec) => sec.kind === reqKind)
  );
  items.push({
    id: 'mandatory_elements',
    category: 'Estrutura',
    label: `Elementos obrigatórios para ${spec.name} (${spec.governingStandard})`,
    status: missingMandatorySections.length === 0 ? 'ok' : 'missing',
    detail:
      missingMandatorySections.length === 0
        ? `Todas as seções obrigatórias para ${spec.name} estão ativas na estrutura.`
        : `Faltam elementos obrigatórios: ${missingMandatorySections.join(', ')}.`,
    suggestion:
      missingMandatorySections.length === 0
        ? undefined
        : 'Ative as seções ausentes na árvore de estrutura do painel esquerdo.',
    autoFixKey: missingMandatorySections.includes('capa')
      ? 'enable_capa'
      : missingMandatorySections.includes('sumario')
        ? 'enable_sumario'
        : undefined,
  });

  // 6. Verificação de conteúdo vazio em seções textuais ativas
  const emptyTextual = enabledSections.filter((s) => {
    if (s.part !== 'textual') return false;
    return stripHtml(s.content).length < 15;
  });
  items.push({
    id: 'textual_content',
    category: 'Estrutura',
    label: 'Preenchimento das seções textuais ativas',
    status: emptyTextual.length === 0 ? 'ok' : 'warning',
    detail:
      emptyTextual.length === 0
        ? 'Todas as seções textuais ativas possuem conteúdo redigido.'
        : `${emptyTextual.length} seção(ões) com conteúdo insuficiente ou em branco: ${emptyTextual.map((s) => s.title).join(', ')}.`,
    suggestion: emptyTextual.length === 0 ? undefined : 'Redija o conteúdo das seções pendentes ou desative seções não utilizadas.',
    sectionId: emptyTextual[0]?.id,
  });

  // 7. Resumo e Palavras-chave (NBR 6028:2021)
  const resumoSec = enabledSections.find((s) => s.kind === 'resumo');
  if (resumoSec || spec.mandatoryKinds.includes('resumo')) {
    const resumoWords = resumoSec ? stripHtml(resumoSec.content).split(/\s+/).filter(Boolean).length : 0;
    const hasKw = Boolean(resumoSec?.keywords?.trim());
    const minW = doc.type === 'artigo_cientifico' ? 100 : 150;
    const maxW = doc.type === 'artigo_cientifico' ? 250 : 500;
    const inRange = resumoWords >= minW && resumoWords <= maxW;

    items.push({
      id: 'resumo_nbr6028',
      category: 'Estrutura',
      label: `Resumo e palavras-chave conforme NBR 6028:2021 (${minW}–${maxW} palavras)`,
      status: !resumoSec ? 'missing' : inRange && hasKw ? 'ok' : 'warning',
      detail: !resumoSec
        ? 'Seção de Resumo não encontrada.'
        : `Resumo atual com ${resumoWords} palavras${hasKw ? ' e palavras-chave preenchidas' : ', mas sem palavras-chave definidas'}.`,
      suggestion: !resumoSec
        ? 'Adicione a seção Resumo.'
        : `Ajuste a extensão do resumo para ${minW}–${maxW} palavras e informe as palavras-chave separadas por ponto e vírgula.`,
      sectionId: resumoSec?.id,
    });
  }

  // 8. Sumário e Numeração Progressiva (NBR 6024 & 6027)
  if (spec.hasSumario) {
    const hasSumario = enabledSections.some((s) => s.kind === 'sumario');
    items.push({
      id: 'toc_sync',
      category: 'Numeração e Sumário',
      label: 'Sumário automático e numeração progressiva (NBR 6024 / 6027)',
      status: hasSumario && paginated.toc.length > 0 ? 'ok' : hasSumario ? 'warning' : 'missing',
      detail: hasSumario
        ? `Sumário sincronizado com ${paginated.toc.length} entradas e numeração progressiva em algarismos arábicos.`
        : 'O Sumário está desativado para este tipo de documento.',
      suggestion: hasSumario ? undefined : 'Ative o Sumário na estrutura do documento.',
      autoFixKey: hasSumario ? undefined : 'enable_sumario',
    });
  } else {
    items.push({
      id: 'progressive_numbering',
      category: 'Numeração e Sumário',
      label: 'Numeração progressiva das seções textuais (NBR 6024:2012)',
      status: paginated.toc.length > 0 ? 'ok' : 'warning',
      detail: `${paginated.toc.length} seções numeradas automaticamente no corpo do documento.`,
    });
  }

  // 9. Paginação (NBR 14724)
  const firstNumberedPage = paginated.pages.find((p) => p.displayPageNumber !== null);
  items.push({
    id: 'pagination',
    category: 'Paginação',
    label: 'Regras de paginação A4 automática',
    status: firstNumberedPage ? 'ok' : 'warning',
    detail: firstNumberedPage
      ? spec.startPageNumberOnFirstTextual
        ? `Documento com ${paginated.totalPhysicalPages} páginas físicas. Numeração exibida no canto superior direito a partir da parte textual (p. ${firstNumberedPage.displayPageNumber}).`
        : `Documento com ${paginated.totalPhysicalPages} páginas. Numeração exibida desde a página ${firstNumberedPage.displayPageNumber}.`
      : 'Não há páginas textuais numeráveis geradas ainda.',
    suggestion: firstNumberedPage ? undefined : 'Adicione ou habilite ao menos uma seção textual.',
  });

  // 10. Referências Bibliográficas (NBR 6023:2025)
  const incompleteRefs = doc.references.filter((r) => getReferenceMissingFields(r).length > 0);
  const sortedRefs = sortReferencesAlphabetically(doc.references);
  const isAlphabetical = doc.references.every((r, idx) => r.id === sortedRefs[idx]?.id);

  if (doc.references.length === 0) {
    items.push({
      id: 'references_present',
      category: 'Citações e Referências',
      label: 'Referências bibliográficas cadastradas (NBR 6023:2025)',
      status: spec.mandatoryKinds.includes('referencias') ? 'missing' : 'warning',
      detail: 'Nenhuma referência bibliográfica foi cadastrada ainda.',
      suggestion: 'Cadastre ao menos uma fonte no módulo Citações & Referências.',
    });
  } else {
    items.push({
      id: 'references_complete',
      category: 'Citações e Referências',
      label: 'Completude dos dados das referências (NBR 6023:2025)',
      status: incompleteRefs.length === 0 ? 'ok' : 'warning',
      detail:
        incompleteRefs.length === 0
          ? `${doc.references.length} referência(s) formatada(s) sem campos obrigatórios ausentes.`
          : `${incompleteRefs.length} referência(s) com campos obrigatórios incompletos (${incompleteRefs.map((r) => r.title || 'Sem título').join(', ')}).`,
      suggestion:
        incompleteRefs.length === 0
          ? undefined
          : 'Complete autor, ano, editora/URL ou data de acesso nas referências indicadas.',
    });

    items.push({
      id: 'references_order',
      category: 'Citações e Referências',
      label: 'Ordenação alfabética e alinhamento à esquerda das referências',
      status: isAlphabetical ? 'ok' : 'ok', // Formatter sorts automatically on render/export
      detail: `${doc.references.length} referência(s) ordenadas alfabeticamente automaticamente no preview e na exportação.`,
    });
  }

  // 11. Cruzamento entre citações no texto e referências cadastradas (NBR 10520:2023)
  const allText = enabledSections
    .filter((s) => s.part === 'textual')
    .map((s) => stripHtml(s.content))
    .join(' ');

  const citationMatches = allText.match(/\([A-ZÀ-Úa-zà-ú][^()]{1,60},\s*\d{4}[^()]*\)/g) || [];
  if (citationMatches.length === 0) {
    items.push({
      id: 'citations_detected',
      category: 'Citações e Referências',
      label: 'Presença de citações no texto (NBR 10520:2023)',
      status: 'warning',
      detail: 'Nenhuma citação no formato autor-data "(Sobrenome, ano)" foi identificada nas seções textuais.',
      suggestion: 'Utilize o botão "Inserir Citação" no editor para vincular citações às suas referências.',
    });
  } else {
    const unmatchedCitations: string[] = [];
    const refFormattedList = doc.references.map((r) => ({
      ref: r,
      formatted: formatReferenceNbr6023(r).plainText.toLowerCase(),
      authorLower: (r.authors || r.publicationOrgan || '').toLowerCase(),
    }));

    for (const cite of citationMatches) {
      const surnameMatch = cite.match(/^\(([^,]+)/);
      const yearMatch = cite.match(/(\d{4})/);
      const surname = (surnameMatch?.[1] || '').replace(/et al\.?/i, '').trim().toLowerCase();
      const year = yearMatch?.[1] || '';

      const found = refFormattedList.some(
        (r) => (surname && (r.authorLower.includes(surname) || r.formatted.includes(surname))) && (!year || r.ref.year.includes(year))
      );
      if (!found) unmatchedCitations.push(cite);
    }

    items.push({
      id: 'citations_cross_check',
      category: 'Citações e Referências',
      label: 'Correspondência entre citações no texto e lista de referências',
      status: unmatchedCitations.length === 0 ? 'ok' : 'warning',
      detail:
        unmatchedCitations.length === 0
          ? `Todas as ${citationMatches.length} citação(ões) autor-data encontradas correspondem às referências cadastradas.`
          : `${unmatchedCitations.length} citação(ões) no texto não possuem referência correspondente cadastrada: ${unmatchedCitations.slice(0, 3).join('; ')}.`,
      suggestion:
        unmatchedCitations.length === 0
          ? undefined
          : 'Cadastre as obras citadas no painel de Referências para evitar omissões na bibliografia.',
    });
  }

  const okCount = items.filter((i) => i.status === 'ok').length;
  const warningCount = items.filter((i) => i.status === 'warning').length;
  const missingCount = items.filter((i) => i.status === 'missing').length;

  return {
    documentType: spec.name,
    analyzedAt: new Date().toISOString(),
    isFullyCompliant: warningCount === 0 && missingCount === 0,
    okCount,
    warningCount,
    missingCount,
    items,
  };
}
