import { readFileSync } from "fs";

const data = JSON.parse(readFileSync("src/data/banco.json", "utf8"));
const cards = data.jurisprudencias || [];

const requiredAccents = {
  jurisprudencia: "jurisprudência",
  jurisprudencias: "jurisprudências",
  ilicito: "ilícito",
  ilicitas: "ilícitas",
  ilicita: "ilícita",
  ilicitos: "ilícitos",
  inquerito: "inquérito",
  inqueritos: "inquéritos",
  suspeito: "suspeito",
  privado: "privado",
  valido: "válido",
  validos: "válidos",
  invalido: "inválido",
  invalidos: "inválidos",
  publico: "público",
  publicos: "públicos",
  publica: "pública",
  publicas: "públicas",
  delito: "delito",
  inocente: "inocente",
  culpado: "culpado",
  exclusao: "exclusão",
  inclusao: "inclusão",
  sessao: "sessão",
  secoes: "seções",
  secao: "seção",
  omissao: "omissão",
  omissoes: "omissões",
  comissao: "comissão",
  comissoes: "comissões",
  disposicao: "disposição",
  disposicoes: "disposições",
  fundamentacao: "fundamentação",
  autorizacao: "autorização",
  investigacao: "investigação",
  condenacao: "condenação",
  prescricao: "prescrição",
  nulidade: "nulidade",
  carater: "caráter",
  analise: "análise",
  analises: "análises",
  estavel: "estável",
  provavel: "provável",
  provaveis: "prováveis",
  responsavel: "responsável",
  responsaveis: "responsáveis",
  sumula: "súmula",
  sumulas: "súmulas",
  materia: "matéria",
  materias: "matérias",
  especie: "espécie",
  especies: "espécies",
  serie: "série",
  conteudo: "conteúdo",
  orgao: "órgão",
  orgaos: "órgãos",
  judiciario: "judiciário",
  necessario: "necessário",
  necessaria: "necessária",
  revisao: "revisão",
  execucao: "execução",
  atuacao: "atuação",
  obrigacao: "obrigação",
  obrigacoes: "obrigações",
  comunicacao: "comunicação",
  administracao: "administração",
  organizacao: "organização",
  delegado: "delegado",
  tipico: "típico",
  tipica: "típica",
  atipico: "atípico",
  generico: "genérico",
  generica: "genérica",
  especifico: "específico",
  especifica: "específica",
  intrinseco: "intrínseco",
  intrinseca: "intrínseca",
  extrinseco: "extrínseco",
  extrinseca: "extrínseca",
  silencio: "silêncio",
  oficio: "ofício",
  oficios: "ofícios",
  tribunal: "tribunal",
  nivel: "nível",
  niveis: "níveis",
  possivel: "possível",
  possiveis: "possíveis",
  impossivel: "impossível",
  impossiveis: "impossíveis",
  alcool: "álcool",
  tempestividade: "tempestividade",
  "ex officio": "ex officio",
  indiciado: "indiciado",
  indiciada: "indiciada",
  indiciados: "indiciados",
  agentes: "agentes",
  privacao: "privação",
  privacoes: "privações",
  "sub judice": "sub judice",
  "habeas corpus": "habeas corpus",
};

function normalize(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

let issues = [];
for (const c of cards) {
  for (const field of ["pergunta", "resposta", "dica", "topico"]) {
    const val = c[field] || "";
    const tokens = val.split(/(\s+|[.,;:!?()"'\[\]{}–-])/);
    for (const token of tokens) {
      const lower = token.replace(/[^a-záéíóúãõâêôçàèìòùäëïöüA-ZÁÉÍÓÚÃÕÂÊÔÇÀÈÌÒÙÄËÏÖÜ]/g, "").toLowerCase();
      if (!lower || lower.length < 3) continue;
      const norm = normalize(lower);

      for (const [incorrect, correct] of Object.entries(requiredAccents)) {
        if (incorrect === norm) {
          // Check if the current word already has accent
          const hasAccent = /[áéíóúãõâêôçàèìòùäëïöü]/i.test(lower);
          if (!hasAccent) {
            const correctLower = correct.toLowerCase();
            if (lower !== correctLower) {
              issues.push({
                id: c.id,
                field,
                word: token.trim(),
                correct,
                context: val.substring(Math.max(0, val.indexOf(token) - 20), val.indexOf(token) + 40).trim(),
              });
              break;
            }
          }
        }
      }
    }
  }
}

if (issues.length === 0) {
  console.log("✅ Nenhum problema de acentuação nos 80 cards de jurisprudências.");
} else {
  console.log(`❌ ${issues.length} problema(s) de acentuação encontrado(s):\n`);
  for (const iss of issues) {
    console.log(`  ${iss.id} [${iss.field}]`);
    console.log(`    Palavra: "${iss.word}" → "${iss.correct}"`);
    console.log(`    Contexto: ...${iss.context}...`);
    console.log();
  }
}
