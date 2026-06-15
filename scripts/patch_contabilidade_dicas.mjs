import fs from 'fs';

const rw = JSON.parse(fs.readFileSync('scripts/rewrite_data/contabilidade.json', 'utf8'));

const dicas = {
  'contabilidade_new_100': 'CONTABILIDADE = ci\u00eancia que estuda o patrim\u00f4nio. Objeto = patrim\u00f4nio. Finalidade = informar usu\u00e1rios. CESPE: \'contabilidade \u00e9 arte\' -> FALSO (\u00e9 ci\u00eancia).',
  'contabilidade_new_101': 'ATIVO = PASSIVO + PL. PL = A - P. Bens + Direitos = Ativo. Obriga\u00e7\u00f5es = Passivo. CESPE adora a equa\u00e7\u00e3o fundamental.',
  'contabilidade_new_102': 'SITUA\u00c7\u00c3O L\u00cdQUIDA: positiva (A > P), negativa (A < P), nula (A = P). CESPE: \'situa\u00e7\u00e3o l\u00edquida \u00e9 sempre positiva\' -> FALSO.',
  'contabilidade_new_103': 'ATOS: n\u00e3o alteram patrim\u00f4nio (ex: assinar contrato). FATOS: alteram patrim\u00f4nio (ex: comprar \u00e0 vista). CESPE adora distin\u00e7\u00e3o.',
  'contabilidade_new_104': 'PERMUTATIVO: n\u00e3o altera PL. MODIFICATIVO: altera PL (receita/despesa). MISTO: permuta + modifica\u00e7\u00e3o. CESPE: \'compra com desconto \u00e9 misto\' -> VERDADEIRO.',
  'contabilidade_new_105': 'D\u00c9BITO: esquerda. CR\u00c9DITO: direita. Ativo/Despesa: aumentam a d\u00e9bito. Passivo/PL/Receita: aumentam a cr\u00e9dito. Partidas dobradas.',
  'contabilidade_new_106': 'ESCRITURA\u00c7\u00c3O: registro cronol\u00f3gico no Di\u00e1rio e Raz\u00e3o. 5 elem: data, d\u00e9bito, cr\u00e9dito, hist\u00f3rico, valor. CESPE: \'escritura\u00e7\u00e3o \u00e9 facultativa\' -> FALSO.',
  'contabilidade_new_107': 'COMPET\u00caNCIA: fato gerador (empresas). CAIXA: pagamento/recebimento (setor p\u00fablico). CESPE: \'compet\u00eancia no or\u00e7amento p\u00fablico\' -> FALSO (caixa).',
  'contabilidade_new_108': 'BALANCETE: saldos D e C. Verifica total D = C. N\u00c3O substitui Balan\u00e7o. CESPE: \'balancete obrigat\u00f3rio\' -> FALSO (facultativo).',
  'contabilidade_new_109': 'BP = FOTO (est\u00e1tica). DRE = FILME (din\u00e2mica). Lucro l\u00edquido da DRE aumenta o PL no BP. CESPE: \'BP \u00e9 demonstra\u00e7\u00e3o din\u00e2mica\' -> FALSO.',
};

let count = 0;
rw.rewrites.forEach(r => {
  if (dicas[r[0]]) {
    r[3] = dicas[r[0]];
    count++;
  }
});

fs.writeFileSync('scripts/rewrite_data/contabilidade.json', JSON.stringify(rw, null, 2), 'utf8');
console.log('Updated', count, 'cards with dicas');
