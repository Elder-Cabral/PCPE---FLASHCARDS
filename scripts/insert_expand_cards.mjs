import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bancoPath = path.resolve(__dirname, '..', 'src', 'data', 'banco.json');

const MAPPING = {
  'dir_const': 'dir_const_expand_cards.json',
  'dir_adm': 'dir_adm_expand_cards.json',
  'dir_penal': 'dir_penal_expand_cards.json',
  'dir_proc_penal': 'dir_proc_penal_expand_cards.json',
  'portugues': 'portugues_expand_cards.json',
  'raciocinio': 'raciocinio_expand_cards.json',
  'contabilidade': 'contabilidade_expand_cards.json',
  'estatistica': 'estatistica_expand_cards.json',
  'leg_estadual': 'leg_estadual_expand_cards.json',
  'informatica': 'informatica_expand_cards.json',
};

// ─── Função de correção de mojibake (fix_mojibake_v3 simplificado) ────────────
// Aplica latin1→utf8 byte a byte para corrigir dupla codificação.
const TEXT_FIELDS = ['pergunta', 'resposta', 'dica', 'topico'];

function fixRound(str) {
  const out = [];
  const chars = [...str];
  let i = 0;
  while (i < chars.length) {
    const cp = chars[i].charCodeAt(0);
    if (cp === 0xC3 && i + 1 < chars.length) {
      const next = chars[i + 1].charCodeAt(0);
      if (next >= 0x80 && next <= 0xBF) {
        out.push(Buffer.from([cp, next], 'latin1').toString('utf8'));
        i += 2;
        continue;
      }
    }
    if (cp === 0xC2 && i + 1 < chars.length) {
      const next = chars[i + 1].charCodeAt(0);
      if (next >= 0x80 && next <= 0xBF) {
        out.push(Buffer.from([cp, next], 'latin1').toString('utf8'));
        i += 2;
        continue;
      }
    }
    out.push(chars[i]);
    i++;
  }
  return out.join('');
}

function hasMojibake(str) {
  for (let i = 0; i < str.length; i++) {
    const cp = str.charCodeAt(i);
    if ((cp === 0xC3 || cp === 0xC2) && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0x80 && next <= 0xBF) return true;
    }
  }
  return false;
}

function fixMojibake(str) {
  if (!str || typeof str !== 'string' || !hasMojibake(str)) return str;
  let current = str;
  let iterations = 0;
  while (iterations < 3 && hasMojibake(current)) {
    current = fixRound(current);
    iterations++;
  }
  return current;
}

function fixAllTextFields(obj) {
  if (Array.isArray(obj)) {
    for (const item of obj) fixAllTextFields(item);
  } else if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (TEXT_FIELDS.includes(key) && typeof obj[key] === 'string') {
        obj[key] = fixMojibake(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        fixAllTextFields(obj[key]);
      }
    }
  }
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
}

const bancoRaw = fs.readFileSync(bancoPath, 'utf8');
const banco = JSON.parse(stripBom(bancoRaw));

let totalInserted = 0;

for (const [materia, filename] of Object.entries(MAPPING)) {
  const filepath = path.resolve(__dirname, '..', filename);
  if (!fs.existsSync(filepath)) {
    console.log(`[SKIP] ${filename} not found`);
    continue;
  }

  const raw = fs.readFileSync(filepath, 'utf8');
  const cards = JSON.parse(stripBom(raw));

  if (!Array.isArray(cards)) {
    console.log(`[SKIP] ${filename} is not an array`);
    continue;
  }

  if (!banco[materia]) {
    console.log(`[ERROR] Materia '${materia}' not found in banco.json`);
    continue;
  }

  // Aplica correção de encoding NOS NOVOS CARDS antes de inserir
  fixAllTextFields(cards);

  banco[materia].push(...cards);
  totalInserted += cards.length;
  console.log(`[OK] ${materia}: +${cards.length} cards (total: ${banco[materia].length})`);
}

// Aplica correção de encoding em TODO o banco (inclusive cards existentes)
fixAllTextFields(banco);

fs.writeFileSync(bancoPath, JSON.stringify(banco, null, 2), 'utf8');
console.log(`\nTotal inserted: ${totalInserted} cards`);
