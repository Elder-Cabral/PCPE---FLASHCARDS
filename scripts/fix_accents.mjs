/**
 * Script de correção ortográfica — acentos em falta e confusão "e"/"é".
 *
 * USO:
 *   node scripts/fix_accents.mjs              # dry-run
 *   node scripts/fix_accents.mjs --apply       # aplica as correções
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BANCO_PATH = path.join(__dirname, '..', 'src', 'data', 'banco.json');
const APPLY = process.argv.includes('--apply');

// ── Mapa de correções: palavra_minúscula → forma_acentuada ──
const FIXES = {
  // Proparoxítonas (TODAS levam acento)
  'juridico': 'jurídico', 'juridica': 'jurídica',
  'juridicos': 'jurídicos', 'juridicas': 'jurídicas',
  'publico': 'público', 'publica': 'pública',
  'publicos': 'públicos', 'publicas': 'públicas',
  'especifico': 'específico', 'especifica': 'específica',
  'especificos': 'específicos', 'especificas': 'específicas',
  'valido': 'válido', 'valida': 'válida',
  'validos': 'válidos', 'validas': 'válidas',
  'invalido': 'inválido', 'invalida': 'inválida',
  'invalidos': 'inválidos', 'invalidas': 'inválidas',
  'tipico': 'típico', 'tipica': 'típica',
  'tipicos': 'típicos', 'tipicas': 'típicas',
  'atipico': 'atípico', 'atipica': 'atípica',
  'atipicos': 'atípicos', 'atipicas': 'atípicas',
  'critico': 'crítico', 'critica': 'crítica',
  'criticos': 'críticos', 'criticas': 'críticas',
  'logico': 'lógico', 'logica': 'lógica',
  'logicos': 'lógicos', 'logicas': 'lógicas',
  'etico': 'ético', 'etica': 'ética',
  'eticos': 'éticos', 'eticas': 'éticas',
  'politico': 'político', 'politica': 'política',
  'politicos': 'políticos', 'politicas': 'políticas',
  'conteudo': 'conteúdo', 'conteudos': 'conteúdos',
  'hipotese': 'hipótese', 'hipoteses': 'hipóteses',
  // 'analise' removido: verbo "analisar" (imperativo) ≠ substantivo "análise"
  // Requer análise contextual, não correção automática.
  'sumula': 'súmula', 'sumulas': 'súmulas',
  'ambito': 'âmbito',
  'indicio': 'indício', 'indicios': 'indícios',
  'legitimo': 'legítimo', 'legitima': 'legítima',
  'legitimos': 'legítimos', 'legitimas': 'legítimas',
  'idoneo': 'idôneo', 'idonea': 'idônea',
  'idoneos': 'idôneos', 'idoneas': 'idôneas',
  'subito': 'súbito', 'subita': 'súbita',
  'subitos': 'súbitos', 'subitas': 'súbitas',
  'ultimo': 'último', 'ultima': 'última',
  'ultimos': 'últimos', 'ultimas': 'últimas',
  'proximo': 'próximo', 'proxima': 'próxima',
  'proximos': 'próximos', 'proximas': 'próximas',
  'proprio': 'próprio', 'propria': 'própria',
  'proprios': 'próprios', 'proprias': 'próprias',
  'unico': 'único', 'unica': 'única',
  'unicos': 'únicos', 'unicas': 'únicas',
  'numerico': 'numérico', 'numerica': 'numérica',
  'numericos': 'numéricos', 'numericas': 'numéricas',
  'tecnico': 'técnico', 'tecnica': 'técnica',
  'tecnicos': 'técnicos', 'tecnicas': 'técnicas',
  'sistemico': 'sistêmico', 'sistemica': 'sistêmica',
  'intrinseco': 'intrínseco', 'intrinseca': 'intrínseca',
  'extrinseco': 'extrínseco', 'extrinseca': 'extrínseca',
  'cronologico': 'cronológico', 'cronologica': 'cronológica',
  'periodo': 'período', 'periodos': 'períodos',
  'maximo': 'máximo', 'maxima': 'máxima',
  'maximos': 'máximos', 'maximas': 'máximas',
  'minimo': 'mínimo', 'minima': 'mínima',
  'minimos': 'mínimos', 'minimas': 'mínimas',
  'simbolo': 'símbolo', 'simbolos': 'símbolos',
  'prototipo': 'protótipo', 'prototipos': 'protótipos',
  'inquerito': 'inquérito', 'inqueritos': 'inquéritos',
  'indigena': 'indígena', 'indigenas': 'indígenas',
  'proposito': 'propósito', 'propositos': 'propósitos',

  // "pratica" como SUBSTANTIVO/ADJETIVO (NÃO o verbo "praticar")
  // Seguro quando precedido de artigo/determinante ou em contexto nominal
  'pratico': 'prático', 'praticos': 'práticos',
  'praticas': 'práticas',

  // Paroxítonas acentuadas (i/u tônico em hiato)
  'judiciario': 'judiciário', 'judiciarios': 'judiciários',
  'judiciaria': 'judiciária', 'judiciarias': 'judiciárias',
  'necessario': 'necessário', 'necessarios': 'necessários',
  'necessaria': 'necessária', 'necessarias': 'necessárias',
  'arbitrario': 'arbitrário', 'arbitrarios': 'arbitrários',
  'arbitraria': 'arbitrária', 'arbitrarias': 'arbitrárias',
  'contrario': 'contrário', 'contrarios': 'contrários',
  'contraria': 'contrária', 'contrarias': 'contrárias',
  'salario': 'salário', 'salarios': 'salários',
  'temporario': 'temporário', 'temporarios': 'temporários',
  'temporaria': 'temporária', 'temporarias': 'temporárias',
  'extraordinario': 'extraordinário', 'extraordinarios': 'extraordinários',
  'extraordinaria': 'extraordinária', 'extraordinarias': 'extraordinárias',
  'ordinario': 'ordinário', 'ordinarios': 'ordinários',
  'ordinaria': 'ordinária', 'ordinarias': 'ordinárias',
  'beneficio': 'benefício', 'beneficios': 'benefícios',
  'beneficiario': 'beneficiário', 'beneficiarios': 'beneficiários',
  'oficio': 'ofício', 'oficios': 'ofícios',
  'inicio': 'início', 'inicios': 'inícios',
  'premio': 'prêmio', 'premios': 'prêmios',
  'serie': 'série', 'series': 'séries',
  'presidio': 'presídio', 'presidios': 'presídios',
  'dominio': 'domínio', 'dominios': 'domínios',
  'patrimonio': 'patrimônio', 'patrimonios': 'patrimônios',
  'ministerio': 'ministério', 'ministerios': 'ministérios',
  'comercio': 'comércio',
  'negocio': 'negócio', 'negocios': 'negócios',
  'exercicio': 'exercício', 'exercicios': 'exercícios',
  'proprietario': 'proprietário', 'proprietarios': 'proprietários',
  'secretario': 'secretário', 'secretarios': 'secretários',
  'funcionario': 'funcionário', 'funcionarios': 'funcionários',
  'estagiario': 'estagiário', 'estagiarios': 'estagiários',
  'donatario': 'donatário', 'donatarios': 'donatários',
  'destinatario': 'destinatário', 'destinatarios': 'destinatários',
  'cartorio': 'cartório', 'cartorios': 'cartórios',
  'obrigatorio': 'obrigatório', 'obrigatorios': 'obrigatórios',
  'obrigatoria': 'obrigatória', 'obrigatorias': 'obrigatórias',
  'desnecessario': 'desnecessário', 'desnecessarios': 'desnecessários',
  'desnecessaria': 'desnecessária', 'desnecessarias': 'desnecessárias',
  'previdenciario': 'previdenciário', 'previdenciarios': 'previdenciários',
  'previdenciaria': 'previdenciária', 'previdenciarias': 'previdenciárias',
  'incendio': 'incêndio',

  // Matéria / Órgão / Nível
  'materia': 'matéria', 'materias': 'matérias',
  'especie': 'espécie', 'especies': 'espécies',
  'orgao': 'órgão', 'orgaos': 'órgãos',
  'nivel': 'nível', 'niveis': 'níveis',
  'carater': 'caráter', 'carateres': 'caracteres',
  'alcool': 'álcool',

  // Palavras com til (-ção, -ões)
  'nao': 'não',
  'execucao': 'execução', 'execucoes': 'execuções',
  'fundamentacao': 'fundamentação', 'fundamentacoes': 'fundamentações',
  'investigacao': 'investigação', 'investigacoes': 'investigações',
  'organizacao': 'organização', 'organizacoes': 'organizações',
  'administracao': 'administração', 'administracoes': 'administrações',
  'disposicao': 'disposição', 'disposicoes': 'disposições',
  'prescricao': 'prescrição', 'prescricoes': 'prescrições',
  'condenacao': 'condenação', 'condenacoes': 'condenações',
  'licitacao': 'licitação', 'licitacoes': 'licitações',
  'situacao': 'situação', 'situacoes': 'situações',
  'avaliacao': 'avaliação', 'avaliacoes': 'avaliações',
  'vinculacao': 'vinculação',
  'remuneracao': 'remuneração',
  'prorrogacao': 'prorrogação',
  'classificacao': 'classificação',
  'notificacao': 'notificação',

  // Paroxítonas em -l, -r, -ps, -x, -um, -us, -n, -ão
  'possivel': 'possível', 'possiveis': 'possíveis',
  'impossivel': 'impossível', 'impossiveis': 'impossíveis',
  'incrivel': 'incrível', 'incriveis': 'incríveis',
  'facil': 'fácil', 'facies': 'fáceis',
  'dificil': 'difícil', 'dificeis': 'difíceis',
  'util': 'útil', 'uteis': 'úteis',
  'esteril': 'estéril', 'estereis': 'estéreis',
  'textil': 'têxtil',
  'imovel': 'imóvel', 'imoveis': 'imóveis',
  'moveis': 'móveis',
  'responsavel': 'responsável', 'responsaveis': 'responsáveis',
  'viavel': 'viável', 'viaveis': 'viáveis',
  'inviavel': 'inviável', 'inviaveis': 'inviáveis',
  'notavel': 'notável', 'notaveis': 'notáveis',
  'amavel': 'amável', 'amaveis': 'amáveis',
  'setimo': 'sétimo', 'setima': 'sétima',
  'decimo': 'décimo', 'decima': 'décima',
  'centesimo': 'centésimo',
  'milesimo': 'milésimo',

  // Monossílabos tônicos seguros
  'mes': 'mês',
  'so': 'só',
};

// Palavras que NÃO devem ser corrigidas
const EXCEPTIONS = new Set([
  'nos', 'nas', 'mesmo',
  'pe', 'pa', 'so', // abreviaturas (PE=Pernambuco, PA=Progressão Aritmética, SO=Sistema Operacional)
  'iniciar', // Menu Iniciar (nome próprio Windows)
  'item', 'itens', 'jovem', 'jovens', 'imagem', 'imagens',
  'homem', 'homens', 'nuvem', 'nuvens', 'ordem', 'ordens',
  'origem', 'origens', 'margem', 'margens', 'viagem', 'viagens',
  'alicerce',
  'licitar', 'licitatorio', 'licitante', 'licitantes',
  'intuito', 'intuitos',
  'requisito', 'requisitos', 'requisitar',
  'mister',
  'protocolar', 'protocolo', 'protocolos',
  'judicial', 'judiciais',
  'beneficiar', 'beneficiado',
  'iniciar', 'iniciado', 'iniciais', 'inicial',
  'patrimonial', 'patrimoniais',
  'comerciar', 'comerciante',
  'irrazoabilidade',
  'assistencial', 'assistenciais',
  'complementar', 'complementares',
  'molestia',
]);

/**
 * Aplica o acento preservando o case original.
 */
