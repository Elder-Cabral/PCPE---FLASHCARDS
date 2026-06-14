/**
 * classificar_dificuldade.mjs
 *
 * Classifica cada flashcard como "facil", "media" ou "dificil" segundo 3 critérios:
 *   1. Frequência em provas CEBRASPE (peso principal — pesquisa incorporada)
 *   2. Complexidade do conteúdo do card
 *   3. Posição hierárquica do tema na matéria
 *
 * USO:
 *   node scripts/classificar_dificuldade.mjs          # dry-run (mostra distribuição)
 *   node scripts/classificar_dificuldade.mjs --apply   # adiciona campo dificuldade
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BANCO_PATH = path.resolve(__dirname, '..', 'src', 'data', 'banco.json');
const DRY_RUN = !process.argv.includes('--apply');

// ─── UTILITIES ────────────────────────────────────────────────────────────────

const text = (obj) => `${obj.pergunta || ''} ${obj.resposta || ''} ${obj.dica || ''} ${obj.topico || ''}`.toLowerCase();

const hasAny = (str, keywords) => keywords.some(k => str.includes(k.toLowerCase()));

// ─── SUBJECT PROFILES (CEBRASPE research-based) ───────────────────────────────
// Each subject defines topic rules and keyword patterns per difficulty tier.
// Criterion 1 (exam frequency) is embedded in the per-subject design.

const DS = {}; // will hold per-subject classification data

// ──────────── LEGISLAÇÃO ESTADUAL ─────────────────────────────────────────────
DS.leg_estadual = {
  topicBase: {
    // Fácil: estrutura básica, conceitos gerais, artigos mais conhecidos
    'constituição do estado de pernambuco': 'media',
    'segurança pública na constituição': 'media',
    'estatuto do policial civil': 'media',
    'lei complementar': 'media',
  },
  facil: {
    topics: ['princípios', 'fundamentos', 'conceito', 'estrutura orgânica', 'órgãos', 'organização', 'definição'],
    keywords: ['o que é', 'qual a função', 'quais são os órgãos', 'conceito de', 'o que significa'],
    respPatterns: ['regra geral', 'em regra', 'conceito', 'definição'],
  },
  dificil: {
    topics: ['exceção', 'prazo', 'súmula', 'jurisprudência', 'contagem', 'limite'],
    keywords: ['exceto', 'exceção', 'não se aplica', 'vedado', 'proibido', 'salvo', 'ressalva',
               'súmula vinculante', 'stf', 'stj', 'jurisprudência', 'entendimento',
               'prazo', 'dias consecutivos', 'dias alternados', 'limite de',
               'diferença', 'distinção', 'comparativo', 'não confundir'],
  }
};

// ──────────── DIREITO CONSTITUCIONAL ──────────────────────────────────────────
DS.dir_const = {
  topicBase: {
    'princípios fundamentais': 'facil',
    'direitos e garantias fundamentais': 'media',
    'direitos individuais': 'media',
    'organização político-administrativa': 'media',
    'organização do estado': 'media',
    'administração pública': 'media',
    'poder executivo': 'facil',
    'poder legislativo': 'media',
    'poder judiciário': 'media',
    'funções essenciais à justiça': 'media',
    'controle de constitucionalidade': 'dificil',
    'defesa do estado': 'media',
    'remédios constitucionais': 'media',
  },
  facil: {
    topics: ['princípios', 'fundamentos', 'conceito', 'definição', 'o que é', 'espécies de'],
    keywords: ['o que é', 'quais são os', 'conceito de', 'princípio', 'fundamento',
               'artigo 1º', 'art. 1°', 'art. 1º', 'soberania', 'cidadania', 'dignidade'],
    respPatterns: ['artigo 1º', 'art. 1°', 'regra geral', 'conceito', 'definição'],
  },
  dificil: {
    topics: ['controle de constitucionalidade', 'adi', 'adc', 'adpf', 'súmula vinculante',
             'intervenção federal', 'estado de defesa', 'estado de sítio',
             'jurisprudência', 'stf', 'modulação'],
    keywords: ['súmula vinculante', 'stf entende', 'jurisprudência', 'adi', 'adc', 'adpf',
               'arguição', 'modulação', 'efeito ex tunc', 'efeito ex nunc',
               'inconstitucionalidade', 'controle concentrado', 'controle difuso',
               'intervenção federal', 'estado de defesa', 'estado de sítio',
               'exceção', 'não se aplica', 'salvo', 'exceto', 'vedado',
               'cláusula pétrea', 'limitação material', 'processo legislativo'],
  }
};

// ──────────── DIREITO ADMINISTRATIVO ──────────────────────────────────────────
DS.dir_adm = {
  topicBase: {
    'estado, governo e administração pública': 'facil',
    'direito administrativo': 'facil',
    'regime jurídico-administrativo': 'media',
    'princípios': 'facil',
    'ato administrativo': 'media',
    'poderes da administração': 'media',
    'poderes administrativos': 'media',
    'responsabilidade civil do estado': 'dificil',
    'serviços públicos': 'media',
    'organização administrativa': 'media',
    'controle da administração pública': 'media',
    'processo administrativo': 'media',
    'licitações e contratos': 'dificil',
    'licitação': 'dificil',
    'agente público': 'media',
    'cargo, emprego e função': 'media',
    'improbidade administrativa': 'dificil',
    'bens públicos': 'media',
  },
  facil: {
    topics: ['conceito', 'definição', 'princípios', 'o que é', 'fontes', 'classificação'],
    keywords: ['o que é', 'conceito de', 'definição de', 'princípio da', 'quais são',
               'administração direta', 'administração indireta', 'sentidos'],
    respPatterns: ['conceito', 'definição', 'princípio', 'regra geral'],
  },
  dificil: {
    topics: ['licitação', 'improbidade', 'contrato', 'responsabilidade civil', 'excludente',
             'delegação', 'concessão', 'permissão', 'autorização'],
    keywords: ['lei 14.133', '8.666', '8.429', 'improbidade', 'licitação', 'concorrência',
               'pregão', 'tomada de preços', 'convite', 'modalidade',
               'excludente', 'caso fortuito', 'força maior', 'culpa exclusiva',
               'responsabilidade subjetiva', 'responsabilidade objetiva',
               'risco administrativo', 'risco integral',
               'prazo', 'decadência', 'prescrição', '5 anos',
               'servidor público', 'estatutário', 'celetista', 'temporário',
               'não pode', 'vedado', 'proibido', 'exceto', 'salvo',
               'desconcentração', 'descentralização', 'outorga', 'delegação',
               'diferença', 'distinção', 'não se confunde'],
  }
};

// ──────────── DIREITO PENAL ───────────────────────────────────────────────────
DS.dir_penal = {
  topicBase: {
    'princípios básicos': 'facil',
    'crime e contravenção': 'facil',
    'aplicação da lei penal': 'media',
    'crimes contra a pessoa': 'media',
    'crimes contra o patrimônio': 'media',
    'crimes contra a dignidade sexual': 'media',
    'crimes contra a administração pública': 'media',
    'leis especiais': 'dificil',
    'crimes hediondos': 'dificil',
    'abuso de autoridade': 'dificil',
    'tortura': 'dificil',
    'organizações criminosas': 'dificil',
    'lei maria da penha': 'dificil',
    'lei de drogas': 'dificil',
    'estatuto da criança': 'dificil',
    'lei henry borel': 'dificil',
    'crimes ambientais': 'dificil',
    'estatuto do desarmamento': 'dificil',
  },
  facil: {
    topics: ['conceito', 'princípios', 'definição', 'classificação', 'o que é'],
    keywords: ['o que é', 'conceito de', 'princípio da', 'quais são os',
               'espécies de', 'elementos do', 'classificação'],
    respPatterns: ['conceito', 'definição', 'princípio', 'regra geral'],
  },
  dificil: {
    topics: ['lei especial', 'hediondo', 'tóxico', 'droga', 'abuso de autoridade',
             'tortura', 'organização criminosa', 'maria da penha', 'desarmamento',
             'trânsito', 'henry borel', 'ambiental'],
    keywords: ['lei especial', 'hediondo', 'tóxico', 'droga', 'abuso de autoridade',
               'tortura', 'organização criminosa', 'maria da penha', 'desarmamento',
               'lei de trânsito', 'henry borel', 'ambiental',
               'não hediondo', 'equiparado', 'inafiançável', 'insuscetível de graça',
               'progressão de regime', 'regime inicial', '2/5', '3/5',
               'aumento de pena', 'causa de aumento', 'qualificado',
               'súmula', 'stf', 'stj', 'jurisprudência',
               'exceção', 'exceto', 'salvo', 'não se aplica', 'vedado',
               'diferença', 'distinção', 'não confundir'],
  }
};

// ──────────── DIREITO PROCESSUAL PENAL ────────────────────────────────────────
DS.dir_proc_penal = {
  topicBase: {
    'aplicação da lei processual': 'facil',
    'inquérito policial': 'media',
    'prova': 'dificil',
    'provas': 'dificil',
    'prisão e liberdade provisória': 'dificil',
    'medidas cautelares diversas': 'dificil',
    'prisão temporária': 'dificil',
    'juizados especiais criminais': 'media',
    'investigação criminal': 'media',
  },
  facil: {
    topics: ['conceito', 'princípios', 'definição', 'o que é', 'aplicação da lei'],
    keywords: ['o que é', 'conceito de', 'princípio', 'quem preside', 'atribuição',
               'aplicação da lei', 'tempus regit actum', 'lei processual penal no tempo'],
    respPatterns: ['conceito', 'definição', 'princípio', 'regra geral'],
  },
  dificil: {
    topics: ['medida cautelar', 'prisão temporária', 'prisão preventiva',
             'prisão em flagrante', 'liberdade provisória', 'relaxamento',
             'interceptação', 'busca e apreensão', 'prova', 'provas'],
    keywords: ['medida cautelar', 'prisão temporária', 'prisão preventiva',
               'flagrante', 'liberdade provisória', 'fiança', 'relaxamento',
               'interceptação telefônica', 'escuta', 'busca e apreensão',
               'prova ilícita', 'prova derivada', 'teoria dos frutos da árvore envenenada',
               'nulidade', 'prazo', 'dias', '30 dias', '5 dias', '10 dias',
               'citação', 'intimação', 'notificação',
               'stf', 'stj', 'súmula', 'jurisprudência',
               'exceção', 'exceto', 'salvo', 'não se aplica',
               'diferença', 'distinção', 'não confundir'],
  }
};

// ──────────── PORTUGUÊS ───────────────────────────────────────────────────────
DS.portugues = {
  topicBase: {
    'compreensão e interpretação': 'facil',
    'tipos e gêneros textuais': 'facil',
    'ortografia oficial': 'facil',
    'coesão textual': 'media',
    'concordância': 'media',
    'regência': 'media',
    'crase': 'dificil',
    'pontuação': 'media',
    'colocação pronominal': 'media',
    'reescrita de frases': 'media',
    'correspondência oficial': 'facil',
  },
  facil: {
    topics: ['compreensão', 'interpretação', 'ortografia', 'gênero textual', 'tipo textual',
             'ofício', 'memorando', 'aviso', 'correspondência'],
    keywords: ['compreensão', 'interpretação de texto', 'ortografia', 'gênero textual',
               'tipo textual', 'manual da presidência', 'ofício', 'memorando',
               'aviso', 'padrão ofício'],
    respPatterns: ['regra geral', 'conceito', 'definição'],
  },
  dificil: {
    topics: ['crase', 'colocação pronominal avançada', 'concordância verbal complexa',
             'regência nominal', 'pontuação avançada'],
    keywords: ['crase', 'acento grave', 'regência', 'colocação pronominal',
               'próclise', 'ênclise', 'mesóclise',
               'concordância com percentual', 'concordância com sujeito oracional',
               'vírgula', 'ponto e vírgula', 'dois pontos',
               'exceção', 'casos especiais', 'facultativo',
               'antes de', 'depois de', 'diferença entre',
               'não se usa', 'vedado', 'proibido'],
  }
};

// ──────────── INFORMÁTICA ─────────────────────────────────────────────────────
DS.informatica = {
  topicBase: {
    'windows': 'facil',
    'pacote office': 'facil',
    'word': 'facil',
    'excel': 'media',
    'powerpoint': 'facil',
    'redes de computadores': 'media',
    'internet': 'media',
    'intranet': 'facil',
    'nuvem': 'facil',
    'deep web': 'dificil',
    'dark web': 'dificil',
    'correio eletrônico': 'facil',
    'segurança da informação': 'media',
    'backup': 'facil',
    'armazenamento em nuvem': 'facil',
  },
  facil: {
    topics: ['windows', 'word', 'powerpoint', 'atalho', 'correio', 'e-mail',
             'básico', 'conceito', 'o que é', 'definição'],
    keywords: ['atalho', 'windows', 'word', 'powerpoint', 'correio eletrônico',
               'e-mail', 'navegador', 'browser', 'o que é', 'conceito',
               'ftp', 'http', 'www', 'url', 'dns', 'ip', 'internet', 'intranet',
               'backup', 'nuvem', 'google drive', 'onedrive', 'dropbox'],
    respPatterns: ['atalho', 'função', 'ferramenta', 'conceito', 'definição'],
  },
  dificil: {
    topics: ['segurança', 'deep web', 'dark web', 'criptografia', 'certificado digital',
             'proxy', 'firewall', 'antivírus', 'malware', 'phishing', 'engenharia social',
             'excel avançado', 'fórmula complexa', 'tabela dinâmica', 'macro'],
    keywords: ['deep web', 'dark web', 'tor', 'criptografia', 'certificado digital',
               'proxy', 'firewall', 'antivírus', 'malware', 'vírus', 'worm', 'trojan',
               'ransomware', 'phishing', 'engenharia social', 'spyware', 'adware',
               'backdoor', 'rootkit', 'spoofing', 'ddos', 'mitm',
               'segurança da informação', 'confidencialidade', 'integridade', 'disponibilidade',
               'excel avançado', 'fórmula', 'função', 'tabela dinâmica', 'macro', 'vba',
               'diferença entre', 'distinção', 'comparativo',
               'exceção', 'caso específico', 'cuidado'],
  }
};

// ──────────── RACIOCÍNIO LÓGICO ───────────────────────────────────────────────
DS.raciocinio = {
  topicBase: {
    'conjuntos': 'facil',
    'medidas': 'facil',
    'proporções': 'media',
    'equações': 'media',
    'sistemas': 'media',
    'funções': 'dificil',
    'contagem': 'dificil',
    'progressões': 'media',
    'lógica proposicional': 'media',
    'lógica de primeira ordem': 'dificil',
    'argumentação': 'media',
    'probabilidade': 'dificil',
    'raciocínio lógico': 'media',
  },
  facil: {
    topics: ['conjunto', 'medida', 'unidade', 'o que é', 'conceito', 'definição'],
    keywords: ['o que é', 'conceito de', 'definição de', 'quais são',
               'conjunto', 'união', 'interseção', 'diferença'],
    respPatterns: ['conceito', 'definição', 'regra geral'],
  },
  dificil: {
    topics: ['probabilidade', 'contagem', 'análise combinatória', 'arranjo',
             'combinação', 'permutação', 'função composta', 'função inversa',
             'progressão geométrica', 'lógica de primeira ordem', 'quantificador'],
    keywords: ['probabilidade', 'análise combinatória', 'arranjo', 'combinação',
               'permutação', 'fatorial', 'princípio fundamental da contagem',
               'condicional', 'bayes', 'variância', 'desvio padrão',
               'progressão geométrica', 'pg', 'progressão aritmética', 'pa',
               'função composta', 'função inversa', 'bijeção', 'sobrejeção', 'injeção',
               'lógica de primeira ordem', 'quantificador', 'universal', 'existencial',
               'argumento válido', 'premissa', 'conclusão', 'falácia',
               'tabela verdade', 'equivalência lógica', 'negação',
               'fórmula', 'cálculo', 'determinar o valor'],
  }
};

// ──────────── CONTABILIDADE ───────────────────────────────────────────────────
DS.contabilidade = {
  topicBase: {
    'conceitos e finalidades': 'facil',
    'patrimônio': 'media',
    'atos e fatos administrativos': 'media',
    'contas': 'media',
    'plano de contas': 'media',
    'escrituração': 'dificil',
    'balancete de verificação': 'dificil',
    'balanço patrimonial': 'dificil',
    'demonstração do resultado': 'dificil',
    'normas brasileiras de contabilidade': 'dificil',
    'contabilização de operações diversas': 'dificil',
  },
  facil: {
    topics: ['conceito', 'definição', 'o que é', 'finalidade', 'objetivo'],
    keywords: ['o que é', 'conceito de', 'definição de', 'finalidade', 'objetivo',
               'patrimônio', 'bens', 'direitos', 'obrigações'],
    respPatterns: ['conceito', 'definição', 'regra geral'],
  },
  dificil: {
    topics: ['escrituração', 'lançamento', 'partidas dobradas', 'balanço',
             'dre', 'demonstração', 'varejo', 'cpv', 'custo', 'depreciação',
             'amortização', 'exaustão', 'provisão', 'reserva'],
    keywords: ['escrituração', 'lançamento', 'partidas dobradas', 'débito', 'crédito',
               'balanço patrimonial', 'ativo', 'passivo', 'patrimônio líquido',
               'dre', 'demonstração do resultado', 'receita', 'despesa', 'custo',
               'cpv', 'custo das mercadorias', 'custo dos produtos',
               'depreciação', 'amortização', 'exaustão',
               'provisão', 'reserva', 'capital social',
               'fórmula', 'cálculo', 'índice', 'indicador',
               'diferença entre', 'distinção', 'comparativo',
               'regime de caixa', 'regime de competência',
               'princípio contábil', 'convenção'],
  }
};

// ──────────── ESTATÍSTICA ─────────────────────────────────────────────────────
DS.estatistica = {
  topicBase: {
    'estatística descritiva': 'media',
    'análise exploratória': 'media',
    'gráficos': 'facil',
    'medidas descritivas': 'media',
    'probabilidade': 'dificil',
    'técnicas de amostragem': 'dificil',
    'tamanho amostral': 'dificil',
  },
  facil: {
    topics: ['conceito', 'definição', 'o que é', 'gráfico', 'tabela', 'população', 'amostra'],
    keywords: ['o que é', 'conceito de', 'definição de', 'população', 'amostra',
               'gráfico', 'tabela', 'frequência', 'histograma'],
    respPatterns: ['conceito', 'definição', 'regra geral'],
  },
  dificil: {
    topics: ['probabilidade condicional', 'teorema de bayes', 'distribuição',
             'variância', 'desvio padrão', 'coeficiente de variação',
             'amostragem', 'estratificada', 'conglomerado', 'sistemática',
             'tamanho amostral', 'teste de hipótese', 'correlação', 'regressão'],
    keywords: ['probabilidade condicional', 'teorema de bayes', 'distribuição normal',
               'distribuição binomial', 'distribuição de probabilidade',
               'variância', 'desvio padrão', 'coeficiente de variação',
               'amostragem', 'estratificada', 'conglomerado', 'sistemática', 'aleatória',
               'tamanho da amostra', 'teste de hipótese', 'erro tipo i', 'erro tipo ii',
               'correlação', 'regressão', 'coeficiente de pearson',
               'fórmula', 'cálculo', 'fórmula de',
               'mediana', 'moda', 'média aritmética', 'média ponderada',
               'separatriz', 'quartil', 'decil', 'percentil',
               'assimetria', 'curtose'],
  }
};

// ─── CLASSIFICATION FUNCTION ──────────────────────────────────────────────────

function classifyDifficulty(materia, card) {
  const profile = DS[materia];
  if (!profile) return 'media';

  const fullText = text(card);
  const pergunta = (card.pergunta || '').toLowerCase();
  const resposta = (card.resposta || '').toLowerCase();
  const topico = (card.topico || '').toLowerCase();
  const dica = (card.dica || '').toLowerCase();
  const topicoLower = topico.toLowerCase();

  // ─── Step 1: Check for "difícil" indicators (high weight) ───────────────
  // If any difficult keyword is in the text AND it's a central concept (in pergunta)
  const dificilKeywords = profile.dificil.keywords;
  const dificilTopics = profile.dificil.topics;
  const isDificilTopic = hasAny(topicoLower, dificilTopics);
  const isDificilPergunta = hasAny(pergunta, dificilKeywords);
  // Also check if resposta involves exceptions, specific numbers, jurisprudence
  const hasException = hasAny(resposta, ['exceto', 'salvo', 'ressalva', 'não se aplica', 'exceção']);
  const hasJurisprudence = hasAny(fullText, ['stf', 'stj', 'súmula', 'jurisprudência']);
  const hasSpecificNumber = /\b\d{2,3}\s*dias\b|\b\d{1,2}\s*anos\b|\b\d{1,2}%\b|\bart\.\s*\d{2,}/.test(resposta);

  // ─── Step 2: Check for "fácil" indicators ───────────────────────────────
  const facilKeywords = profile.facil.keywords;
  const facilTopics = profile.facil.topics;
  const isFacilTopic = hasAny(topicoLower, facilTopics);
  const isFacilPergunta = hasAny(pergunta, facilKeywords);
  // Simple concept definition cards (short, direct answers without exceptions)
  const isShortDefinition = (card.resposta || '').length < 120 && !hasAny(resposta, [',', ';', 'exceto', 'salvo']);

  // ─── Step 3: Topic base difficulty ──────────────────────────────────────
  const topicBase = profile.topicBase;
  let baseFromTopic = 'media';
  for (const [topicPattern, difficulty] of Object.entries(topicBase)) {
    if (topicoLower.includes(topicPattern)) {
      baseFromTopic = difficulty;
      break;
    }
  }

  // ─── Decision logic ─────────────────────────────────────────────────────
  // Priority: difficult indicators > topic base > easy indicators

  // Strong difficult signals override everything
  if (isDificilTopic || isDificilPergunta) {
    // Check if the card has strong difficult markers
    const strongDifficult = isDificilPergunta &&
      (hasException || hasJurisprudence || hasSpecificNumber);
    if (strongDifficult) return 'dificil';
    // Topic-based difficult with some support
    if (isDificilTopic && (hasException || hasJurisprudence || hasSpecificNumber)) return 'dificil';
    // Edge: difficult topic + difficult pergunta = difícil even without extra markers
    if (isDificilTopic && isDificilPergunta) return 'dificil';
  }

  // Strong easy signals
  if (isFacilPergunta && (isFacilTopic || isShortDefinition)) return 'facil';
  if (isFacilTopic && isShortDefinition) return 'facil';

  // Topic base as anchor
  if (baseFromTopic === 'facil' && !isDificilPergunta && !hasException && !hasJurisprudence) return 'facil';
  if (baseFromTopic === 'dificil') return 'dificil';

  // Medium: the rest
  return 'media';
}

// ─── BALANCE ADJUSTMENT ───────────────────────────────────────────────────────
// After first pass, redistribute cards in subjects with extreme imbalance.
// Target ranges per tier: 10%-65%. Cards near the boundary can be shifted.

function balanceAdjustment(materia, cards, stats) {
  const t = cards.length;
  const pF = stats.facil / t;
  const pM = stats.media / t;
  const pD = stats.dificil / t;

  // Helper: find first card with given difficulty whose text matches any pattern
  const findAndChange = (from, to, patterns) => {
    for (const card of cards) {
      if (card.dificuldade !== from) continue;
      const txt = text(card);
      if (hasAny(txt, patterns)) {
        card.dificuldade = to;
        stats[from]--;
        stats[to]++;
        return true;
      }
    }
    return false;
  };

  const findAndChangeReverse = (from, to, avoidPatterns) => {
    for (const card of cards) {
      if (card.dificuldade !== from) continue;
      const txt = text(card);
      if (!hasAny(txt, avoidPatterns)) {
        card.dificuldade = to;
        stats[from]--;
        stats[to]++;
        return true;
      }
    }
    return false;
  };

  let adjusted = 0;
  const maxAdjust = Math.floor(t * 0.20); // max 20% of cards

  // ─── Subject-specific balance rules ─────────────────────────────────────

  // Increase "dificil" in informatica (security, networks, advanced excel)
  if (materia === 'informatica' && stats.dificil < Math.max(3, t * 0.10)) {
    const target = Math.max(stats.dificil, Math.floor(t * 0.12));
    while (stats.dificil < target && adjusted < maxAdjust) {
      if (!findAndChange('media', 'dificil', ['segurança', 'rede', 'internet', 'protocolo',
        'firewall', 'malware', 'excel fórmula', 'função', 'fórmula', 'tabela dinâmica',
        'banco de dados', 'sql', 'criptografia', 'certificado', 'assinatura digital'])) break;
      adjusted++;
    }
  }

  // Increase "facil" in leg_estadual (basic definitions, organizational structure)
  if (materia === 'leg_estadual' && stats.facil < Math.max(3, t * 0.12)) {
    const target = Math.max(stats.facil, Math.floor(t * 0.14));
    while (stats.facil < target && adjusted < maxAdjust) {
      if (!findAndChange('media', 'facil', ['o que é', 'conceito', 'quais são os órgãos',
        'função constitucional', 'subordinada', 'estrutura', 'organização',
        'órgão', 'definição', 'estatuto'])) break;
      adjusted++;
    }
  }

  // Increase "dificil" in leg_estadual (prazos, exceptions, specific articles)
  if (materia === 'leg_estadual' && stats.dificil < Math.max(3, t * 0.10)) {
    const target = Math.max(stats.dificil, Math.floor(t * 0.12));
    while (stats.dificil < target && adjusted < maxAdjust) {
      if (!findAndChange('media', 'dificil', ['prazo', 'dias', 'limite', 'exceto', 'salvo',
        'não pode', 'vedado', 'proibido', 'exceção', 'sindicância', 'pad',
        'processo disciplinar', 'demissão', 'cassação', 'destituição',
        'art.', 'parágrafo', 'licença'])) break;
      adjusted++;
    }
  }

  // Increase "facil" in dir_proc_penal (basic concepts, principles, IP basics)
  if (materia === 'dir_proc_penal' && stats.facil < Math.max(3, t * 0.12)) {
    const target = Math.max(stats.facil, Math.floor(t * 0.14));
    while (stats.facil < target && adjusted < maxAdjust) {
      if (!findAndChange('media', 'facil', ['o que é', 'conceito', 'definição',
        'princípio', 'característica', 'finalidade', 'quem preside',
        'aplicação da lei', 'tempus regit actum', 'sistema'])) break;
      adjusted++;
    }
  }

  // Reduce "facil" in estatistica — move some to media (formulas, calculations)
  if (materia === 'estatistica' && stats.media < Math.max(3, t * 0.12)) {
    const target = Math.max(stats.media, Math.floor(t * 0.15));
    while (stats.media < target && adjusted < maxAdjust) {
      if (!findAndChange('facil', 'media', ['fórmula', 'cálculo', 'medida', 'média',
        'mediana', 'moda', 'variância', 'desvio', 'frequência',
        'coeficiente', 'índice', 'indicador', 'separatriz'])) break;
      adjusted++;
    }
  }

  // Increase "facil" in portugues (basic orthography, types)
  if (materia === 'portugues' && stats.facil < Math.max(3, t * 0.12)) {
    const target = Math.max(stats.facil, Math.floor(t * 0.15));
    while (stats.facil < target && adjusted < maxAdjust) {
      if (!findAndChange('media', 'facil', ['ortografia', 'acentuação', 'tipo textual',
        'gênero textual', 'ofício', 'memorando', 'correspondência oficial',
        'manual da presidência', 'padrão ofício', 'compreensão', 'interpretação'])) break;
      adjusted++;
    }
  }

  // Increase "dificil" in portugues (crase, regência complexa, colocação)
  if (materia === 'portugues' && stats.dificil < Math.max(3, t * 0.07)) {
    const target = Math.max(stats.dificil, Math.floor(t * 0.09));
    while (stats.dificil < target && adjusted < maxAdjust) {
      if (!findAndChange('media', 'dificil', ['crase', 'regência', 'colocação pronominal',
        'próclise', 'ênclise', 'mesóclise', 'vírgula facultativa',
        'concordância', 'diferença entre', 'distinção',
        'casos especiais', 'exceção', 'não se usa'])) break;
      adjusted++;
    }
  }

  // Increase "dificil" in dir_const (controle, jurisprudência, ADIs)
  if (materia === 'dir_const' && stats.dificil < Math.max(3, t * 0.10)) {
    const target = Math.max(stats.dificil, Math.floor(t * 0.12));
    while (stats.dificil < target && adjusted < maxAdjust) {
      if (!findAndChange('media', 'dificil', ['controle de constitucionalidade',
        'jurisprudência', 'stf', 'adi', 'adc', 'adpf', 'súmula vinculante',
        'intervenção', 'estado de defesa', 'modulação', 'cláusula pétrea',
        'processo legislativo', 'emenda constitucional'])) break;
      adjusted++;
    }
  }

  return adjusted;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

const DATA = JSON.parse(fs.readFileSync(BANCO_PATH, 'utf8'));
const materias = Object.keys(DATA);

const stats = {};
const examples = { facil: [], media: [], dificil: [] };
let totalAdjusted = 0;

for (const materia of materias) {
  stats[materia] = { facil: 0, media: 0, dificil: 0 };
  const cards = DATA[materia];

  // First pass
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const d = classifyDifficulty(materia, card);
    card.dificuldade = d;
    stats[materia][d]++;
  }

  // Balance adjustment pass
  const adj = balanceAdjustment(materia, cards, stats[materia]);
  totalAdjusted += adj;
  if (adj > 0) {
    console.log(`  ⚖️  ${materia}: ${adj} cards reclassificados para balanceamento`);
  }
}

// Collect examples AFTER adjustment
for (const materia of materias) {
  const cards = DATA[materia];
  for (const card of cards) {
    const d = card.dificuldade;
    if (examples[d].length < 5 && !examples[d].find(e => e.materia === materia)) {
      examples[d].push({ materia, id: card.id, pergunta: card.pergunta, dificuldade: d });
    }
  }
}

if (DRY_RUN) {
  console.log('\n📊 DISTRIBUIÇÃO DE DIFICULDADE POR MATÉRIA (DRY-RUN)\n');
  console.log('Matéria'.padEnd(25) + 'Fácil'.padEnd(10) + 'Média'.padEnd(10) + 'Difícil'.padEnd(10) + 'Total'.padEnd(10));
  console.log('-'.repeat(65));
  let totF = 0, totM = 0, totD = 0;
  for (const m of materias) {
    const s = stats[m];
    const t = s.facil + s.media + s.dificil;
    console.log(m.padEnd(25) + String(s.facil).padEnd(10) + String(s.media).padEnd(10) + String(s.dificil).padEnd(10) + String(t).padEnd(10));
    totF += s.facil; totM += s.media; totD += s.dificil;
  }
  console.log('-'.repeat(65));
  console.log('TOTAL'.padEnd(25) + String(totF).padEnd(10) + String(totM).padEnd(10) + String(totD).padEnd(10) + String(totF + totM + totD).padEnd(10));
  console.log(`\nPercentual: Fácil ${(totF/(totF+totM+totD)*100).toFixed(1)}% | Média ${(totM/(totF+totM+totD)*100).toFixed(1)}% | Difícil ${(totD/(totF+totM+totD)*100).toFixed(1)}%\n`);

  // ─── Balance check ──────────────────────────────────────────────────────
  console.log('🔍 VERIFICAÇÃO DE BALANÇO:');
  let unbalanced = [];
  for (const m of materias) {
    const s = stats[m];
    const t = s.facil + s.media + s.dificil;
    const pF = s.facil / t * 100;
    const pD = s.dificil / t * 100;
    // Flag if >70% in one tier or <5% in another
    if (pF > 70 || pD > 70 || pF < 5 || pD < 5) {
      unbalanced.push(m);
      console.log(`  ⚠️  ${m}: ${pF.toFixed(1)}% fácil, ${pD.toFixed(1)}% difícil — pode necessitar ajuste`);
    } else {
      console.log(`  ✅ ${m}: ${pF.toFixed(1)}% fácil, ${(s.media/t*100).toFixed(1)}% médio, ${pD.toFixed(1)}% difícil`);
    }
  }

  console.log(`\n📝 EXEMPLOS (5 de cada nível):\n`);
  for (const nivel of ['facil', 'media', 'dificil']) {
    console.log(`--- ${nivel.toUpperCase()} ---`);
    for (const ex of examples[nivel]) {
      console.log(`  [${ex.materia}] ${ex.id}: ${ex.pergunta.substring(0, 80)}...`);
    }
    console.log('');
  }

  console.log(`\n⚠️  Dry-run concluído. Nenhuma alteração foi feita.`);
  console.log(`   Execute com --apply para adicionar o campo "dificuldade" a todos os cards.`);
  process.exit(0);
}

// ─── Apply ────────────────────────────────────────────────────────────────────

// Backup
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.resolve(__dirname, '..', 'src', 'data', `banco-backup-dificuldade-${timestamp}.json`);
fs.writeFileSync(backupPath, JSON.stringify(DATA, null, 2), 'utf8');
console.log(`💾 Backup salvo em: ${backupPath}`);

// Write
fs.writeFileSync(BANCO_PATH, JSON.stringify(DATA, null, 2), 'utf8');
console.log(`✅ Campo "dificuldade" adicionado a todos os cards.`);

// Report
console.log('\n📊 DISTRIBUIÇÃO FINAL:\n');
let totF = 0, totM = 0, totD = 0;
for (const m of materias) {
  const s = stats[m];
  const t = s.facil + s.media + s.dificil;
  console.log(`  ${m}: ${s.facil} fácil, ${s.media} médio, ${s.dificil} difícil (${t} total)`);
  totF += s.facil; totM += s.media; totD += s.dificil;
}
console.log(`\n  TOTAL: ${totF} fácil, ${totM} médio, ${totD} difícil (${totF+totM+totD} cards)`);
console.log(`  Percentual: ${(totF/(totF+totM+totD)*100).toFixed(1)}% fácil | ${(totM/(totF+totM+totD)*100).toFixed(1)}% médio | ${(totD/(totF+totM+totD)*100).toFixed(1)}% difícil`);
