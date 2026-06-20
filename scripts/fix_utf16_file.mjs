import fs from 'fs';
import { TextDecoder } from 'util';

const src = process.argv[2] || 'reports/estatistica_camadas_lote1_output.json';
const dst = process.argv[3] || 'reports/lote1_clean.json';

const buf = fs.readFileSync(src);
const dec = new TextDecoder('utf-16le');
let text = dec.decode(buf);

// Strip BOM if present
if (text.charCodeAt(0) === 0xFEFF) {
  text = text.slice(1);
}

// Parse JSON
let data;
try {
  data = JSON.parse(text);
} catch (e) {
  console.error('JSON parse error:', e.message);
  process.exit(1);
}

// Write as UTF-8 without BOM
const output = JSON.stringify(data, null, 2);
fs.writeFileSync(dst, output, 'utf8');

console.log(`✓ ${data.length} cards salvos em ${dst}`);
