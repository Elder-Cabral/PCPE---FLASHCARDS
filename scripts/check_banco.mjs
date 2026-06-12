import fs from "fs";
const b = JSON.parse(fs.readFileSync("src/data/banco.json", "utf8"));
const subs = ["leg_estadual","dir_const","dir_adm","dir_proc_penal","portugues","informatica","raciocinio_logico","contabilidade_geral","estatistica"];
subs.forEach(s => {
  if (b[s]) {
    console.log(s + ": " + b[s].length + " cards");
    if (s === "portugues") {
      const t = b[s].find(x => x.id === "portugues_14");
      if (t) console.log('  portugues_14 found: ' + JSON.stringify(t.pergunta).substring(0, 60));
      const ex = b[s].find(x => x.id === "portugues_expand_10");
      if (ex) console.log('  portugues_expand_10 found: ' + JSON.stringify(ex.pergunta).substring(0, 60));
    }
  } else console.log(s + ": NOT FOUND");
});
