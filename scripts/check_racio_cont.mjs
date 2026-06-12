import fs from "fs";
const b = JSON.parse(fs.readFileSync("src/data/banco.json", "utf8"));
["raciocinio", "contabilidade"].forEach(s => {
  if (b[s]) {
    console.log("\n=== " + s + ": " + b[s].length + " cards ===");
    b[s].forEach(c => {
      console.log("  [" + c.id + "] " + JSON.stringify(c.pergunta).substring(0, 100));
      console.log("    Dica: " + (c.dica || "").length + " chars | Resp: " + JSON.stringify(c.resposta || "").substring(0, 60));
    });
  } else console.log(s + ": NOT FOUND");
});
