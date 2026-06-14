import { readFileSync } from "fs";

const data = JSON.parse(readFileSync("src/data/banco.json", "utf8"));
const cards = data.jurisprudencias;

const patterns = [
  { re: /\bhipotese\b/gi, fix: "hipótese" },
  { re: /\bnotoria\b/gi, fix: "notória" },
  { re: /\bnotorio\b/gi, fix: "notório" },
  { re: /\bcompativel\b/gi, fix: "compatível" },
  { re: /\bcompativeis\b/gi, fix: "compatíveis" },
  { re: /\blícitação\b/gi, fix: "licitação" },
  { re: /\blícitar\b/gi, fix: "licitar" },
  { re: /\bincompativel\b/gi, fix: "incompatível" },
  { re: /\bexclusivamente\b/gi },
  { re: /\bnecessariamente\b/gi },
  { re: /\bindevidamente\b/gi },
];

let found = [];
for (const c of cards) {
  for (const f of ["pergunta", "resposta", "dica"]) {
    const v = c[f] || "";
    for (const p of patterns) {
      p.re.lastIndex = 0;
      let m;
      while ((m = p.re.exec(v)) !== null) {
        const ctx = v.substring(Math.max(0, m.index - 20), m.index + m[0].length + 40);
        found.push({ id: c.id, field: f, word: m[0], fix: p.fix || m[0], context: ctx });
      }
    }
  }
}

if (found.length === 0) {
  console.log("Nenhum problema adicional encontrado.");
} else {
  for (const f of found) {
    console.log(`${f.id} [${f.field}]: "${f.word}" -> "${f.fix}" | ...${f.context}...`);
  }
}