function applyAccent(originalWord, correctedBase) {
  if (originalWord === originalWord.toUpperCase()) {
    return correctedBase.toUpperCase();
  }
  if (originalWord[0] === originalWord[0].toUpperCase() &&
      originalWord.slice(1) === originalWord.slice(1).toLowerCase()) {
    return correctedBase.charAt(0).toUpperCase() + correctedBase.slice(1);
  }
  return correctedBase;
}

/**
 * Aplica correções em um texto.
 * Usa regex com classe Unicode para tokenização correta incluindo acentos.
 */
function fixText(text, cardId, fieldName) {
  if (!text) return { text, changed: false, fixes: [] };

  const fixes = [];
  // Regex: corresponde a sequências de letras (Unicode) e dígitos
  const wordRe = /([\p{L}\d]+)/gu;
  const segments = text.split(wordRe);
  let changed = false;

  for (let i = 1; i < segments.length; i += 2) {
    const token = segments[i];
    const lower = token.toLowerCase();

    if (EXCEPTIONS.has(lower)) continue;
    if (lower.length < 2) continue;

    const correction = FIXES[lower];
    if (correction && token !== correction) {
      const applied = applyAccent(token, correction);
      if (applied !== token) {
        const ctxBefore = segments.slice(Math.max(0, i - 3), i).join('').slice(-30);
        const ctxAfter = segments.slice(i + 1, i + 4).join('').slice(0, 30);

        fixes.push({
          cardId,
          field: fieldName,
          original: token,
          correction: applied,
          context: ctxBefore + token + ctxAfter
        });
        segments[i] = applied;
        changed = true;
      }
    }
  }

  return { text: segments.join(''), changed, fixes };
}

