import { readFileSync } from "fs";
const data = JSON.parse(readFileSync("src/data/banco.json", "utf8"));
const v = data.jurisprudencias[67].pergunta;
console.log("Pergunta:", JSON.stringify(v));

const wrong = "l\u00edcita\u00e7\u00e3o";
const escaped = wrong.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
console.log("Wrong:", JSON.stringify(wrong));
console.log("Escaped:", JSON.stringify(escaped));

const re = new RegExp("\\b" + escaped + "\\b", "g");
console.log("Regex:", re);
console.log("Match:", re.test(v));

const re2 = new RegExp(escaped, "g");
console.log("Simple match:", re2.test(v));

const v2 = v.replace(re, "licita\u00e7\u00e3o");
console.log("After replace:", JSON.stringify(v2));
console.log("Was replaced:", v !== v2);
