import fs from 'fs';

const BANCO_PATH = 'src/data/banco.json';
const PASTA_LOTES = 'reports';
const ARQUIVOS = [
  'estatistica_lote1.json',
  'estatistica_lote2.json',
  'estatistica_lote3.json',
  'estatistica_lote4.json',
];

// Lê banco.json
const bancoRaw = fs.readFileSync(BANCO_PATH, 'utf8');
const banco = JSON.parse(bancoRaw);

// Lê todos os lotes e monta mapa id -> card
const rewriteMap = new Map();
for (const arquivo of ARQUIVOS) {
  const cards = JSON.parse(fs.readFileSync(`${PASTA_LOTES}/${arquivo}`, 'utf8'));
  for (const card of cards) {
    rewriteMap.set(card.id, card);
  }
}

console.log(`Total cards nos lotes: ${rewriteMap.size}`);

// Aplica as alterações no banco.json
let encontrados = 0;
let naoEncontrados = [];

for (const [materia, cards] of Object.entries(banco)) {
  for (let i = 0; i < cards.length; i++) {
    const rewrite = rewriteMap.get(cards[i].id);
    if (rewrite) {
      cards[i].pergunta = rewrite.pergunta;
      cards[i].resposta = rewrite.resposta;
      cards[i].dica = rewrite.dica;
      cards[i].camada1 = rewrite.camada1 || '';
      cards[i].camada2 = rewrite.camada2 || '';
      if (rewrite.materia) cards[i].materia = rewrite.materia;
      encontrados++;
      rewriteMap.delete(rewrite.id);
    }
  }
}

for (const [id] of rewriteMap) {
  naoEncontrados.push(id);
}

console.log(`Cards atualizados no banco: ${encontrados}`);
if (naoEncontrados.length > 0) {
  console.log(`Cards NÃO encontrados no banco (${naoEncontrados.length}):`);
  naoEncontrados.forEach(id => console.log(`  - ${id}`));
}

// Salva banco.json
fs.writeFileSync(BANCO_PATH, JSON.stringify(banco, null, 2), 'utf8');
console.log('✓ banco.json salvo');