// ── EXECUÇÃO ──
console.log(`🧠 Varredura ortográfica: ${APPLY ? 'APLICANDO correções' : 'MODO PREVIEW (dry-run)'}\n`);

const banco = JSON.parse(fs.readFileSync(BANCO_PATH, 'utf8'));

let totalFixes = 0;
let totalCards = 0;
const allFixes = [];
const byMateria = {};

for (const [materia, cards] of Object.entries(banco)) {
  for (const card of cards) {
    let cardChanged = false;
    for (const field of ['pergunta', 'resposta', 'dica']) {
      const result = fixText(card[field], card.id, field);
      if (result.changed) {
        card[field] = result.text;
        cardChanged = true;
        totalFixes += result.fixes.length;
        allFixes.push(...result.fixes);
        byMateria[materia] = (byMateria[materia] || 0) + result.fixes.length;
      }
    }
    if (cardChanged) totalCards++;
  }
}

// ── RELATÓRIO ──
if (totalFixes === 0) {
  console.log('✅ Nenhum erro de acentuação encontrado.');
  process.exit(0);
}

console.log(`📊 TOTAL: ${totalFixes} correções em ${totalCards} cards\n`);

console.log('📋 CORREÇÕES:\n');
for (const fix of allFixes) {
  console.log(`   ${fix.cardId} [${fix.field}]`);
  console.log(`     "${fix.original}" → "${fix.correction}"`);
  console.log(`     Contexto: ...${fix.context}...\n`);
}

console.log('📊 POR MATÉRIA:');
for (const [m, count] of Object.entries(byMateria).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${m}: ${count} correções`);
}

if (APPLY) {
  fs.writeFileSync(BANCO_PATH, JSON.stringify(banco, null, 2), 'utf8');
  console.log(`\n✅ Correções APLICADAS em ${BANCO_PATH}`);
} else {
  console.log(`\n⚠️  Modo preview. Para aplicar: node scripts/fix_accents.mjs --apply`);
}
