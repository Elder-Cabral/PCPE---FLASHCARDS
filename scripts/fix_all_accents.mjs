import { readFileSync, writeFileSync } from "fs";

const path = "src/data/banco.json";
const raw = readFileSync(path, "utf8");
const data = JSON.parse(raw);

const cards = data.jurisprudencias;
if (!cards) { console.log("jurisprudencias not found"); process.exit(1); }

const fixes = {
  // user-reported
  alguem: "alguém",              fisico: "físico",
  fisica: "física",              fisicos: "físicos",

  // nao / tilde
  nao: "não",                    servico: "serviço",
  servicos: "serviços",          cobranca: "cobrança",
  forca: "força",                licenca: "licença",
  infracao: "infração",          infracoes: "infrações",
  Constituicao: "Constituição",  constituicao: "constituição",
  reflexao: "reflexão",          funcao: "função",
  funcoes: "funções",            sentenca: "sentença",
  sentencas: "sentenças",        presenca: "presença",
  audiencia: "audiência",        audiencias: "audiências",
  crenca: "crença",              tolerancia: "tolerância",
  confianca: "confiança",        esperanca: "esperança",
  importancia: "importância",    relevancia: "relevância",
  assistencia: "assistência",    advertencia: "advertência",
  suficiencia: "suficiência",    suficiente: "suficiente",
  insuficiente: "insuficiente",

  // -ção words
  atuacao: "atuação",            autorizacao: "autorização",
  fundamentacao: "fundamentação",investigacao: "investigação",
  condenacao: "condenação",      organizacao: "organização",
  administracao: "administração",comunicacao: "comunicação",
  obrigacao: "obrigação",        prescricao: "prescrição",
  disposicao: "disposição",      sessao: "sessão",
  secao: "seção",                transgressao: "transgressão",
  omissao: "omissão",            comissao: "comissão",
  exclusao: "exclusão",          inclusao: "inclusão",
  privacao: "privação",          revisao: "revisão",
  execucao: "execução",          indenizacao: "indenização",
  informacao: "informação",      participacao: "participação",
  manifestacao: "manifestação",  determinacao: "determinação",
  comprovacao: "comprovação",    classificacao: "classificação",
  demonstracao: "demonstração",  instauracao: "instauração",
  contratacao: "contratação",    fiscalizacao: "fiscalização",
  regulamentacao: "regulamentação", adequacao: "adequação",
  aprovacao: "aprovação",        anulacao: "anulação",
  revogacao: "revogação",        cassacao: "cassação",
  impugnacao: "impugnação",      declaracao: "declaração",
  intimacao: "intimação",        notificacao: "notificação",
  alteracao: "alteração",        situacao: "situação",
  conversao: "conversão",        permissao: "permissão",
  submissao: "submissão",        admissao: "admissão",
  remissao: "remissão",          transmissao: "transmissão",
  extincao: "extinção",          suspensao: "suspensão",
  atencao: "atenção",            intencao: "intenção",
  retencao: "retenção",          detencao: "detenção",
  obtencao: "obtenção",          manutencao: "manutenção",
  protecao: "proteção",          convencao: "convenção",
  extincao: "extinção",
  // plural forms
  atuacoes: "atuações",          autorizacoes: "autorizações",
  fundamentacoes: "fundamentações", investigacoes: "investigações",
  condenacoes: "condenações",    obrigacoes: "obrigações",
  prescricoes: "prescrições",    disposicoes: "disposições",
  sessoes: "sessões",            secoes: "seções",
  transgressoes: "transgressões",omissoes: "omissões",
  comissoes: "comissões",        privacoes: "privações",
  revisoes: "revisões",          execucoes: "execuções",
  sessoes: "sessões",

  // proparoxítonas
  publico: "público",            publica: "pública",
  publicos: "públicos",          publicas: "públicas",
  especifico: "específico",      especifica: "específica",
  especificos: "específicos",    especificas: "específicas",
  juridico: "jurídico",          juridica: "jurídica",
  juridicos: "jurídicos",        juridicas: "jurídicas",
  generico: "genérico",          generica: "genérica",
  genericos: "genéricos",        genericas: "genéricas",
  tipico: "típico",              tipica: "típica",
  tipicos: "típicos",            tipicas: "típicas",
  atipico: "atípico",            atipica: "atípica",
  valido: "válido",              valida: "válida",
  validos: "válidos",            validas: "válidas",
  invalido: "inválido",          invalida: "inválida",
  invalidos: "inválidos",        invalidas: "inválidas",
  necessario: "necessário",      necessaria: "necessária",
  necessarios: "necessários",    necessarias: "necessárias",
  arbitrario: "arbitrário",      arbitraria: "arbitrária",
  judiciario: "judiciário",      judiciaria: "judiciária",
  intrinseco: "intrínseco",      intrinseca: "intrínseca",
  extrinseco: "extrínseco",      extrinseca: "extrínseca",
  silencio: "silêncio",          inquerito: "inquérito",
  sumula: "súmula",              sumulas: "súmulas",
  materia: "matéria",            materias: "matérias",
  especie: "espécie",            especies: "espécies",
  oficio: "ofício",              orgao: "órgão",
  orgaos: "órgãos",              jurisprudencia: "jurisprudência",
  jurisprudencias: "jurisprudências",
  analise: "análise",            analises: "análises",
  vitima: "vítima",              vitimas: "vítimas",
  ultima: "última",              ultimo: "último",
  umico: "único",                umica: "única",
  pratica: "prática",            pratico: "prático",
  critico: "crítico",            critica: "crítica",
  logico: "lógico",              logica: "lógica",
  etico: "ético",                etica: "ética",
  politico: "político",          politica: "política",
  teorico: "teórico",            teorica: "teórica",
  economico: "econômico",        economica: "econômica",
  eletronico: "eletrônico",      eletronica: "eletrônica",
  sistemico: "sistêmico",        sistemica: "sistêmica",
  academico: "acadêmico",        academica: "acadêmica",
  legítimo: "legítimo",          legitima: "legítima",
  legitimo: "legítimo",          legitima: "legítima",
  idoneo: "idôneo",              idonea: "idônea",
  momentaneo: "momentâneo",      momentanea: "momentânea",
  simultaneo: "simultâneo",      simultanea: "simultânea",
  espontaneo: "espontâneo",      espontanea: "espontânea",
  contemporaneo: "contemporâneo", contemporanea: "contemporânea",
  indigena: "indígena",          indigenas: "indígenas",
  subito: "súbito",              subita: "súbita",
  lícito: "lícito",              licito: "lícito",
  ilícito: "ilícito",            ilicito: "ilícito",
  inopino: "inopinado",

  // paroxítonas (l, r, ps, x, um, us, n, ão)
  estavel: "estável",            estaveis: "estáveis",
  provavel: "provável",          provaveis: "prováveis",
  responsavel: "responsável",    responsaveis: "responsáveis",
  possivel: "possível",          possiveis: "possíveis",
  impossivel: "impossível",      impossiveis: "impossíveis",
  incrivel: "incrível",          incriveis: "incríveis",
  nivel: "nível",                niveis: "níveis",
  carater: "caráter",            caracteres: "caracteres",
  facil: "fácil",                faceis: "fáceis",
  dificil: "difícil",            dificeis: "difíceis",
  util: "útil",                  uteis: "úteis",
  inutil: "inútil",              inuteis: "inúteis",

  // hiato
  conteudo: "conteúdo",          saude: "saúde",
  juizo: "juízo",                juizes: "juízes",
  pais: "país",                  paises: "países",
  raiz: "raiz",                  raizes: "raízes",
  proprio: "próprio",            propria: "própria",
  serie: "série",                series: "séries",
  beneficios: "benefícios",      beneficio: "benefício",
  industria: "indústria",        industrias: "indústrias",
  presidio: "presídio",          presidios: "presídios",
  indicio: "indício",            indicios: "indícios",
  policia: "polícia",            policias: "polícias",

  // miscellaneous
  tambem: "também",              parabens: "parabéns",
  licita: "lícita",              licito: "lícito",
  ilicita: "ilícita",            ilícita: "ilícita",
  ilicito: "ilícito",
  mae: "mãe",                    maes: "mães",
  irma: "irmã",                  irmaos: "irmãos",
  alem: "além",

  // additional fixes for cards 67-68
  hipotese: "hipótese",
  hipoteses: "hipóteses",
  notoria: "notória",
  notorio: "notório",
  notorias: "notórias",
  notorios: "notórios",
  compativel: "compatível",
  compativeis: "compatíveis",
  incompativel: "incompatível",
  lícitação: "licitação",
  lícitar: "licitar",
  lícitacao: "licitação",
};

