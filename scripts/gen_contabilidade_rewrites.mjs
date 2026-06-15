import fs from 'fs';

const banco = JSON.parse(fs.readFileSync('src/data/banco.json', 'utf8'));

const dicas = {
  contabilidade_21: "PLANO DE CONTAS = conjunto de contas padronizado. N\u00c3O existe plano \u00fanico obrigat\u00f3rio (exceto setores regulados). CESPE: 'plano de contas \u00e9 facultativo' -> VERDADEIRO (cada entidade adota o seu).",
  contabilidade_26: "1\u00aa: 1D-1C (simples). 2\u00aa: 1D-2+C. 3\u00aa: 2+D-1C. 4\u00aa: 2+D-2+C. CESPE: 'lan\u00e7amento de 2\u00aa f\u00f3rmula tem 2 cr\u00e9ditos' -> VERDADEIRO.",
  contabilidade_27: "COMPET\u00caNCIA = fato gerador (independente de recebimento). CAIXA = efetivo pagamento/recebimento. CESPE adora: 'compet\u00eancia \u00e9 usado no setor p\u00fablico' -> FALSO (setor p\u00fablico usa caixa; privado usa compet\u00eancia).",
  contabilidade_28: "REGIME DE CAIXA: reconhece no pagamento/recebimento. Usado no setor p\u00fablico (Lei 4.320/64). CESPE: 'empresas usam regime de caixa' -> FALSO (usam compet\u00eancia).",
  contabilidade_29: "BALANCETE = lista de contas com saldos (devedores e credores). Verifica: total d\u00e9bitos = total cr\u00e9ditos. N\u00c3O \u00e9 obrigat\u00f3rio por lei, mas \u00e9 boa pr\u00e1tica. CESPE: 'balancete substitui o balan\u00e7o' -> FALSO.",
  contabilidade_32: "PASSIVO CIRCULANTE: at\u00e9 12 meses (fornecedores, sal\u00e1rios, impostos). PASSIVO N\u00c3O CIRCULANTE: > 12 meses (financiamentos de LP). CESPE: 'exig\u00edvel a LP \u00e9 passivo circulante' -> FALSO.",
  contabilidade_33: "PL = Capital + Reservas + Ajustes + Lucros/Preju\u00edzos Acumulados - A\u00e7\u00f5es em Tesouraria. CESPE: 'capital social \u00e9 conta do passivo' -> FALSO (\u00e9 do PL).",
  contabilidade_35: "DRE em cascata: RB \u2192 Dedu\u00e7\u00f5es \u2192 RL \u2192 CMV \u2192 LB \u2192 Desp Op \u2192 LAIR \u2192 IR \u2192 LL. CESPE: 'IR \u00e9 deduzido antes do CMV' -> FALSO (depois das despesas operacionais).",
  contabilidade_36: "CMV = EI + Compras - EF. Ex: EI=10k, Compras=50k, EF=15k \u2192 CMV=45k. CESPE: 'CMV inclui despesas de vendas' -> FALSO (s\u00f3 custo da mercadoria).",
  contabilidade_38: "Deprecia\u00e7\u00e3o linear = (Custo - Valor Residual) / Vida \u00datil. Ex: R$10.000 / 5 anos = R$2.000/ano. CESPE adota m\u00e9todo linear como regra geral.",
  contabilidade_39: "PROVIS\u00c3O = passivo prov\u00e1vel com valor estim\u00e1vel. NBC TG 25. Requer: (a) obriga\u00e7\u00e3o presente; (b) prov\u00e1vel sa\u00edda de recursos; (c) estimativa confi\u00e1vel. CESPE: 'provis\u00e3o \u00e9 conta retificadora' -> FALSO (\u00e9 passivo).",
  contabilidade_40: "PDD (ou PECLD): retificadora do Ativo. D\u00e9bito: Despesa com PDD. Cr\u00e9dito: PDD. CESPE: 'PDD \u00e9 conta do passivo' -> FALSO (redutora do ativo, saldo credor).",
  contabilidade_41: "JUROS ATIVOS = receita financeira (aumenta PL). JUROS PASSIVOS = despesa financeira (diminui PL). CESPE: 'juros recebidos s\u00e3o despesa' -> FALSO.",
  contabilidade_43: "CPC = Comit\u00ea de Pronunciamentos Cont\u00e1beis. Emite pronunciamentos t\u00e9cnicos baseados no IFRS. CFC incorpora CPCs \u00e0s NBCs. CESPE: 'CPC substitui o CFC' -> FALSO.",
  contabilidade_44: "CGL (ou Capital de Giro L\u00edquido) = AC - PC. Indica folga financeira de curto prazo. CGL positivo = AC > PC. CGL negativo = AC < PC (risco de liquidez).",
  contabilidade_45: "LIQUIDEZ CORRENTE = AC / PC. Ideal: > 1. Se = 1,5 \u2192 para cada R$1 de PC, R$1,50 de AC. CESPE: 'LC > 1 indica insolv\u00eancia' -> FALSO (indica liquidez).",
  contabilidade_46: "LIQUIDEZ SECA = (AC - Estoques) / PC. Exclui estoques (menos l\u00edquidos). Mais rigorosa que a corrente. CESPE: 'liquidez seca inclui estoques' -> FALSO.",
  contabilidade_47: "LIQUIDEZ IMEDIATA = Disponibilidades / PC. S\u00f3 caixa, bancos e aplica\u00e7\u00f5es. Geralmente < 1. CESPE: 'liquidez imediata mede capacidade de LP' -> FALSO (curto prazo).",
  contabilidade_48: "DISPONIBILIDADES: caixa, bancos conta movimento, aplica\u00e7\u00f5es financeiras de liquidez imediata. Maior liquidez do ativo. CESPE: 'aplica\u00e7\u00f5es de LP s\u00e3o disponibilidades' -> FALSO.",
  contabilidade_49: "CAPITAL SOCIAL = recurso dos s\u00f3cios. 1\u00aa conta do PL. Aumenta com integraliza\u00e7\u00f5es. CESPE: 'capital social \u00e9 despesa' -> FALSO (\u00e9 PL).",
  contabilidade_50: "RESERVA DE LUCROS: parcela do lucro retida para fins espec\u00edficos (expans\u00e3o, conting\u00eancias, incentivos fiscais). Comp\u00f5e o PL. CESPE: 'reserva de lucros \u00e9 passivo' -> FALSO (\u00e9 PL).",
  contabilidade_51: "RESULTADO DO EXERC\u00cdCIO: lucro \u2192 reservas ou dividendos. Preju\u00edzo \u2192 reduz o PL. Transferido da DRE para o BP. CESPE: 'resultado \u00e9 conta patrimonial' -> FALSO (\u00e9 de resultado, depois vai ao PL).",
  contabilidade_52: "CONTA RETIFICADORA: natureza inversa \u00e0 conta principal. Ativo retificado: saldo CREDOR (ex: Deprecia\u00e7\u00e3o Acumulada). PL retificado: saldo DEVEDOR (ex: A\u00e7\u00f5es em Tesouraria). CESPE adora.",
  contabilidade_53: "AMORTIZA\u00c7\u00c3O: redu\u00e7\u00e3o de intang\u00edveis (patentes, marcas, softwares). Diferen\u00e7a de deprecia\u00e7\u00e3o: deprecia\u00e7\u00e3o = tang\u00edvel; amortiza\u00e7\u00e3o = intang\u00edvel. CESPE: 'amortiza\u00e7\u00e3o se aplica a im\u00f3veis' -> FALSO (deprecia\u00e7\u00e3o).",
  contabilidade_54: "EXAUST\u00c3O: recursos naturais (minera\u00e7\u00e3o, petr\u00f3leo, florestas). Diferen\u00e7a: deprecia\u00e7\u00e3o (uso/desgaste), amortiza\u00e7\u00e3o (prazo legal/econ\u00f4mico), exaust\u00e3o (extra\u00e7\u00e3o). CESPE adora essa tr\u00edade.",
  contabilidade_55: "PRUD\u00caNCIA (conservadorismo): menor valor para ativos, maior para passivos. NBC atualizou: agora \u00e9 'neutralidade' (sem vi\u00e9s). CESPE: 'prud\u00eancia foi substitu\u00edda na EC 2019' -> VERDADEIRO (por neutralidade).",
  contabilidade_56: "CONTINUIDADE: entidade operar\u00e1 indefinidamente. Se n\u00e3o houver continuidade, usa-se valor de liquida\u00e7\u00e3o. CESPE: 'continuidade \u00e9 presumida salvo evid\u00eancia em contr\u00e1rio' -> VERDADEIRO.",
  contabilidade_57: "ENTIDADE: patrim\u00f4nio da PJ \u2260 PF dos s\u00f3cios. Evita confus\u00e3o patrimonial. CESPE: 'princ\u00edpio da entidade permite misturar bens' -> FALSO.",
  contabilidade_58: "OPORTUNIDADE: registro imediato e simult\u00e2neo dos fatos. Integridade + tempestividade. CESPE: 'oportunidade significa registrar quando for conveniente' -> FALSO (deve ser imediato).",
  contabilidade_59: "CONCILIA\u00c7\u00c3O BANC\u00c1RIA: ajusta diferen\u00e7as entre extrato e contabilidade. Itens: cheques n\u00e3o compensados, tarifas, juros. CESPE: 'concilia\u00e7\u00e3o \u00e9 facultativa' -> FALSO.",
  contabilidade_60: "RESULTADO BRUTO = Receita L\u00edquida - CMV. Indica efici\u00eancia da atividade-fim. CESPE: 'resultado bruto considera despesas operacionais' -> FALSO (s\u00f3 deduz CMV).",
  contabilidade_61: "VARIA\u00c7\u00c3O MONET\u00c1RIA: atualiza\u00e7\u00e3o de ativos/passivos em moeda estrangeira ou indexados. Ativa (receita) ou passiva (despesa). CESPE: 'varia\u00e7\u00e3o cambial ativa \u00e9 despesa' -> FALSO.",
  contabilidade_62: "FOLHA DE PAGAMENTO: 3 etapas: 1) apropria\u00e7\u00e3o (D-Despesa / C-Sal\u00e1rios a Pagar); 2) encargos (D-Despesa INSS/FGTS / C-INSS/FGTS a Recolher); 3) pagamento (D-Sal\u00e1rios a Pagar / C-Caixa). CESPE: 'FGTS \u00e9 descontado do empregado' -> FALSO (\u00e9 do empregador, 8%).",
  contabilidade_63: "PEPS (FIFO): primeiros itens a entrar s\u00e3o os primeiros a sair. Estoque final = custos mais recentes. CMV = custos mais antigos. CESPE: 'PEPS \u00e9 igual ao UEPS' -> FALSO (UEPS \u00e9 proibido no Brasil desde 2008).",
  contabilidade_64: "CUSTO M\u00c9DIO PONDERADO M\u00d3VEL: recalcula o custo m\u00e9dio ap\u00f3s cada entrada. Suaviza oscila\u00e7\u00f5es de pre\u00e7o. M\u00e9todo mais usado no Brasil. CESPE: 'custo m\u00e9dio \u00e9 calculado s\u00f3 no fim do per\u00edodo' -> FALSO (m\u00f3vel = a cada entrada).",
  contabilidade_65: "ATIVO INTANG\u00cdVEL: sem subst\u00e2ncia f\u00edsica, n\u00e3o monet\u00e1rio. Ex: marcas, patentes, softwares, goodwill, licen\u00e7as. CESPE: 'marcas s\u00e3o ativo imobilizado' -> FALSO (s\u00e3o intang\u00edveis).",
  contabilidade_66: "GOODWILL: \u00e1gio por expectativa de rentabilidade futura. Reconhecido no intang\u00edvel. N\u00e3o \u00e9 amortizado \u2014 testado por impairment. CESPE: 'goodwill \u00e9 despesa' -> FALSO (\u00e9 ativo intang\u00edvel).",
  contabilidade_67: "CUSTO DE AQUISI\u00c7\u00c3O = pre\u00e7o + fretes + seguros + tributos n\u00e3o recuper\u00e1veis - descontos. CESPE: 'ICMS recuper\u00e1vel integra o custo' -> FALSO (n\u00e3o recuper\u00e1vel \u00e9 que integra).",
  contabilidade_68: "EBITDA (LAJIDA): Lucro Antes de Juros, Impostos, Deprecia\u00e7\u00e3o e Amortiza\u00e7\u00e3o. Mede gera\u00e7\u00e3o operacional de caixa. CESPE: 'EBITDA \u00e9 o lucro l\u00edquido' -> FALSO (\u00e9 antes de juros, IR, deprecia\u00e7\u00e3o e amortiza\u00e7\u00e3o).",
  contabilidade_69: "DFC: fluxos de caixa. 3 atividades: Operacional (atividade-fim), Investimento (imobilizado, intang\u00edveis), Financiamento (empr\u00e9stimos, dividendos, capital). CESPE: 'DFC substitui a DRE' -> FALSO.",
  contabilidade_70: "OPERACIONAL na DFC: recebimentos de clientes, pagamentos a fornecedores/sal\u00e1rios/impostos. M\u00e9todo direto (recebimentos e pagamentos) ou indireto (ajusta lucro l\u00edquido).",
  contabilidade_71: "INVESTIMENTO na DFC: compra/venda de imobilizado, intang\u00edveis, investimentos de LP. CESPE: 'compra de estoque \u00e9 atividade de investimento' -> FALSO (operacional).",
  contabilidade_72: "FINANCIAMENTO na DFC: capta\u00e7\u00e3o/amortiza\u00e7\u00e3o de empr\u00e9stimos, integraliza\u00e7\u00e3o de capital, pagamento de dividendos. CESPE: 'pagamento de fornecedor \u00e9 financiamento' -> FALSO.",
  contabilidade_73: "DMPL: evidencia altera\u00e7\u00f5es no PL (capital, reservas, lucros acumulados, ajustes, a\u00e7\u00f5es em tesouraria). Mais completa que a DLPA. CESPE: 'DMPL substitui a DLPA' -> VERDADEIRO.",
  contabilidade_74: "DVA: riqueza gerada pela empresa e sua distribui\u00e7\u00e3o (empregados, governo, financiadores, s\u00f3cios). CESPE: 'DVA \u00e9 obrigat\u00f3ria para empresas de capital aberto' -> VERDADEIRO.",
  contabilidade_75: "LEASING FINANCEIRO: reconhece bem como ativo + obriga\u00e7\u00e3o como passivo. Risco e controle transferidos ao arrendat\u00e1rio. CESPE: 'leasing \u00e9 despesa de aluguel' -> FALSO (\u00e9 aquisi\u00e7\u00e3o financiada).",
  contabilidade_76: "DESCONTO COMERCIAL (por fora): calculado sobre o valor nominal. Diferen\u00e7a do racional: comercial usa valor futuro, racional usa valor presente. CESPE adora distinguir.",
  contabilidade_77: "INSS PATRONAL: encargo do empregador (20% sobre a folha). Lan\u00e7amento: D-Despesa / C-INSS a Recolher. CESPE: 'INSS patronal \u00e9 descontado do empregado' -> FALSO.",
  contabilidade_78: "BALAN\u00c7O DE ABERTURA: primeiro balan\u00e7o da entidade. Registra o patrim\u00f4nio inicial. A = P + PL. Base para todos os balan\u00e7os seguintes.",
  contabilidade_79: "CIRCULANTE: at\u00e9 12 meses (caixa, bancos, estoques, contas a receber). N\u00c3O CIRCULANTE: > 12 meses (imobilizado, intang\u00edvel, investimentos). CESPE: 'contas a receber de LP s\u00e3o circulantes' -> FALSO.",
  contabilidade_80: "PASSIVO CIRCULANTE: at\u00e9 12 meses (fornecedores, sal\u00e1rios, impostos). N\u00c3O CIRCULANTE: > 12 meses (financiamentos de LP). CESPE: 'empr\u00e9stimo de 36 meses \u00e9 circulante' -> FALSO.",
  contabilidade_81: "NOTA FISCAL: documento h\u00e1bil para lan\u00e7amento cont\u00e1bil. Comprova a opera\u00e7\u00e3o. CESPE: 'nota fiscal \u00e9 facultativa' -> FALSO.",
  contabilidade_82: "DENOMINA\u00c7\u00c3O PECUNI\u00c1RIA: patrim\u00f4nio expresso em moeda nacional (Real). CESPE: 'ativos podem ser registrados em d\u00f3lar' -> FALSO (devem ser convertidos).",
  contabilidade_83: "RESULTADO OPERACIONAL: lucro/preju\u00edzo das atividades principais (antes de resultado financeiro e tributos). CESPE: 'resultado operacional inclui receitas financeiras' -> FALSO.",
  contabilidade_84: "IMPOSTO DIFERIDO: diferen\u00e7a tempor\u00e1ria entre resultado cont\u00e1bil e fiscal. Ativo (despesa futura dedut\u00edvel) ou passivo (receita futura tribut\u00e1vel). NBC TG 32.",
  contabilidade_85: "CAIXA: ativo circulante, natureza devedora. D\u00e9bito = entrada, Cr\u00e9dito = sa\u00edda. Saldo NUNCA pode ser credor. CESPE: 'caixa pode ter saldo credor' -> FALSO (excepcionalmente em ajustes).",
  contabilidade_86: "FORNECEDORES: passivo circulante, natureza credora. D\u00e9bito = pagamento, Cr\u00e9dito = compra a prazo. CESPE: 'fornecedores \u00e9 conta do ativo' -> FALSO (\u00e9 passivo).",
  contabilidade_87: "CAPITAL SOCIAL: PL, natureza credora. Aumenta a cr\u00e9dito (integraliza\u00e7\u00f5es). Diminui a d\u00e9bito (redu\u00e7\u00e3o formal). CESPE: 'capital social \u00e9 passivo exig\u00edvel' -> FALSO.",
  contabilidade_88: "BALANCETE: lista de contas com saldos (peri\u00f3dico, facultativo). BALAN\u00c7O: demonstra\u00e7\u00e3o formal (obrigat\u00f3ria). CESPE: 'balancete e balan\u00e7o s\u00e3o sin\u00f4nimos' -> FALSO.",
  contabilidade_89: "CUSTO HIST\u00d3RICO: valor original de aquisi\u00e7\u00e3o. Base das NBCs. Ajust\u00e1vel por impairment. CESPE: 'custo hist\u00f3rico nunca \u00e9 ajustado' -> FALSO (impairment).",
  contabilidade_90: "VALOR JUSTO (fair value): pre\u00e7o de venda do ativo em transa\u00e7\u00e3o ordenada (IFRS 13). CESPE: 'valor justo \u00e9 o custo hist\u00f3rico' -> FALSO.",
  contabilidade_91: "CLIENTES (contas a receber): ativo circulante, natureza devedora. D\u00e9bito = venda a prazo, Cr\u00e9dito = recebimento. CESPE: 'clientes \u00e9 conta do passivo' -> FALSO.",
  contabilidade_92: "DEDU\u00c7\u00d5ES DA RB: devolu\u00e7\u00f5es, abatimentos, ICMS/PIS/COFINS sobre vendas. CESPE: 'dedu\u00e7\u00f5es s\u00e3o despesas operacionais' -> FALSO (s\u00e3o abatimentos na DRE).",
  contabilidade_93: "ESTOQUES: ativo circulante, natureza devedora. PEPS, Custo M\u00e9dio ou UEPS (proibido). D\u00e9bito = compras, Cr\u00e9dito = CMV. CESPE: 'estoques s\u00e3o ANC' -> FALSO.",
  contabilidade_94: "COMPET\u00caNCIA: reconhece pelo fato gerador (NBC exige). CAIXA: pelo recebimento/pagamento. Privado: compet\u00eancia. P\u00fablico: caixa (Lei 4.320/64).",
  contabilidade_95: "DIVIDENDO: D - Lucros Acumulados (PL) / C - Dividendos a Pagar (Passivo). CESPE: 'dividendo \u00e9 despesa' -> FALSO (\u00e9 distribui\u00e7\u00e3o de resultado).",
  contabilidade_96: "INTEGRALIZA\u00c7\u00c3O DE CAPITAL: pagamento do capital subscrito (dinheiro, bens ou direitos). D - Caixa/Bens / C - Capital Social. CESPE: 'integraliza\u00e7\u00e3o \u00e9 receita' -> FALSO.",
  contabilidade_97: "PL NEGATIVO (passivo a descoberto): A < P. Insolv\u00eancia t\u00e9cnica. CESPE: 'se PL for negativo, A = P + PL negativo' -> VERDADEIRO.",
  contabilidade_new_100: "CONTABILIDADE = ci\u00eancia que estuda o patrim\u00f4nio. Objeto = patrim\u00f4nio. Finalidade = informar usu\u00e1rios. CESPE: 'contabilidade \u00e9 arte' -> FALSO (\u00e9 ci\u00eancia).",
  contabilidade_new_101: "ATIVO = PASSIVO + PL. PL = A - P. Bens + Direitos = Ativo. Obriga\u00e7\u00f5es = Passivo. CESPE adora a equa\u00e7\u00e3o fundamental.",
  contabilidade_new_102: "SITUA\u00c7\u00c3O L\u00cdQUIDA: positiva (A > P), negativa (A < P), nula (A = P). CESPE: 'situa\u00e7\u00e3o l\u00edquida \u00e9 sempre positiva' -> FALSO.",
  contabilidade_new_103: "ATOS: n\u00e3o alteram o patrim\u00f4nio (ex: assinar contrato). FATOS: alteram o patrim\u00f4nio (ex: comprar \u00e0 vista). CESPE adora essa distin\u00e7\u00e3o.",
  contabilidade_new_104: "PERMUTATIVO: n\u00e3o altera PL. MODIFICATIVO: altera PL (receita/despesa). MISTO: permuta + modifica\u00e7\u00e3o. CESPE: 'compra com desconto \u00e9 fato misto' -> VERDADEIRO.",
  contabilidade_new_105: "D\u00c9BITO: esquerda da conta. CR\u00c9DITO: direita. Ativo/Despesa: aumentam a d\u00e9bito. Passivo/PL/Receita: aumentam a cr\u00e9dito. Emparelhamento: total d\u00e9bitos = total cr\u00e9ditos.",
  contabilidade_new_106: "ESCRITURA\u00c7\u00c3O: registro cronol\u00f3gico no Di\u00e1rio e Raz\u00e3o. 5 elementos: data, d\u00e9bito, cr\u00e9dito, hist\u00f3rico, valor. Partidas dobradas. CESPE: 'escritura\u00e7\u00e3o \u00e9 facultativa' -> FALSO.",
  contabilidade_new_107: "COMPET\u00caNCIA: fato gerador (obrigat\u00f3ria para empresas). CAIXA: pagamento/recebimento (setor p\u00fablico). CESPE: 'compet\u00eancia \u00e9 usada no or\u00e7amento p\u00fablico' -> FALSO (caixa).",
  contabilidade_new_108: "BALANCETE: saldos devedores e credores. Verifica se total D = total C. N\u00c3O substitui o Balan\u00e7o. CESPE: 'balancete \u00e9 obrigat\u00f3rio' -> FALSO (facultativo).",
  contabilidade_new_109: "BP = FOTO (posi\u00e7\u00e3o est\u00e1tica numa data). DRE = FILME (resultado do per\u00edodo). Lucro l\u00edquido da DRE aumenta o PL no BP.",
};

