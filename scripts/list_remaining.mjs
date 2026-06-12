import fs from "fs";
const b = JSON.parse(fs.readFileSync("src/data/banco.json", "utf8"));
const subs = ["informatica", "raciocinio_logico", "contabilidade_geral", "estatistica"];
subs.forEach((s) => {
  if (b[s]) {
    console.log(s + ": " + b[s].length + " cards");
    b[s].forEach((c) => console.log("  " + c.id + ": " + JSON.stringify(c.pergunta).substring(0, 120)));
  } else console.log(s + ": NOT FOUND");
});
