import fs from "fs";
const b = JSON.parse(fs.readFileSync("src/data/banco.json", "utf8"));
const subs = ["raciocinio", "contabilidade", "informatica", "estatistica"];
subs.forEach(s => {
  if (b[s]) {
    console.log("\n=== " + s + ": " + b[s].length + " cards ===");
    b[s].forEach(c => {
      const pergunta = JSON.stringify(c.pergunta);
      const resposta = JSON.stringify(c.resposta || "").substring(0, 80);
      const dica = (c.dica || "");
      const dicaLen = dica.length;
      console.log("  [" + c.id + "] P: " + pergunta.substring(0, 100));
      console.log("          R: " + resposta);
      console.log("          Dica: " + dicaLen + " chars");
    });
  } else console.log(s + ": NOT FOUND");
});
