import { readFileSync } from "fs";

const data = JSON.parse(readFileSync("src/data/banco.json", "utf8"));
const card = data.jurisprudencias[67];
const val = card.pergunta;

console.log("Text:", JSON.stringify(val));

// Exact same logic as fix_all_accents.mjs
const fixes = {
  "l\u00edcita\u00e7\u00e3o": "licita\u00e7\u00e3o",
};

for (const [wrong, correct] of Object.entries(fixes)) {
  const escaped = wrong.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  console.log("Wrong:", JSON.stringify(wrong));
  console.log("Escaped:", JSON.stringify(escaped));
  const re = new RegExp("\\b" + escaped + "\\b", "g");
  console.log("Regex:", re);

  const matches = val.match(re);
  console.log("Matches:", matches);

  const result = val.replace(re, correct);
  console.log("Result:", JSON.stringify(result));
  console.log("Changed:", val !== result);
}
