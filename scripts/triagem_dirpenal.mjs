import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(__dirname, '..', 'src', 'data', 'banco.json');
const banco = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const cards = banco.dir_penal;

function wordCount(s) {
  return (s || '').trim().split(/\s+/).filter(Boolean).length;
}

const dryCitationRe = /^(Art\.?\s*\d+|Lei\s+n[o°]?\s*[\d.]+\/\d+|Súmula\s+\d+|Mnemônico|Não|Sim|Vedado|Art\.\s*\d+\s*CPP?)$/i;

function keywordOverlap(pergunta, resposta) {
  const pWords = new Set(
    pergunta.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, ' ').split(/\s+/).filter(Boolean)
  );
  const rWords = resposta
    .toLowerCase()
    .replace(/[^a-zà-ÿ0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (rWords.length === 0) return 0;
  let overlap = 0;
  for (const w of rWords) if (pWords.has(w)) overlap++;
  return overlap / rWords.length;
}

function hasRefToLaw(resposta) {
  return /\b(art\.?\s*\d+|Lei\s+\d+|Súmula\s+\d+|CF\/|CP\b|CPP\b|STF|STJ|[oº]\s*\w|parágrafo|inciso)/i.test(
    resposta
  );
}

const criteria = { a: [], b: [], c: [], d: [], e: [] };
// Track which IDs were already flagged to avoid double-counting
const flagged = new Set();

for (let i = 0; i < cards.length; i++) {
  const c = cards[i];
  const pergunta = c.pergunta || '';
  const resposta = c.resposta || '';
  const dica = c.dica || '';
  const id = c.id || '?';

  // Criterion a: dica < 8 words OR just dry citation
  if (dica.trim()) {
    const wc = wordCount(dica);
    if (wc < 8) {
      const isDry = wc <= 4 && dryCitationRe.test(dica.trim());
      if (isDry || wc <= 3) {
        criteria.a.push({
          id,
          pergunta: pergunta.substring(0, 60),
          dica: dica.substring(0, 60),
          detail: `${wc} palavras`,
        });
        flagged.add(id);
        continue;
      }
    }
  } else {
    criteria.a.push({
      id,
      pergunta: pergunta.substring(0, 60),
      dica: '(vazio)',
      detail: 'dica vazia',
    });
    flagged.add(id);
    continue;
  }

  // Criterion d FIRST: < 15 words AND no legal reference
  if (wordCount(resposta) < 15 && !hasRefToLaw(resposta)) {
    criteria.d.push({
      id,
      pergunta: pergunta.substring(0, 60),
      wordCount: wordCount(resposta),
    });
    flagged.add(id);
    continue;
  }

  // Criterion b: answer reuses same keywords
  const overlap = keywordOverlap(pergunta, resposta);
  if (wordCount(resposta) > 5 && overlap > 0.8) {
    criteria.b.push({
      id,
      pergunta: pergunta.substring(0, 60),
      detail: `${(overlap * 100).toFixed(0)}% overlap`,
    });
    flagged.add(id);
    continue;
  }

  // Criterion c: sim/não or single word answer
  const rt = resposta.trim().toLowerCase();
  if (/^(sim|não|sim\.|não\.)/.test(rt) && wordCount(resposta) < 8) {
    criteria.c.push({
      id,
      pergunta: pergunta.substring(0, 60),
      resposta: resposta.substring(0, 40),
    });
    flagged.add(id);
    continue;
  }
}

// ─── Criterion e: hot topics without pegadinha coverage ──────────────────────
const hotTopics = [
  'legítima defesa', 'estado de necessidade', 'dolo eventual', 'culpa consciente',
  'erro de tipo', 'erro de proibição', 'tentativa', 'crime continuado',
  'concurso material', 'concurso formal', 'crime hediondo', 'tráfico privilegiado',
  'colaboração premiada', 'abolitio criminis', 'extraterritorialidade',
  'abuso de autoridade', 'organização criminosa', 'insignificância',
  'inimputabilidade', 'imputabilidade', 'concurso de agentes',
  'desistência voluntária', 'arrependimento eficaz',
];

for (let i = 0; i < cards.length; i++) {
  const c = cards[i];
  const pergunta = c.pergunta || '';
  const resposta = c.resposta || '';
  const dica = c.dica || '';
  const id = c.id || '?';

  if (flagged.has(id)) continue;

  const combined = (pergunta + ' ' + resposta + ' ' + dica).toLowerCase();
  const matchesHot = hotTopics.some((t) => combined.includes(t));
  if (!matchesHot) continue;

  let lacksPegadinha = false;

  if (combined.includes('legítima defesa')) {
    if (!/(excesso|injusta|atual|iminente|requisitos|moderado|necessários|agressão)/i.test(combined))
      lacksPegadinha = true;
  }
  if (combined.includes('estado de necessidade')) {
    if (!/(perigo atual|inevitável|direito próprio|alheio|sacrifício|proporcionalidade)/i.test(combined))
      lacksPegadinha = true;
  }
  if (combined.includes('dolo eventual') || combined.includes('culpa consciente')) {
    if (!/diferença|assume o risco|acredita|prevê|não quer|confia/i.test(combined))
      lacksPegadinha = true;
  }
  if (combined.includes('erro de tipo') || combined.includes('erro de proibição')) {
    if (!/evitável|inevitável|excludente|ilicitude|elemento|descriminante/i.test(combined))
      lacksPegadinha = true;
  }

  if (lacksPegadinha) {
    criteria.e.push({
      id,
      pergunta: pergunta.substring(0, 60),
      detail: 'hot topic sem pegadinha',
    });
    flagged.add(id);
  }
}

// ─── REPORT ─────────────────────────────────────────────────────────────────
console.log('=== TRIAGEM DIR_PENAL (' + cards.length + ' cards) ===\n');

let total = 0;
for (const [k, v] of Object.entries(criteria)) {
  console.log('Critério ' + k + ':', v.length, 'cards');
  for (const x of v) {
    console.log('  - ' + x.id + ' | ' + (x.pergunta || x.detail || ''));
  }
  console.log('');
  total += v.length;
}

console.log('TOTAL cards fracos:', total, 'de', cards.length);
console.log('Por critério:');
for (const [k, v] of Object.entries(criteria)) {
  console.log('  ' + k + ':', v.length);
}