// Remove entries where key === value (no-op)
for (const k of Object.keys(fixes)) {
  if (k === fixes[k]) delete fixes[k];
}

function fixDictionary(text) {
  const entries = Object.entries(fixes).sort((a, b) => b[0].length - a[0].length);
  for (const [wrong, correct] of entries) {
    const re = new RegExp("\\b" + wrong.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g");
    text = text.replace(re, correct);
  }
  return text;
}

function fixVerbE(text) {
  // "não e" → "não é" (dictionary already fixes "nao" → "não")
  text = text.replace(/\bnão\s+e\b/gi, (m) => m.replace(/\be\b/i, "é"));

  // "e" before predicative adjectives
  const predWords = [
    "lícit[oa]s?", "ilícit[oa]s?", "possível", "impossível",
    "necessári[oa]s?", "obrigatóri[oa]s?", "vedad[oa]s?",
    "permitid[oa]s?", "proibid[oa]s?", "cabível", "cabíveis",
    "aplicável", "aplicáveis", "constitucional", "inconstitucional",
    "válid[oa]s?", "inválid[oa]s?", "nul[oa]s?", "devid[oa]s?",
    "exigível", "exigíveis", "efetiv[oa]s?", "possível", "possíveis",
    "públic[oa]s?", "privad[oa]s?", "vedad[oa]s?", "permitid[oa]s?",
  ];
  for (const pat of predWords) {
    text = text.replace(new RegExp("\\b(e|E)\\s+(" + pat + ")\\b", "g"),
      (m, e, rest) => (e === "E" ? "É" : "é") + " " + rest);
  }

  // "e" before article + noun: e crime, e dever, e direito, etc.
  text = text.replace(
    /\b(e|E)\s+(crime|dever|direito|função|funções|regra|regras|exceção|exceções|ato|atos|fato|fatos|medida|medidas|hipótese|hipóteses|caso|casos|pressuposto|pressupostos|poder|poderes|obrigação|obrigações)\b/gi,
    (m, e, rest) => (e === "E" ? "É" : "é") + " " + rest);

  // "e" after punctuation or at start
  text = text.replace(/([.;!?])\s+e\s+/gi, "$1 É ");
  text = text.replace(/^E\s+/gm, "É ");

  return text;
}

let totalFixes = 0;
for (const card of cards) {
  for (const field of ["pergunta", "resposta", "dica", "topico"]) {
    const original = card[field] || "";
    let val = original;
    val = fixDictionary(val);
    if (field !== "topico") val = fixVerbE(val);
    if (val !== original) {
      card[field] = val;
      totalFixes++;
    }
  }
}

console.log(`🔧 ${totalFixes} campos corrigidos em ${cards.length} cards.`);
writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log("✅ banco.json atualizado.");
