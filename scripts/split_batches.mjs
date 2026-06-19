import fs from 'fs';
const cards = JSON.parse(fs.readFileSync('reports/estatistica_pending.json', 'utf8'));
const batchSize = 31;
for (let i = 0; i < cards.length; i += batchSize) {
  const batch = cards.slice(i, i + batchSize);
  const idx = Math.floor(i / batchSize) + 1;
  fs.writeFileSync(`reports/estatistica_lote${idx}.json`, JSON.stringify(batch, null, 2), 'utf8');
  console.log(`Lote ${idx}: ${batch.length} cards`);
}
