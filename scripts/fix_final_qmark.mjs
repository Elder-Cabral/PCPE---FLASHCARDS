import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fixRemaining(text) {
  if (!text) return text;
  let r = text;

  // Fix ? between spaces - determine if é or à based on context
  r = r.replace(/(\s)\?(\s)/g, (m, pre, post) => {
    const after = r.substring(r.indexOf(m) + m.length, r.indexOf(m) + m.length + 20);
    if (/^(a|à|Secretaria|SDS|penalidade|SDS)/i.test(after)) {
      return pre + 'à' + post;
    }
    return pre + 'é' + post;
  });

  // Fix ?X? -> §Xº
  r = r.replace(/\?(\d)\?/g, '§$1º');

  // Fix art. X? -> art. Xº
  r = r.replace(/(art\.\s*\d)\?/g, '$1º');

  // Fix ? at end of number (ordinal)
  r = r.replace(/(\d)\?(?!\w)/g, '$1º');

  // Fix words ending with ?s (plural)
  r = r.replace(/ção\?es/g, 'ções');
  r = r.replace(/gão\?es/g, 'gões');
  r = r.replace(/ção\?o/g, 'ção');

  // Fix specific patterns
  r = r.replace(/instalação\?es/g, 'instalações');
  r = r.replace(/instrução\?es/g, 'instruções');
  r = r.replace(/atribuição\?es/g, 'atribuições');
  r = r.replace(/infração\?es/g, 'infrações');
  r = r.replace(/promoção\?es/g, 'promoções');
  r = r.replace(/organização\?es/g, 'organizações');
  r = r.replace(/Correção\?O/g, 'Correção');
  r = r.replace(/Subordinação\?O/g, 'Subordinação');

  // Fix standalone ? before word
  r = r.replace(/perder\?\s+/g, 'perder o ');

  // Fix 5?3 -> 5x3
  r = r.replace(/5\?3/g, '5x3');

  // Fix ?? at start of dica
  r = r.replace(/^\?\?\s*/, '');

  // Fix ? before FALSO
  r = r.replace(/\?\s+FALSO/g, 'é FALSO');
  r = r.replace(/\?\s+FALS/g, 'é FALS');

  return r;
}

// Apply to banco.json
const bancoPath = path.resolve(__dirname, '..', 'src', 'data', 'banco.json');
const banco = JSON.parse(fs.readFileSync(bancoPath, 'utf8'));
let fixed = 0;

Object.entries(banco).forEach(([section, cards]) => {
  cards.forEach(c => {
    ['pergunta', 'resposta', 'dica'].forEach(f => {
      if (c[f]) {
        const n = fixRemaining(c[f]);
        if (n !== c[f]) {
          c[f] = n;
          fixed++;
        }
      }
    });
  });
});

fs.writeFileSync(bancoPath, JSON.stringify(banco, null, 2), 'utf8');
console.log('Fixed banco.json:', fixed, 'fields');

// Also fix rewrite data files
['leg_estadual'].forEach(subj => {
  const p = path.resolve(__dirname, '..', 'scripts', 'rewrite_data', subj + '.json');
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  let cnt = 0;
  if (data.rewrites) {
    data.rewrites.forEach(r => {
      [1, 2, 3].forEach(i => {
        if (r[i]) {
          const n = fixRemaining(r[i]);
          if (n !== r[i]) {
            r[i] = n;
            cnt++;
          }
        }
      });
    });
  }
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  console.log('Fixed', subj + '.json:', cnt, 'fields');
});

// Verify remaining
const b2 = JSON.parse(fs.readFileSync(bancoPath, 'utf8'));
let still = 0;
let lastFew = [];
b2.leg_estadual.forEach(c => {
  ['resposta', 'dica'].forEach(f => {
    if (c[f] && c[f].includes('?')) {
      still++;
      const idx = c[f].indexOf('?');
      lastFew.push(c.id + ': ' + c[f].substring(Math.max(0, idx - 10), idx + 10));
    }
  });
});
console.log('Remaining ? in leg_estadual:', still);
if (still > 0) {
  lastFew.forEach(l => console.log('  ' + l));
}
console.log('Done');
