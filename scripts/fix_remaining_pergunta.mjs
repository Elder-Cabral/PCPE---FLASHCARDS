import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fix pergunta corruption
const fixPergunta = {
  'comp?em': 'compõem',
  'Jo?o': 'João',
  'Jo?o,': 'João,',
  'exist?ncia': 'existência',
  'import?ncia': 'importância',
  'jur?dica': 'jurídica',
  'jur?dicas': 'jurídicas',
  'consequ?ncias': 'consequências',
  '??es': 'ões',
  '?o,': 'ão,',
  'distinão?o com': 'distinção com',
  'ocorr?ncia': 'ocorrência',
  'quanto é': 'quanto à',
  'ões hipóteses': 'às hipóteses',
};

// Fix resposta corruption
const fixResposta = {
  'títulos) ?,': 'títulos),',
};

// Fix dica corruption 
const fixDica = {
  "' (? subordinada": "' (é subordinada",
};

const bancoPath = path.resolve(__dirname, '..', 'src', 'data', 'banco.json');
const banco = JSON.parse(fs.readFileSync(bancoPath, 'utf8'));
let fixed = 0;

banco.leg_estadual.forEach(c => {
  // Fix pergunta
  Object.entries(fixPergunta).forEach(([from, to]) => {
    if (c.pergunta && c.pergunta.includes(from)) {
      c.pergunta = c.pergunta.split(from).join(to);
      fixed++;
    }
  });
  // Fix resposta
  Object.entries(fixResposta).forEach(([from, to]) => {
    if (c.resposta && c.resposta.includes(from)) {
      c.resposta = c.resposta.split(from).join(to);
      fixed++;
    }
  });
  // Fix dica
  Object.entries(fixDica).forEach(([from, to]) => {
    if (c.dica && c.dica.includes(from)) {
      c.dica = c.dica.split(from).join(to);
      fixed++;
    }
  });
});

fs.writeFileSync(bancoPath, JSON.stringify(banco, null, 2), 'utf8');
console.log('Fixed', fixed, 'fields in banco.json');

// Also fix rewrite data
['leg_estadual'].forEach(subj => {
  const p = path.resolve(__dirname, '..', 'scripts', 'rewrite_data', subj + '.json');
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  let cnt = 0;
  if (data.rewrites) {
    data.rewrites.forEach(r => {
      [1, 2, 3].forEach(i => {
        if (r[i]) {
          let orig = r[i];
          Object.entries(fixPergunta).forEach(([from, to]) => {
            if (r[i] && r[i].includes(from)) {
              r[i] = r[i].split(from).join(to);
            }
          });
          Object.entries(fixResposta).forEach(([from, to]) => {
            if (r[i] && r[i].includes(from)) {
              r[i] = r[i].split(from).join(to);
            }
          });
          Object.entries(fixDica).forEach(([from, to]) => {
            if (r[i] && r[i].includes(from)) {
              r[i] = r[i].split(from).join(to);
            }
          });
          if (r[i] !== orig) cnt++;
        }
      });
    });
  }
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  console.log('Fixed', subj + '.json:', cnt, 'fields');
});

// Final verification
const b2 = JSON.parse(fs.readFileSync(bancoPath, 'utf8'));
let corruptedInWord = 0;
b2.leg_estadual.forEach(c => {
  ['pergunta', 'resposta', 'dica'].forEach(f => {
    if (c[f]) {
      // Check for ? inside words (not at end as question marks)
      const midWord = c[f].match(/[a-zA-Z]\?[a-zA-Z]/);
      if (midWord) {
        corruptedInWord++;
        if (corruptedInWord <= 3) {
          const idx = c[f].indexOf(midWord[0]);
          console.log('REMAINING:', c.id, f, c[f].substring(Math.max(0, idx - 5), idx + 10));
        }
      }
    }
  });
});
console.log('Corrupted ? inside words:', corruptedInWord);
console.log('Done');
