import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(__dirname, '..', 'src', 'data', 'banco.json');

let content = fs.readFileSync(filePath, 'utf8');
let total = 0;
const details = [];

function apply(from, to) {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'g');
  const matches = content.match(re);
  const count = matches ? matches.length : 0;
  if (count > 0) {
    total += count;
    details.push({ from, to, count });
    content = content.replace(re, to);
  }
}

// ─── DOUBLE-ENCODED (mojibake²) ─────────────────────────────────────────
// Portuguese accented chars: ÃƒÂX → single char
apply('ÃƒÂ©', 'é');
apply('ÃƒÂ£', 'ã');
apply('ÃƒÂ¡', 'á');
apply('ÃƒÂ³', 'ó');
apply('ÃƒÂº', 'ú');
apply('ÃƒÂ­', 'í');
apply('ÃƒÂ§', 'ç');
apply('ÃƒÂ´', 'ô');
apply('ÃƒÂª', 'ê');
apply('ÃƒÂµ', 'õ');
apply('ÃƒÂ¢', 'â');
apply('ÃƒÂ‰', 'É');

// Double-encoded special chars: Ã‚ÂX → single char
apply('Ã‚Â§', '§');
apply('Ã‚Âº', 'º');
apply('Ã‚Â°', '°');
apply('Ã‚Âª', 'ª');
apply('Ã‚Â´', '´');

// ─── SINGLE-ENCODED UPPERCASE (missed by first pass) ────────────────────
apply('Ã', 'Á');
apply('Ã', 'Í');
apply('Ãš', 'Ú');
apply('Ã‰', 'É');

// ─── SINGLE-ENCODED SPECIAL CHARS (ÂX → single char) ───────────────────
apply('Â§', '§');
apply('Âº', 'º');
apply('Â°', '°');
apply('Âª', 'ª');
// Remaining Â patterns that could be standalone
// (note: order matters - longer patterns already handled above)
// Â­ (soft hyphen, U+00AD) - often used as hyphen in Portuguese
apply('Â­', '­');
// Â´ (acute accent, U+00B4) - decorative/charset artifact
apply('Â´', '´');

// ─── WRITE FIXED FILE ────────────────────────────────────────────────────
fs.writeFileSync(filePath, content, 'utf8');

console.log('=== RELATÓRIO DE CORREÇÃO (2ª RODADA - DOUBLE ENCODING) ===\n');
let singleEncodeTotal = 0;
let doubleEncodeTotal = 0;
for (const d of details) {
  const isDouble = d.from.startsWith('Ãƒ') || d.from.startsWith('Ã‚');
  if (isDouble) doubleEncodeTotal += d.count;
  else singleEncodeTotal += d.count;
  console.log(`${d.from.padEnd(10)} -> ${d.to.padEnd(3)} : ${d.count} ocorrências`);
}
console.log(`\nSubtotal DOUBLE-ENCODED: ${doubleEncodeTotal} ocorrências`);
console.log(`Subtotal SINGLE-ENCODED (missed): ${singleEncodeTotal} ocorrências`);
console.log(`TOTAL 2ª rodada: ${total} ocorrências corrigidas`);
