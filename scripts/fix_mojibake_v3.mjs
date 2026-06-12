/**
 * fix_mojibake_v3.mjs — Corrige mojibake (dupla codificação) em TODOS os campos
 * de texto do banco de flashcards (banco.json).
 *
 * Abordagem: varredura byte a byte.
 *   - `Ã` (U+00C3) + char 0x80–0xBF → decodifica como UTF-8 → caractere U+00XX
 *   - `Â` (U+00C2) + char 0x80–0xBF → decodifica como UTF-8 → caractere U+00XX
 * Repete até 3× para capturar dupla/tripla codificação.
 *
 * USO:
 *   node scripts/fix_mojibake_v3.mjs          # dry-run (mostra antes/depois)
 *   node scripts/fix_mojibake_v3.mjs --apply   # aplica correção
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BANCO_PATH = path.resolve(__dirname, '..', 'src', 'data', 'banco.json');
const DRY_RUN = !process.argv.includes('--apply');

// ─── Função de correção ──────────────────────────────────────────────────────

/** Aplica uma rodada de latin1→utf8 nos pares Ã/Â + continuation byte */
function fixRound(str) {
  const out = [];
  const chars = [...str]; // iterar por código Unicode, não byte
  let i = 0;
  while (i < chars.length) {
    const cp = chars[i].charCodeAt(0);
    // Ã (U+00C3) seguido de byte 0x80–0xBF → par UTF-8 2-byte
    if (cp === 0xC3 && i + 1 < chars.length) {
      const next = chars[i + 1].charCodeAt(0);
      if (next >= 0x80 && next <= 0xBF) {
        // Os dois formam uma sequência UTF-8 válida de 2 bytes
        const decoded = Buffer.from([cp, next], 'latin1').toString('utf8');
        out.push(decoded);
        i += 2;
        continue;
      }
    }
    // Â (U+00C2) seguido de byte 0x80–0xBF → par UTF-8 2-byte (C2 xx)
    if (cp === 0xC2 && i + 1 < chars.length) {
      const next = chars[i + 1].charCodeAt(0);
      if (next >= 0x80 && next <= 0xBF) {
        const decoded = Buffer.from([cp, next], 'latin1').toString('utf8');
        out.push(decoded);
        i += 2;
        continue;
      }
    }
    out.push(chars[i]);
    i++;
  }
  return out.join('');
}

/** Detecta se o texto AINDA contém padrões de mojibake */
function hasMojibake(str) {
  for (let i = 0; i < str.length; i++) {
    const cp = str.charCodeAt(i);
    if (cp === 0xC3 || cp === 0xC2) {
      if (i + 1 < str.length) {
        const next = str.charCodeAt(i + 1);
        if (next >= 0x80 && next <= 0xBF) return true;
      }
    }
  }
  return false;
}

/** Conta caracteres "limpos" (letras acentuadas portuguesas válidas) */
function countCleanChars(str) {
  const valid = /[áàâãéêíóôõúçüÁÀÂÃÉÊÍÓÔÕÚÇÜªº§°´\-–—]/g;
  const m = str.match(valid);
  return m ? m.length : 0;
}

/** Conta caracteres "sujos" (padrões de mojibake) */
function countDirtyChars(str) {
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    const cp = str.charCodeAt(i);
    if (cp === 0xC3 || cp === 0xC2) {
      if (i + 1 < str.length) {
        const next = str.charCodeAt(i + 1);
        if (next >= 0x80 && next <= 0xBF) count++;
      }
    }
  }
  return count;
}

function fixMojibake(str) {
  if (!str || typeof str !== 'string') return str;
  if (!hasMojibake(str)) return str;

  let current = str;
  let iterations = 0;
  const MAX_ITER = 3;

  while (iterations < MAX_ITER && hasMojibake(current)) {
    current = fixRound(current);
    iterations++;
  }

  // Validação: só aceita se reduziu sujeira
  if (countDirtyChars(current) < countDirtyChars(str) ||
      countCleanChars(current) > countCleanChars(str)) {
    return current;
  }
  return str;
}

// ─── Varredura de campos ─────────────────────────────────────────────────────

const TEXT_FIELDS = ['pergunta', 'resposta', 'dica', 'topico'];

/** Percorre recursivamente objetos/arrays aplicando fix nos campos de texto */
function scanAndFix(obj, pathStr = '', changes = []) {
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      scanAndFix(obj[i], `${pathStr}[${i}]`, changes);
    }
  } else if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (TEXT_FIELDS.includes(key) && typeof obj[key] === 'string') {
        const original = obj[key];
        const fixed = fixMojibake(original);
        if (fixed !== original) {
          changes.push({
            path: `${pathStr}.${key}`,
            before: original,
            after: fixed,
            materia: pathStr.split('.')[0].split('[')[0] || '?',
            tipo: key,
            id: obj.id || '?',
          });
          if (!DRY_RUN) obj[key] = fixed;
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        scanAndFix(obj[key], `${pathStr}.${key}`, changes);
      }
    }
  }
  return changes;
}

// ─── Varredura de padrões residuais (pós-fix) ────────────────────────────────

