import fs from "fs";
const b = JSON.parse(fs.readFileSync("src/data/banco.json", "utf8"));

const duplicates = {
  dir_adm: ["dir_adm_47", "dir_adm_96"],
  dir_proc_penal: ["dir_proc_penal_15"],
  portugues: ["portugues_20", "portugues_47", "portugues_expand_13"],
  informatica: ["informatica_115", "informatica_120", "informatica_132"],
  estatistica: ["estatistica_12"]
};

let total = 0;
Object.entries(duplicates).forEach(([subj, ids]) => {
  if (!b[subj]) return;
  ids.forEach(id => {
    const idx = b[subj].findIndex(c => c.id === id);
    if (idx !== -1) {
      b[subj].splice(idx, 1);
      total++;
      console.log(`Removed ${id} from ${subj}`);
    }
  });
});

fs.writeFileSync("src/data/banco.json", JSON.stringify(b, null, 2), "utf8");
console.log(`Done. Total removed: ${total}`);
