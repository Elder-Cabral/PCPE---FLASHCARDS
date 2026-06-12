import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANCO_PATH = resolve(__dirname, "../src/data/banco.json");

// ─── Normalização de texto ───────────────────────────────────────────────────

function normalize(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Levenshtein distance ────────────────────────────────────────────────────

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// ─── Leitura do banco ────────────────────────────────────────────────────────

function loadBanco() {
  const raw = readFileSync(BANCO_PATH, "utf-8");
  return JSON.parse(raw);
}

function flattenCards(data) {
  const cards = [];
  for (const [materia, lista] of Object.entries(data)) {
    for (const card of lista) {
      cards.push({ ...card, materia });
    }
  }
  return cards;
}

// ─── Validações ───────────────────────────────────────────────────────────────

let hasErrors = false;
let hasWarnings = false;

function error(msg, card) {
  hasErrors = true;
  const loc = card ? `  [${card.materia}] ${card.id}: ` : "  ";
  console.error(`  ERRO  ${loc}${msg}`);
}

function warn(msg, cardA, cardB, sim) {
  hasWarnings = true;
  const simPct = sim !== undefined ? ` (similaridade: ${(sim * 100).toFixed(1)}%)` : "";
  console.warn(
    `  ATENÇÃO  "${cardA.id}" <-> "${cardB.id}"${simPct}\n           ${msg}`
  );
}

function checkDuplicateIds(cards) {
  const ids = new Map();
  for (const card of cards) {
    if (ids.has(card.id)) {
      error(`ID duplicado: "${card.id}" (já em ${ids.get(card.id).materia})`, card);
    }
    ids.set(card.id, card);
  }
}

function checkDuplicateQuestions(cards) {
  const seen = new Map();
  for (const card of cards) {
    const key = normalize(card.pergunta);
    if (seen.has(key)) {
      error(`Pergunta duplicada (exata): "${card.pergunta.substring(0, 60)}..."`, card);
      error(`  Primeira ocorrência: "${seen.get(key).id}"`, seen.get(key));
    }
    seen.set(key, card);
  }
}

function checkSimilarQuestions(cards) {
  const normalized = cards.map((c) => ({ card: c, norm: normalize(c.pergunta) }));
  const flagged = new Set();

  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const a = normalized[i];
      const b = normalized[j];
      const sim = similarity(a.norm, b.norm);

      if (sim >= 0.85 && !flagged.has(`${a.card.id}-${b.card.id}`)) {
        flagged.add(`${a.card.id}-${b.card.id}`);
        flagged.add(`${b.card.id}-${a.card.id}`);
        warn(
          `Perguntas com ${sim >= 0.95 ? "ALTÍSSIMA" : "ALTA"} similaridade`,
          a.card,
          b.card,
          sim
        );
        warn(
          `  Pergunta A: "${a.card.pergunta.substring(0, 80)}..."`,
          a.card,
          a.card
        );
        warn(
          `  Pergunta B: "${b.card.pergunta.substring(0, 80)}..."`,
          b.card,
          b.card
        );
      }
    }
  }
}

function checkMissingFields(cards) {
  for (const card of cards) {
    if (!card.pergunta || !card.pergunta.trim())
      error(`Campo "pergunta" vazio`, card);
    if (!card.resposta || !card.resposta.trim())
      error(`Campo "resposta" vazio`, card);
    if (!card.topico || !card.topico.trim())
      error(`Campo "topico" vazio`, card);
    if (!card.id || !card.id.trim())
      error(`Campo "id" vazio ou inválido`, card);
  }
}

// ─── Verificação de encoding (mojibake) ───────────────────────────────────────

const MOJIBAKE_RE = /Ã[^a-zA-Z0-9\sÂ«Â»]|Â[^a-zA-Z0-9\s]/;

function checkEncoding(cards) {
  const raw = readFileSync(BANCO_PATH, "utf-8");
  const corrupted = raw.match(MOJIBAKE_RE);
  if (corrupted) {
    const uniq = [...new Set(corrupted)].sort();
    for (const pat of uniq) {
      const count = (raw.match(new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      error(`Encoding corrompido (mojibake) na string "${pat}" — ${count}x. Execute scripts/fix_encoding_all.mjs para corrigir.`);
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log("\n🔍  Validando flashcards em src/data/banco.json...\n");

  let data;
  try {
    data = loadBanco();
  } catch (err) {
    console.error(`  ERRO FATAL: Não foi possível ler banco.json — ${err.message}`);
    process.exit(1);
  }

  const cards = flattenCards(data);
  console.log(`  Total de flashcards: ${cards.length}\n`);

  console.log("  ─── Verificando IDs duplicados ───");
  checkDuplicateIds(cards);

  console.log("  ─── Verificando perguntas duplicadas (exatas) ───");
  checkDuplicateQuestions(cards);

  console.log("  ─── Verificando perguntas similares ───");
  checkSimilarQuestions(cards);

  console.log("  ─── Verificando campos obrigatórios ───");
  checkMissingFields(cards);

  console.log("  ─── Verificando encoding (mojibake) ───");
  checkEncoding(cards);

  console.log("");

  if (hasErrors) {
    console.error(`  ❌  ${hasErrors ? "ERROS encontrados" : ""}${hasErrors && hasWarnings ? " e " : ""}${hasWarnings ? "ATENÇÕES" : ""}`);
    process.exit(1);
  }

  if (hasWarnings) {
    console.warn(`  ⚠️  Nenhum erro, mas ${hasWarnings} atenções foram emitidas. Revise antes de commitar.`);
    process.exit(0);
  }

  console.log("  ✅  Nenhum problema encontrado. Banco de dados OK!");
  process.exit(0);
}

main();