function scanResidual(content, label) {
  const results = [];
  const patterns = [
    { name: 'Ã + continuation byte', re: /[\u00c3][\x80-\xbf]/g },
    { name: 'Â + continuation byte', re: /[\u00c2][\x80-\xbf]/g },
    { name: 'â€ (em dash corrupto)', re: /â€/g },
    { name: 'ðŸ (emoji corrompido)', re: /ðŸ[\x80-\xbf]?/g },
    { name: 'â€™ (apóstrofo corrupto)', re: /â€™/g },
    { name: 'â€œ / â€ (aspas corromp.)', re: /â€[œ"]/g },
  ];
  for (const p of patterns) {
    let m;
    while ((m = p.re.exec(content)) !== null) {
      const start = Math.max(0, m.index - 20);
      const end = Math.min(content.length, m.index + m[0].length + 40);
      results.push({
        pattern: p.name,
        match: m[0],
        ctx: content.slice(start, end).replace(/\n/g, ' '),
      });
    }
  }
  return results;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

// Backup original
const originalJSON = fs.readFileSync(BANCO_PATH, 'utf8');

const data = JSON.parse(originalJSON);
const materias = Object.keys(data);

console.log(`📚 Matérias encontradas: ${materias.join(', ')}`);
let totalCards = 0;
for (const m of materias) totalCards += data[m].length;
console.log(`📇 Total de flashcards: ${totalCards}`);

// 1. Executa varredura e (dry-run ou apply)
const allChanges = [];
for (const materia of materias) {
  scanAndFix(data[materia], materia, allChanges);
}

// Agrupa por matéria
const byMateria = {};
for (const c of allChanges) {
  if (!byMateria[c.materia]) byMateria[c.materia] = [];
  byMateria[c.materia].push(c);
}

// Agrupa por tipo de campo
const byField = {};
for (const c of allChanges) {
  if (!byField[c.tipo]) byField[c.tipo] = 0;
  byField[c.tipo]++;
}

console.log('\n========================================');
console.log(`🔍 MODO: ${DRY_RUN ? 'DRY-RUN (sem alterações)' : 'APLICANDO CORREÇÕES'}`);
console.log(`📊 Total de campos com mojibake: ${allChanges.length}\n`);

// Mostra amostra (até 25)
const MAX_SHOW = 25;
for (let i = 0; i < Math.min(MAX_SHOW, allChanges.length); i++) {
  const c = allChanges[i];
  console.log(`--- Alteração ${i + 1} (${c.materia}.${c.tipo}) [id: ${c.id}] ---`);
  console.log(`  ANTES:  ${c.before}`);
  console.log(`  DEPOIS: ${c.after}\n`);
}

if (allChanges.length > MAX_SHOW) {
  console.log(`... e mais ${allChanges.length - MAX_SHOW} alterações`);
}

// Resumo por matéria
console.log('\n📋 RESUMO POR MATÉRIA:');
for (const m of materias) {
  const cnt = byMateria[m] ? byMateria[m].length : 0;
  if (cnt > 0) {
    console.log(`  ${m}: ${cnt} campos corrigidos`);
    for (const c of byMateria[m]) {
      console.log(`    [${c.tipo}] id=${c.id}: "${c.before}" → "${c.after}"`);
    }
  } else {
    console.log(`  ${m}: 0`);
  }
}

console.log('\n📋 RESUMO POR TIPO DE CAMPO:');
for (const [tipo, cnt] of Object.entries(byField)) {
  console.log(`  ${tipo}: ${cnt}`);
}

// ─── Dry-run: apenas mostra ───────────────────────────────────────────────────
if (DRY_RUN) {
  console.log('\n⚠️  Dry-run concluído. NENHUMA ALTERAÇÃO FOI SALVA.');
  console.log(`   Execute com --apply para aplicar as correções.`);

  // Verificação residual ANTES da correção
  console.log('\n🔍 VERIFICAÇÃO RESIDUAL (estado ATUAL):');
  const residual = scanResidual(originalJSON, 'banco.json');
  if (residual.length === 0) {
    console.log('  ✅ Nenhum padrão residual encontrado (além dos já contabilizados)');
  } else {
    console.log(`  ⚠️  ${residual.length} ocorrências residuais encontradas:`);
    for (const r of residual) {
      console.log(`    [${r.pattern}] "${r.match}" em: ${r.ctx}`);
    }
  }
  process.exit(0);
}

// ─── Aplicação ────────────────────────────────────────────────────────────────

// 2. Backup
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.resolve(__dirname, '..', 'src', 'data', `banco-backup-${timestamp}.json`);
fs.writeFileSync(backupPath, originalJSON, 'utf8');
console.log(`\n💾 Backup salvo em: ${backupPath}`);

// 3. Salva JSON corrigido
const fixedJSON = JSON.stringify(data, null, 2);
// Garantir UTF-8 sem BOM
fs.writeFileSync(BANCO_PATH, fixedJSON, 'utf8');
console.log(`✅ Arquivo corrigido salvo: ${BANCO_PATH}`);

// 4. Verificação residual PÓS-correção
const postContent = fs.readFileSync(BANCO_PATH, 'utf8');
console.log('\n🔍 VERIFICAÇÃO RESIDUAL (pós-correção):');
const residual = scanResidual(postContent, 'banco.json');
if (residual.length === 0) {
  console.log('  ✅ Nenhum padrão residual encontrado!');
} else {
  console.log(`  ⚠️  ${residual.length} ocorrências residuais encontradas:`);
  for (const r of residual) {
    console.log(`    [${r.pattern}] "${r.match}" em: ${r.ctx}`);
  }
}

console.log('\n========================================');
console.log('✅ CORREÇÃO CONCLUÍDA');