// Replace trailing "são" at end of text (mojibake for "s?")
// and a few specific known corrupted endings
function fixMojibakeTrailing(text) {
  if (!text) return text;
  // Fix trailing "ão" at the very end of the string (trimmed) → "?"
  const trimmedEnd = text.replace(/\s+$/, '');
  if (trimmedEnd.endsWith('ão') && !trimmedEnd.endsWith('ção') && !trimmedEnd.endsWith('rão') && !trimmedEnd.endsWith('lão')) {
    text = text.replace(/ão(\s*)$/, '?$1');
  }
  // Fix "são" followed by space/apostrophe/quote (e.g., "brasileirasão'" → "brasileiras?'")
  text = text.replace(/([a-zA-Z])ão(?=\s|['"])/g, '$1?');
  return text;
}

// Handle specific known corrupted words (safety net)
const mojibakeMap = {
  'Contasão': 'Contas?',
  'disponibilidadesão': 'disponibilidades?',
  'lucrosão': 'lucros?',
  'contábeisão': 'contábeis?',
  'estoquesão': 'estoques?',
  'mistosão': 'mistos?',
  'essenciaisão': 'essenciais?',
  'anterioresão': 'anteriores?',
  'apuradosão': 'apurados?',
  'passivosão': 'passivos?',
  'brasileirasão': 'brasileiras?',
  'NBCsão': 'NBCs?',
};

const existing = JSON.parse(fs.readFileSync('scripts/rewrite_data/contabilidade.json', 'utf8'));
const existingSet = new Set(existing.rewrites.map(r => r[0]));
const cards = banco.contabilidade;
const newRewrites = [];

cards.forEach(card => {
  if (existingSet.has(card.id)) return;
  
  const needsDica = !card.dica || card.dica.trim() === '';
  const hasMojibake = Object.keys(mojibakeMap).some(k => card.pergunta && card.pergunta.includes(k));
  
  if (needsDica || hasMojibake) {
    let pergunta = card.pergunta;
    let resposta = card.resposta;
    let dica = card.dica || '';
    
    // Fix mojibake
    if (hasMojibake) {
      Object.entries(mojibakeMap).forEach(([from, to]) => {
        pergunta = pergunta.replace(from, to);
      });
    }
    
    // Add dica
    if (needsDica && dicas[card.id]) {
      dica = dicas[card.id];
    }
    
    // Apply safe trailing fix
    pergunta = fixMojibakeTrailing(pergunta);
    
    newRewrites.push([card.id, pergunta, resposta, dica]);
  }
});

// Fix mojibake in existing rewrites too
const fixedRewrites = existing.rewrites.map(([id, pergunta, resposta, dica]) => {
  let p = pergunta, r = resposta, d = dica || '';
  Object.entries(mojibakeMap).forEach(([from, to]) => {
    p = p.replace(from, to);
    r = r.replace(from, to);
    d = d.replace(from, to);
  });
  p = fixMojibakeTrailing(p);
  r = fixMojibakeTrailing(r);
  d = fixMojibakeTrailing(d);
  return [id, p, r, d];
});

const allRewrites = [...fixedRewrites, ...newRewrites];

// Fix mojibake in dicas for new cards
const finalRewrites = allRewrites.map(([id, pergunta, resposta, dica]) => {
  let d = dica || '';
  Object.entries(mojibakeMap).forEach(([from, to]) => {
    d = d.replace(from, to);
  });
  d = fixMojibakeTrailing(d);
  return [id, fixMojibakeTrailing(pergunta), resposta, d];
});

const output = {
  rewrites: finalRewrites,
  removes: existing.removes,
  merges: existing.merges
};

fs.writeFileSync('scripts/rewrite_data/contabilidade.json', JSON.stringify(output, null, 2), 'utf8');
console.log(`Total rewrites: ${finalRewrites.length}`);
console.log(`New rewrites added: ${newRewrites.length}`);
