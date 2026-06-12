import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(__dirname, '..', 'src', 'data', 'banco.json');
const banco = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// ══════════════════════════════════════════════════════════════════════════════
// Load rewrite data from external JSON files
// ══════════════════════════════════════════════════════════════════════════════
const dataDir = path.resolve(__dirname, 'rewrite_data');
const matSubj = [
  'leg_estadual', 'dir_const', 'dir_adm',
  'dir_proc_penal', 'portugues', 'informatica',
  'raciocinio', 'contabilidade', 'estatistica'
];
let totalUpdated = 0, totalRemoved = 0;

matSubj.forEach(subj => {
  const dataPath = path.join(dataDir, subj + '.json');
  if (!fs.existsSync(dataPath)) {
    console.log(subj + ': no data file');
    return;
  }
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  if (!banco[subj]) {
    console.log('  WARN: subject ' + subj + ' not in banco.json');
    return;
  }
  const cards = banco[subj];
  const idx = {};
  cards.forEach((c, i) => idx[c.id] = i);

  if (data.rewrites) {
    data.rewrites.forEach(([id, pergunta, resposta, dica]) => {
      if (idx[id] !== undefined) {
        cards[idx[id]].pergunta = pergunta;
        cards[idx[id]].resposta = resposta;
        cards[idx[id]].dica = dica;
        totalUpdated++;
      } else {
        cards.push({ id, pergunta, resposta, dica });
        totalUpdated++;
      }
    });
  }
  if (data.removes) {
    data.removes.forEach(id => {
      if (idx[id] !== undefined) {
        cards.splice(idx[id], 1);
        totalRemoved++;
      }
    });
  }
  if (data.merges) {
    Object.entries(data.merges).forEach(([fromId, intoId]) => {
      const fi = cards.findIndex(c => c.id === fromId);
      if (fi !== -1) { cards.splice(fi, 1); totalRemoved++; }
    });
  }
  console.log(subj + ': ' + (data.rewrites?.length||0) + ' rewrites, ' + (data.removes?.length||0) + ' removes');
});

// Write back
fs.writeFileSync(filePath, JSON.stringify(banco, null, 2), 'utf8');
console.log('DONE. Updated: ' + totalUpdated + ', Removed: ' + totalRemoved);
