import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REWRITE_DIR = path.resolve(__dirname, 'rewrite_data');
const BANCO_PATH = path.resolve(__dirname, '..', 'src', 'data', 'banco.json');

/**
 * Converte o output JSON do professor-revisor (formato com scoring/status)
 * para o formato rewrite_data/<materia>.json (tuplas [id, pergunta, resposta, dica]).
 *
 * Uso:
 *   node scripts/convert_review_to_rewrite.mjs <materia> < <review_output.json>
 *   node scripts/convert_review_to_rewrite.mjs <materia> --file <caminho_do_json>
 *
 * O JSON de entrada deve ser um array de objetos com campos:
 *   id, status, pergunta, resposta, dica (opcional)
 *
 * Cards com status = APROVADO são ignorados.
 * Cards com status = REVISADO, RECRIADO ou FRAGMENTAR geram rewrites.
 */
function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Uso: node scripts/convert_review_to_rewrite.mjs <materia> [--file <path>]');
    console.error('  Se --file não for informado, lê da stdin.');
    process.exit(1);
  }

  const materia = args[0];
  const fileIdx = args.indexOf('--file');
  let input = '';

  if (fileIdx !== -1 && args[fileIdx + 1]) {
    input = fs.readFileSync(args[fileIdx + 1], 'utf8');
  } else {
    input = fs.readFileSync('/dev/stdin', 'utf8');
  }

  let reviews;
  try {
    reviews = JSON.parse(input);
  } catch (e) {
    console.error('Erro ao fazer parse do JSON:', e.message);
    process.exit(1);
  }

  if (!Array.isArray(reviews)) {
    // Se for objeto único, envolve em array
    if (reviews && reviews.id) {
      reviews = [reviews];
    } else {
      console.error('JSON de entrada deve ser um array de objetos ou um objeto único com campo "id".');
      process.exit(1);
    }
  }

  const rewrites = [];
  let aprovados = 0;
  let ignorados = 0;

  for (const card of reviews) {
    const status = (card.status || '').toUpperCase();

    if (status === 'APROVADO') {
      aprovados++;
      continue;
    }

    if (!['REVISADO', 'RECRIADO', 'FRAGMENTAR'].includes(status)) {
      ignorados++;
      continue;
    }

    // Pega a pergunta/resposta/dica revisadas, ou mantém as originais se não houver revisão
    const pergunta = card.pergunta || card.pergunta_original || '';
    const resposta = card.resposta || card.resposta_original || '';
    const dica = card.dica || '';

    if (!pergunta || !resposta) {
      console.warn(`  AVISO: card ${card.id} (${status}) sem pergunta ou resposta — ignorado`);
      ignorados++;
      continue;
    }

    rewrites.push([card.id, pergunta, resposta, dica]);
  }

  if (rewrites.length === 0) {
    console.log(`Nenhum rewrite para ${materia}. ${aprovados} aprovados, ${ignorados} ignorados.`);
    return;
  }

  // Lê rewrite_data existente se houver
  const rewritePath = path.join(REWRITE_DIR, `${materia}.json`);
  let existingData = { rewrites: [], removes: [], merges: {} };

  if (fs.existsSync(rewritePath)) {
    try {
      existingData = JSON.parse(fs.readFileSync(rewritePath, 'utf8'));
    } catch {
      // ignora
    }
  }

  // Se já existem rewrites, faz merge: sobrescreve pelo id
  const existingMap = new Map();
  for (const r of (existingData.rewrites || [])) {
    existingMap.set(r[0], r);
  }
  for (const r of rewrites) {
    existingMap.set(r[0], r);
  }

  existingData.rewrites = Array.from(existingMap.values());

  // Ordena por id
  existingData.rewrites.sort((a, b) => a[0].localeCompare(b[0]));

  // Escreve
  fs.writeFileSync(rewritePath, JSON.stringify(existingData, null, 2), 'utf8');
  console.log(`✓ ${materia}: ${rewrites.length} rewrites geradas (${aprovados} aprovadas ignoradas, ${ignorados} ignoradas)`);
  console.log(`  Arquivo: ${rewritePath}`);
}

main();
