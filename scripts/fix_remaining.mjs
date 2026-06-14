import { readFileSync, writeFileSync } from "fs";

const path = "src/data/banco.json";
const data = JSON.parse(readFileSync(path, "utf8"));
const cards = data.jurisprudencias;

let fixed = 0;

for (const card of cards) {
  for (const field of ["pergunta", "resposta", "dica"]) {
    let val = card[field] || "";
    let orig = val;

    // Direct replacements for known issues
    val = val.replace(/lícitação/g, "licitação");
    val = val.replace(/lícitar/g, "licitar");
    val = val.replace(/\bhipotese\b/g, "hipótese");
    val = val.replace(/\bhipoteses\b/g, "hipóteses");
    val = val.replace(/\bnotoria\b/g, "notória");
    val = val.replace(/\bnotorio\b/g, "notório");
    val = val.replace(/\bcompativel\b/g, "compatível");
    val = val.replace(/\bcompativeis\b/g, "compatíveis");

    // "e" → "é" before specific words (these are clearly the verb "ser")
    val = val.replace(/\be\s+(hipotese|hipótese|notoria|notória|compativel|compatível|lícit[ao]|licit[ao]|crime|dever|direito|possível|necessário|vedado|permitido|proibido)\b/gi,
      (m) => "é " + m.split(/\s+/).slice(1).join(" "));

    if (val !== orig) {
      card[field] = val;
      fixed++;
      console.log(`  ${card.id} [${field}]: fixed`);
    }
  }
}

console.log(`\n${fixed} campos corrigidos.`);
writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log("Salvo.");
