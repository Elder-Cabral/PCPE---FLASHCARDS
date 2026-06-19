import fs from 'fs';

const PASTA_LOTES = 'reports';
const ARQUIVOS = [
  'estatistica_lote1.json',
  'estatistica_lote2.json',
  'estatistica_lote3.json',
  'estatistica_lote4.json',
];
const BANCO_PATH = 'src/data/banco.json';

// Gera camada1 (intuição) a partir da resposta
function gerarCamada1(card) {
  const r = card.resposta;
  if (card.id.includes('formula') || card.id.includes('calculo') || r.startsWith('P(') || r.startsWith('E(') || r.startsWith('Var(')) {
    return `Intuição: ${r.split('.')[0]}. O foco é entender quando e por que aplicar essa fórmula, não apenas decorá-la.`;
  }
  // Pega a primeira oração como intuição central
  const primeiraOracao = r.split(/[.!?]/).filter(s => s.trim().length > 10)[0];
  if (primeiraOracao) {
    return `Intuição: ${primeiraOracao.trim()}.`;
  }
  return `Intuição: ${r.substring(0, 120)}...`;
}

// Gera camada2 (como a banca cobra) a partir da dica
function gerarCamada2(card) {
  const d = card.dica || '';
  if (d.startsWith('CESPE') || d.startsWith('⚠️ CESPE')) {
    return d.replace(/^⚠️ /, '');
  }
  return `CESPE: ${d}`;
}

// Processa todos os lotes
let totalCards = 0;
for (const arquivo of ARQUIVOS) {
  const caminho = `${PASTA_LOTES}/${arquivo}`;
  const cards = JSON.parse(fs.readFileSync(caminho, 'utf8'));

  for (const card of cards) {
    card.camada1 = gerarCamada1(card);
    card.camada2 = gerarCamada2(card);
    totalCards++;
  }

  fs.writeFileSync(caminho, JSON.stringify(cards, null, 2), 'utf8');
  console.log(`✓ ${arquivo}: ${cards.length} cards atualizados`);
}

console.log(`\nTotal: ${totalCards} cards com camadas geradas.`);
