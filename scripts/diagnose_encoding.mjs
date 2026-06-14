import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(__dirname, '..', 'src', 'data', 'banco.json');
const content = fs.readFileSync(filePath, 'utf8');

// Patterns that indicate single-layer mojibake (UTF-8 bytes read as Latin-1)
const singlePatterns = [
  /\u00c3[ \xA0-\xFF]/g,  // Ã followed by NBSP or accented Latin-1 chars
  /\u00c2[ \xA0-\xBF]/g,  // Â followed by NBSP or symbols
];

// Double-encoded patterns
const doublePatterns = [
  /\u00c3\u0192[\u02c6-\u02dc]/g,  // ÃƒÂ followed by various
  /\u00c3\u201a/g,                   // Ã‚
];

let singleCount = 0;
let doubleCount = 0;
const singleExamples = [];
const doubleExamples = [];
const singleUnique = new Set();

let m;
for (const re of singlePatterns) {
  while ((m = re.exec(content)) !== null) {
    singleCount++;
    singleUnique.add(m[0]);
    if (singleExamples.length < 25) {
      const start = Math.max(0, m.index - 25);
      const end = Math.min(content.length, m.index + m[0].length + 60);
      const ctx = content.slice(start, end).replace(/\n/g, ' ').replace(/\r/g, '');
      singleExamples.push({ match: m[0], ctx });
    }
  }
}

for (const re of doublePatterns) {
  while ((m = re.exec(content)) !== null) {
    doubleCount++;
    if (doubleExamples.length < 10) {
      const start = Math.max(0, m.index - 25);
      const end = Math.min(content.length, m.index + m[0].length + 60);
      const ctx = content.slice(start, end).replace(/\n/g, ' ').replace(/\r/g, '');
      doubleExamples.push({ match: m[0], ctx });
    }
  }
}

console.log('=== DIAGNÓSTICO DE MOJIBAKE NO banco.json ===\n');
console.log(`Total de ocorrências single-layer: ${singleCount}`);
console.log(`Total de ocorrências double-layer: ${doubleCount}`);
console.log(`Padrões únicos single-layer: ${[...singleUnique].map(s => JSON.stringify(s)).join(', ')}`);
console.log('');

if (singleExamples.length > 0) {
  console.log('--- Amostras single-layer (10 primeiras) ---');
  for (let i = 0; i < Math.min(10, singleExamples.length); i++) {
    console.log(`  [${singleExamples[i].match}] ${singleExamples[i].ctx}`);
  }
}
if (doubleExamples.length > 0) {
  console.log('--- Amostras double-layer (5 primeiras) ---');
  for (let i = 0; i < Math.min(5, doubleExamples.length); i++) {
    console.log(`  [${doubleExamples[i].match}] ${doubleExamples[i].ctx}`);
  }
}

// Also scan for clean Portuguese to understand what's correct vs corrupt
const cleanPortuguese = /[áàâãéêíóôõúçüÁÀÂÃÉÊÍÓÔÕÚÇÜ]/g;
let cleanCount = 0;
while (cleanPortuguese.exec(content) !== null) cleanCount++;
console.log(`\nTotal de caracteres acentuados CORRETOS (já fixos): ${cleanCount}`);
