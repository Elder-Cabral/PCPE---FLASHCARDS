import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANCO_PATH = resolve(__dirname, "../src/data/banco.json");
const REPORTS_DIR = resolve(__dirname, "../reports");
const BANCO_RELATIVE = "src/data/banco.json";

// ─── Normalização ─────────────────────────────────────────────────────────────

function normalize(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Levenshtein ──────────────────────────────────────────────────────────────

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

// ─── Leitura ──────────────────────────────────────────────────────────────────

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

// ─── Detecta se banco.json foi alterado ───────────────────────────────────────

function bancoAlterado() {
  try {
    const saida = execSync("git diff --name-only HEAD", { encoding: "utf-8", cwd: resolve(__dirname, "..") });
    return saida.split("\n").map(s => s.trim()).includes(BANCO_RELATIVE);
  } catch {
    return true;
  }
}

// ─── Validações ───────────────────────────────────────────────────────────────

const issues = [];

function addIssue(tipo, gravidade, msg, detalhes = {}) {
  issues.push({ tipo, gravidade, msg, ...detalhes });
}

function checkDuplicateIds(cards) {
  const ids = new Map();
  for (const card of cards) {
    if (ids.has(card.id)) {
      addIssue("ID duplicado", "erro", `"${card.id}" (já em ${ids.get(card.id).materia})`, { card });
    }
    ids.set(card.id, card);
  }
}

function checkDuplicateQuestions(cards) {
  const seen = new Map();
  for (const card of cards) {
    const key = normalize(card.pergunta);
    if (seen.has(key)) {
      addIssue("Pergunta duplicada (exata)", "erro", `"${card.pergunta.substring(0, 80)}..."`, {
        card, firstId: seen.get(key).id
      });
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
        addIssue("Perguntas similares", "atencao", `${(sim * 100).toFixed(1)}%`, {
          idA: a.card.id, idB: b.card.id,
          materiaA: a.card.materia, materiaB: b.card.materia,
          perguntaA: a.card.pergunta, perguntaB: b.card.pergunta,
          similaridade: sim
        });
      }
    }
  }
}

function checkMissingFields(cards) {
  for (const card of cards) {
    if (!card.pergunta || !card.pergunta.trim())
      addIssue("Campo obrigatório vazio", "erro", `"pergunta" vazio em ${card.id}`, { card });
    if (!card.resposta || !card.resposta.trim())
      addIssue("Campo obrigatório vazio", "erro", `"resposta" vazio em ${card.id}`, { card });
    if (!card.topico || !card.topico.trim())
      addIssue("Campo obrigatório vazio", "erro", `"topico" vazio em ${card.id}`, { card });
    if (!card.id || !card.id.trim())
      addIssue("Campo obrigatório vazio", "erro", `"id" vazio ou inválido`, { card });
  }
}

