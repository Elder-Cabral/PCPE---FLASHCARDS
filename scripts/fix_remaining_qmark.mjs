import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Additional patterns for remaining ? corruption
const fixMap = {
  // Single ? as standalone word = é or à
  ' ? ': ' é ',
  ' ? FALSO': ' é FALSO',
  ' ? PARCIAL': ' é PARCIAL',
  ' ? SECRET': ' à SECRET',
  ' ? verdadeira': ' é verdadeira',
  ' ? o ato': ' é o ato',
  ' ? um ': ' é um ',
  ' ? a ': ' é a ',
  ' ? penalidade': ' à penalidade',
  ' ? demissão': ' à demissão',
  ' ? Secretaria': ' à Secretaria',
  ' ? subordinada': ' é subordinada',
  ' ? exercício': ' ao exercício',
  ' ? adquirida': ' é adquirida',
  ' ? o retorno': ' é o retorno',
  ' ? o desloca': ' é o desloca',
  ' ? o desfazi': ' é o desfazi',
  ' ? a forma ': ' é a forma ',
  ' ? a penalidade': ' é a penalidade',
  ' ? a sigla': ' é a sigla',
  ' ? a Delegacia': ' é a Delegacia',
  ' ? CARGO + TITULAR': ' é CARGO + TITULAR',
  ' ? ': ' é ',

  // ? + ? = ? patterns (double question marks)
  'a??o': 'ação',
  'e??o': 'eção',
  'i??o': 'ição',
  'o??o': 'oção',
  'u??o': 'ução',
  '?6?': '§6º',
  '?4?': '§4º',
  '?1?': '§1º',
  '??o': 'ção',
  '??es': 'ções',

  // Specific word endings
  'unção?o': 'unção',
  'lação?o': 'lação',
  'ração?o': 'ração',
  'ução?o': 'ução',
  'ição?o': 'ição',
  'ação?o': 'ação',
  'zação?o': 'zação',
  'ssão?o': 'ssão',
  'dução?o': 'dução',
  'moção?o': 'moção',
  'eação?o': 'eação',

  // MNEM?NICO -> MNEMÔNICO
  'MNEM?NICO': 'MNEMÔNICO',
  'Mnem?nico': 'Mnemônico',

  // ? preceded by ç = ã
  'ç?o': 'ção',
  'ç?es': 'ções',

  // Other patterns  
  'exerc?cio': 'exercício',
  'pr?mio': 'prêmio',
  'licen?a': 'licença',
  'diferen?a': 'diferença',
  'est?vel': 'estável',
  'est?veis': 'estáveis',
  'servi?o': 'serviço',
  'v?nculo': 'vínculo',
  'n?mero': 'número',
  'n?vel': 'nível',
  'mudan?a': 'mudança',
  'advert?ncia': 'advertência',
  'capacita??o': 'capacitação',
  'administra??o': 'administração',
  'organiza??o': 'organização',
  'sindic?ncia': 'sindicância',
  'tr?fico': 'tráfico',
  'car?ter': 'caráter',
  'intelig?ncia': 'inteligência',
  'compet?ncia': 'competência',
  'hier?rquica': 'hierárquica',
  'autom?tica': 'automática',
  'pessoa?': 'pessoal',
  'prazo?': 'prazo',
  'natos?': 'natos',
  'provimento?': 'provimento',
  'policiais?': 'policiais',
  'função?o': 'função',
  'atribui??o': 'atribuição',
  'investiga??o': 'investigação',
  'prorroga??o': 'prorrogação',
  'altera??o': 'alteração',
  'gradua??o': 'graduação',
  'readapta??o': 'readaptação',
  'freq?ência': 'frequência',
  'audi?ncia': 'audiência',
};

function fixText(text) {
  if (!text) return text;
  const sortedKeys = Object.keys(fixMap).sort((a, b) => b.length - a.length);
  let result = text;
  sortedKeys.forEach(key => {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'gi');
    result = result.replace(re, match => {
      const val = fixMap[key];
      // Case-insensitive replacement preserving pattern
      if (match === key) return val;
      // All uppercase
      if (match === key.toUpperCase() && /[A-Z]/.test(key)) return val.toUpperCase();
      // First letter uppercase
      if (match[0] === key[0].toUpperCase()) 
        return val[0].toUpperCase() + val.slice(1);
      return val;
    });
  });
  return result;
}

// Apply to banco.json
const bancoPath = path.resolve(__dirname, '..', 'src', 'data', 'banco.json');
const banco = JSON.parse(fs.readFileSync(bancoPath, 'utf8'));
let fixed = 0;
let uncounted = 0;
Object.entries(banco).forEach(([section, cards]) => {
  cards.forEach(c => {
    ['pergunta', 'resposta', 'dica'].forEach(f => {
      if (c[f]) {
        const t0 = c[f];
        c[f] = fixText(c[f]);
        if (c[f] !== t0) fixed++;
      }
    });
  });
});
fs.writeFileSync(bancoPath, JSON.stringify(banco, null, 2), 'utf8');
console.log('Fixed banco.json:', fixed, 'fields');

// Also fix rewrite data files
['leg_estadual', 'dir_adm', 'dir_const'].forEach(subj => {
  const p = path.resolve(__dirname, '..', 'scripts', 'rewrite_data', subj + '.json');
  if (fs.existsSync(p)) {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    let cnt = 0;
    if (data.rewrites) {
      data.rewrites.forEach(r => {
        [1, 2, 3].forEach(i => {
          if (r[i]) {
            const t = r[i];
            r[i] = fixText(r[i]);
            if (r[i] !== t) cnt++;
          }
        });
      });
    }
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
    console.log('Fixed', subj + '.json:', cnt, 'fields');
  }
});

// Verify
const banco2 = JSON.parse(fs.readFileSync(bancoPath, 'utf8'));
const le = banco2.leg_estadual;
let stillHasQ = 0;
le.forEach(c => {
  ['resposta', 'dica'].forEach(f => {
    if (c[f] && c[f].includes('?')) stillHasQ++;
  });
});
console.log('Remaining ? in leg_estadual resposta/dica:', stillHasQ);
if (stillHasQ > 0) {
  le.forEach(c => {
    ['resposta', 'dica'].forEach(f => {
      if (c[f] && c[f].includes('?')) {
        const idx = c[f].indexOf('?');
        console.log('  REMAINING:', c.id, c[f].substring(Math.max(0,idx-15), idx+15));
      }
    });
  });
}

console.log('Done');
