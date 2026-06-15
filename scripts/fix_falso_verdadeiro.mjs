import { readFileSync, writeFileSync } from "fs";

const data = JSON.parse(readFileSync("src/data/banco.json", "utf8"));
const cards = data.jurisprudencias || [];

let fixed = 0;
for (const c of cards) {
  for (const f of ["pergunta", "resposta", "dica", "topico"]) {
    const orig = c[f] || "";
    // Add hyphen before FALSO/VERDADEIRO when preceded by space
    // Avoid double-adding if already has " - FALSO"
    let v = orig.replace(/(?<!\s-\s)\s+(FALSO|VERDADEIRO)\b/g, " - $1");
    if (v !== orig) {
      c[f] = v;
      fixed++;
    }
  }
}

console.log("Fixed:", fixed, "fields");
writeFileSync("src/data/banco.json", JSON.stringify(data, null, 2) + "\n", "utf8");
console.log("Saved.");