function checkEncoding(cards) {
  const raw = readFileSync(BANCO_PATH, "utf-8");
  const MOJIBAKE_RE = /\u00c3[\x80-\xbf]|\u00c2[\x80-\xbf]/g;
  const corrupted = raw.match(MOJIBAKE_RE);
  if (corrupted) {
    const uniq = [...new Set(corrupted)].sort();
    for (const pat of uniq) {
      const count = (raw.match(new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      addIssue("Encoding corrompido (mojibake)", "erro", `"${pat}" — ${count}x. Execute node scripts/fix_mojibake_v3.mjs --apply`, {});
    }
  }
}

// ─── Geração de relatório .md ─────────────────────────────────────────────────

function generateReport(cardsCount) {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dateStr = now.toLocaleString("pt-BR", { timeZone: "America/Recife" });
  const filename = `validacao-${timestamp}.md`;
  const filepath = join(REPORTS_DIR, filename);

  const erros = issues.filter(i => i.gravidade === "erro");
  const atencao = issues.filter(i => i.gravidade === "atencao");
  const similaridade = issues.filter(i => i.tipo === "Perguntas similares");

  let md = "";
  md += `# Relatório de Validação de Flashcards\n\n`;
  md += `**Data:** ${dateStr}  \n`;
  md += `**Total de flashcards:** ${cardsCount}  \n`;
  md += `**Erros:** ${erros.length}  \n`;
  md += `**Atenções (similaridade):** ${atencao.length}\n\n`;
  md += `---\n\n`;

  // ─── Erros ───
  if (erros.length > 0) {
    md += `## ❌ Erros Encontrados\n\n`;
    for (const e of erros) {
      md += `- **[${e.tipo}]** ${e.msg}\n`;
    }
    md += `\n---\n\n`;
  }

  // ─── Similaridade: sumário por matéria ───
  if (similaridade.length > 0) {
    const byMateria = {};
    for (const s of similaridade) {
      const key = s.materiaA || "desconhecida";
      byMateria[key] = (byMateria[key] || 0) + 1;
    }

    md += `## ⚠️  Similaridade entre Flashcards\n\n`;
    md += `**Total de pares similares:** ${similaridade.length}\n\n`;

    md += `### Sumário por Matéria\n\n`;
    md += `| Matéria | Pares similares |\n`;
    md += `|---------|-----------------|\n`;
    const sortedMaterias = Object.entries(byMateria).sort((a, b) => b[1] - a[1]);
    for (const [mat, count] of sortedMaterias) {
      md += `| ${mat} | ${count} |\n`;
    }
    md += `\n`;

    // ─── Detalhamento ───
    md += `### Detalhamento dos Pares\n\n`;
    const sorted = [...similaridade].sort((a, b) => b.similaridade - a.similaridade);
    sorted.forEach((w, idx) => {
      const simLabel = w.similaridade >= 0.95 ? "ALTÍSSIMA" : "ALTA";
      md += `#### ${idx + 1}. \`${w.idA}\` ↔ \`${w.idB}\` (${(w.similaridade * 100).toFixed(1)}% — ${simLabel})\n\n`;
      md += `**Matéria A:** ${w.materiaA}  \n`;
      md += `**Matéria B:** ${w.materiaB}  \n\n`;
      md += `**Pergunta A:**  \n> ${w.perguntaA}\n\n`;
      md += `**Pergunta B:**  \n> ${w.perguntaB}\n\n`;
      md += `**Análise:** (preencher após avaliação manual)\n\n`;
      md += `---\n\n`;
    });
  }

  md += `*Relatório gerado automaticamente em ${dateStr} pelo script de validação.*\n`;

  mkdirSync(REPORTS_DIR, { recursive: true });
  writeFileSync(filepath, md, "utf-8");
  return filepath;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const bancoModificado = bancoAlterado();

  if (!bancoModificado) {
    console.log("  ℹ️  banco.json inalterado — validação pulada.");
    console.log("     Para forçar: git add src/data/banco.json e commite novamente.");
    process.exit(0);
  }

  console.log("\n🔍  Validando flashcards em src/data/banco.json...\n");

  let data;
  try {
    data = loadBanco();
  } catch (err) {
    console.error(`  ERRO FATAL: ${err.message}`);
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

  // Gera relatório
  const reportPath = generateReport(cards.length);
  console.log(`  📄  Relatório salvo: ${reportPath}\n`);

  const erros = issues.filter(i => i.gravidade === "erro");
  const atencao = issues.filter(i => i.gravidade === "atencao");

  // Exibe resumo no terminal
  for (const e of erros) {
    console.error(`  ❌  ${e.tipo}: ${e.msg}`);
  }
  for (const a of atencao) {
    console.warn(`  ⚠️  ${a.tipo}: ${a.msg}`);
  }

  if (erros.length > 0) {
    console.error(`\n  ❌  ${erros.length} erro(s) encontrado(s). Corrija antes de commitar.`);
    process.exit(1);
  }

  if (atencao.length > 0) {
    console.warn(`\n  ⚠️  ${atencao.length} atenções emitidas. Revise o relatório antes de commitar.`);
    process.exit(0);
  }

  console.log("  ✅  Nenhum problema encontrado. Banco de dados OK!");
  process.exit(0);
}

main();
