import { readFileSync, writeFileSync } from "fs";

const path = "src/data/banco.json";
const raw = readFileSync(path, "utf8");
const data = JSON.parse(raw);

const cards = data.jurisprudencias;
if (!cards) {
  console.log("Matéria jurisprudencias não encontrada.");
  process.exit(1);
}

const fixes = [
  // topic field (always capitalized)
  { from: /\bJurisprudencias\b/g, to: "Jurisprudências" },

  // pergunta, resposta, dica
  { from: /\bpublica\b/g, to: "pública" },
  { from: /\bpublico\b/g, to: "público" },
  { from: /\bpublicos\b/g, to: "públicos" },
  { from: /\bPublica\b/g, to: "Pública" },
  { from: /\bPUBLICA\b/g, to: "PÚBLICA" },
  { from: /\bnecessaria\b/g, to: "necessária" },
  { from: /\bnecessario\b/g, to: "necessário" },
  { from: /\bespecie\b/g, to: "espécie" },
  { from: /\bespecifico\b/g, to: "específico" },
  { from: /\bESPECIFICO\b/g, to: "ESPECÍFICO" },
  { from: /\bespecifica\b/g, to: "específica" },
  { from: /\bgenerica\b/g, to: "genérica" },
  { from: /\boficio\b/g, to: "ofício" },
  { from: /\bcarater\b/g, to: "caráter" },
  { from: /\bCARATER\b/g, to: "CARÁTER" },
  { from: /\bestavel\b/g, to: "estável" },
  { from: /\bESTAVEL\b/g, to: "ESTÁVEL" },
  { from: /\bconteudo\b/g, to: "conteúdo" },
  { from: /\bjudiciario\b/g, to: "judiciário" },
  { from: /\bJudiciario\b/g, to: "Judiciário" },
  { from: /\bjurisprudencia\b/g, to: "jurisprudência" },
  { from: /\bexecucao\b/g, to: "execução" },
  { from: /\bExecucao\b/g, to: "Execução" },
  { from: /\bautorizacao\b/g, to: "autorização" },
  { from: /\bAUTORIZACAO\b/g, to: "AUTORIZAÇÃO" },
  { from: /\bilicita\b/g, to: "ilícita" },
  { from: /\bILICITA\b/g, to: "ILÍCITA" },
  { from: /\bilicitos\b/g, to: "ilícitos" },
  { from: /\bpossivel\b/g, to: "possível" },
  { from: /\bPOSSIVEL\b/g, to: "POSSÍVEL" },
  { from: /\bimpossivel\b/g, to: "impossível" },
  { from: /\bsumulas\b/g, to: "súmulas" },
  { from: /\bSUMULAS\b/g, to: "SÚMULAS" },
  { from: /\bmateria\b/g, to: "matéria" },
  { from: /\bprivacao\b/g, to: "privação" },
  { from: /\borganizacao\b/g, to: "organização" },
  { from: /\batuacao\b/g, to: "atuação" },
  { from: /\btransgressao\b/g, to: "transgressão" },
  { from: /\bfundamentacao\b/g, to: "fundamentação" },
  { from: /\bcondenacao\b/g, to: "condenação" },
  { from: /\brevisao\b/g, to: "revisão" },
  { from: /\binvestigacao\b/g, to: "investigação" },
];

let totalFixes = 0;
for (const card of cards) {
  for (const field of ["pergunta", "resposta", "dica", "topico"]) {
    let val = card[field] || "";
    let original = val;
    for (const { from, to } of fixes) {
      val = val.replace(from, to);
    }
    if (val !== original) {
      card[field] = val;
      totalFixes++;
    }
  }
}

console.log(`🔧 ${totalFixes} correções de acentuação aplicadas em ${cards.length} cards.`);

writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log("✅ banco.json atualizado.");
