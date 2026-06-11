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

  banco[materia].push(...cards);
  totalInserted += cards.length;
  console.log(`[OK] ${materia}: +${cards.length} cards (total: ${banco[materia].length})`);
}

fs.writeFileSync(bancoPath, JSON.stringify(banco, null, 2), 'utf8');
console.log(`\nTotal inserted: ${totalInserted} cards`);
