import fs from 'fs';

const dicas = {
  dir_proc_penal_2: "IP \u00e9 dispens\u00e1vel para a\u00e7\u00e3o penal (art. 12 CPP). O MP pode denunciar com base em pe\u00e7as de informa\u00e7\u00e3o. CESPE: 'IP \u00e9 indispens\u00e1vel' -> FALSO.",
  dir_proc_penal_6: "CONFISS\u00c3O: divis\u00edvel (art. 200 CPP), retrat\u00e1vel a qualquer tempo, valor relativo (art. 197 CPP). CESPE: 'confiss\u00e3o \u00e9 prova absoluta' -> FALSO (deve ser cotejada com outras provas).",
  dir_proc_penal_16: "FIAN\u00c7A: art. 322 CPP. Autoridade policial pode arbitrar para pena m\u00e1xima at\u00e9 4 anos. Vedada para hediondos e racismo. CESPE: 'Delegado pode arbitrar fian\u00e7a para qualquer crime' -> FALSO.",
  dir_proc_penal_21: "TRANSA\u00c7\u00c3O PENAL (art. 76 Lei 9.099/95): acordo pr\u00e9-processual. N\u00c3O importa confiss\u00e3o. N\u00c3O gera reincid\u00eancia. CESPE: 'transa\u00e7\u00e3o penal gera maus antecedentes' -> FALSO.",
  dir_proc_penal_22: "SURSIS PROCESSUAL (art. 89 Lei 9.099/95): pena m\u00ednima at\u00e9 1 ano. Per\u00edodo de prova: 2 a 4 anos. CESPE: 'suspens\u00e3o condicional exige confiss\u00e3o' -> FALSO.",
  dir_proc_penal_24: "A\u00c7\u00c3O PENAL P\u00daBLICA CONDICIONADA: depende de representa\u00e7\u00e3o (v\u00edtima) ou requisi\u00e7\u00e3o (MJ). Prazo: 6 meses decadencial para representar. CESPE: 'a\u00e7\u00e3o condicionada independe de representa\u00e7\u00e3o' -> FALSO.",
  dir_proc_penal_25: "A\u00c7\u00c3O PENAL PRIVADA: queixa-crime no prazo de 6 meses. Sujeita a decad\u00eancia, peremp\u00e7\u00e3o, ren\u00fancia. CESPE: 'a\u00e7\u00e3o privada pode ser proposta a qualquer tempo' -> FALSO (6 meses).",
  dir_proc_penal_27: "RELAT\u00d3RIO DO IP: pe\u00e7a final do Delegado. N\u00c3O vincula o MP (pode pedir dilig\u00eancias ou arquivar). Art. 10 CPP. CESPE: 'relat\u00f3rio do IP vincula o MP' -> FALSO.",
  dir_proc_penal_29: "INDICIAMENTO: ato privativo do Delegado (Lei 12.830/13). N\u00c3O depende de autoriza\u00e7\u00e3o judicial. CESPE: 'indiciamento depende de autoriza\u00e7\u00e3o do MP' -> FALSO.",
  dir_proc_penal_30: "PROVA INDICI\u00c1RIA: grave, precisa e concordante (art. 239 CPP). N\u00c3O \u00e9 prova plena. CESPE: 'ind\u00edcio \u00e9 sin\u00f4nimo de suspeita' -> FALSO (circunst\u00e2ncia conhecida).",
  dir_proc_penal_31: "LIVRE CONVENCIMENTO MOTIVADO (art. 155 CPP): juiz aprecia provas livremente, mas deve fundamentar. N\u00c3O \u00e9 livre arb\u00edtrio. CESPE: 'livre convencimento dispensa fundamenta\u00e7\u00e3o' -> FALSO.",
  dir_proc_penal_33: "FRUTOS DA \u00c1RVORE ENVENENADA: prova il\u00edcita contamina as derivadas. Exce\u00e7\u00f5es: fonte independente, descoberta inevit\u00e1vel. Art. 157 CPP. CESPE adora.",
  dir_proc_penal_34: "DEN\u00daNCIA AN\u00d4NIMA: n\u00e3o serve para instaurar IP (pode gerar dilig\u00eancias preliminares). CESPE: 'den\u00fancia an\u00f4nima autoriza indiciamento' -> FALSO.",
  dir_proc_penal_35: "HABEAS CORPUS (art. 5, LXVIII CF): preventivo (salvo-conduto) ou liberat\u00f3rio. Gratuito. N\u00c3O exige advogado. CESPE: 'HC exige advogado' -> FALSO (qualquer pessoa pode impetrar).",
  dir_proc_penal_36: "AUTO DE PRIS\u00c3O EM FLAGRANTE (APF): documento formal da pris\u00e3o. Remetido ao juiz em 24h (art. 306 CPP). N\u00e3o \u00e9 decis\u00e3o judicial. CESPE: 'APF \u00e9 decis\u00e3o judicial' -> FALSO.",
  dir_proc_penal_37: "PRIS\u00c3O EM FLAGRANTE: qualquer do povo pode (faculdade); autoridade policial DEVE (dever legal). Art. 301 CPP. CESPE adora essa distin\u00e7\u00e3o.",
  dir_proc_penal_38: "NE BIS IN IDEM: ningu\u00e9m pode ser processado/punido duas vezes pelo mesmo fato. Princ\u00edpio impl\u00edcito no contradit\u00f3rio. CESPE: 'ne bis in idem \u00e9 expresso na CF' -> Art. 5, XXXVI n\u00e3o cobre diretamente.",
  dir_proc_penal_39: "RELAXAMENTO DE PRIS\u00c3O: pris\u00e3o ILEGAL (art. 5, LXV CF). Difere de revoga\u00e7\u00e3o (que pressup\u00f5e legalidade mas fim dos requisitos). CESPE adora diferenciar.",
  dir_proc_penal_40: "REVOGA\u00c7\u00c3O DA PREVENTIVA: art. 316 CPP. Quando cessam os fundamentos do art. 312. Pode ser substitu\u00edda por cautelares diversas. CESPE: 'revoga\u00e7\u00e3o = relaxamento' -> FALSO.",
  dir_proc_penal_41: "PRIS\u00c3O TEMPOR\u00c1RIA (Lei 7.960/89): 30 dias + 30 hediondos. 5 dias + 5 regra geral. Exige representa\u00e7\u00e3o ou requerimento (juiz N\u00c3O decreta de of\u00edcio). CESPE adora.",
  dir_proc_penal_43: "PRIS\u00c3O PREVENTIVA (art. 312 CPP): 4 hip\u00f3teses: ordem p\u00fablica, ordem econ\u00f4mica, instru\u00e7\u00e3o criminal, aplica\u00e7\u00e3o da lei penal. Requer + periculum libertatis. CESPE adora.",
  dir_proc_penal_44: "INTERROGAT\u00d3RIO POLICIAL: direito ao sil\u00eancio (art. 5, LXIII CF), assist\u00eancia de advogado (SV 14 STF). \u00daltimo ato do IP (art. 6, V CPP). CESPE: 'interrogat\u00f3rio \u00e9 meio de prova apenas' -> FALSO (tamb\u00e9m defesa).",
  dir_proc_penal_45: "CONTROLE EXTERNO DO MP (art. 129, VII CF): fiscaliza a atividade policial. N\u00c3O subordina o Delegado. CESPE: 'MP subordina a pol\u00edcia' -> FALSO (hierarquia administrativa \u00e9 interna).",
  dir_proc_penal_46: "RESTITUI\u00c7\u00c3O DE COISAS APREENDIDAS (art. 118 CPP): ao leg\u00edtimo propriet\u00e1rio quando n\u00e3o mais necess\u00e1rias ao processo. CESPE: 'restitui\u00e7\u00e3o depende de tr\u00e2nsito em julgado' -> FALSO.",
  dir_proc_penal_47: "LEI PROCESSUAL NO TEMPO: tempus regit actum (art. 2 CPP). Aplica\u00e7\u00e3o imediata, sem retroatividade. CESPE: 'lei processual pode retroagir para prejudicar o r\u00e9u' -> FALSO.",
  dir_proc_penal_48: "SISTEMA ACUSAT\u00d3RIO (art. 3-A CPP): acusa\u00e7\u00e3o (MP), defesa (advogado/DP), julgamento (juiz). Juiz N\u00c3O produz prova de of\u00edcio na investiga\u00e7\u00e3o. CESPE: 'sistema acusat\u00f3rio permite juiz investigar' -> FALSO.",
  dir_proc_penal_51: "A\u00c7\u00c3O CONTROLADA (Lei 12.850/13, art. 8): retardamento da interven\u00e7\u00e3o policial, com autoriza\u00e7\u00e3o judicial. CESPE: 'a\u00e7\u00e3o controlada dispensa autoriza\u00e7\u00e3o judicial' -> FALSO.",
  dir_proc_penal_52: "INFILTRA\u00c7\u00c3O DE AGENTES (Lei 12.850/13): com autoriza\u00e7\u00e3o judicial. Agente n\u00e3o pratica crime no exerc\u00edcio da fun\u00e7\u00e3o (causa de exclus\u00e3o de ilicitude). CESPE adora.",
  dir_proc_penal_54: "INTERCEPTA\u00c7\u00c3O TELEF\u00d4NICA (Lei 9.296/96): requisitos: ordem judicial, crime com reclus\u00e3o, ind\u00edcios de autoria, outros meios insuficientes. Prazo: 15 dias + 15. CESPE adora.",
  dir_proc_penal_55: "OFENDIDO (v\u00edtima): tem direito a ser ouvido, pode ser assistente de acusa\u00e7\u00e3o (art. 268 CPP). N\u00c3O tem compromisso de verdade. CESPE: 'v\u00edtima tem dever de verdade como testemunha' -> FALSO.",
  dir_proc_penal_56: "DECAD\u00caNCIA (a\u00e7\u00e3o privada): 6 meses do conhecimento da autoria (art. 38 CPP). Causa extintiva da punibilidade. CESPE: 'decad\u00eancia \u00e9 prescri\u00e7\u00e3o' -> FALSO (s\u00e3o institutos distintos).",
  dir_proc_penal_57: "PEREMP\u00c7\u00c3O: in\u00e9rcia do querelante. Causas: art. 60 CPP. S\u00f3 na a\u00e7\u00e3o privada. CESPE: 'peremp\u00e7\u00e3o ocorre na a\u00e7\u00e3o p\u00fablica' -> FALSO.",
  dir_proc_penal_58: "ASSISTENTE DE ACUSA\u00c7\u00c3O (art. 268 CPP): ofendido ou representante. Atua ao lado do MP, pode arrolar testemunhas e recorrer. CESPE: 'assistente tem os mesmos poderes do MP' -> FALSO.",
  dir_proc_penal_60: "PRAZO PARA DEN\u00daNCIA (art. 46 CPP): preso: 5 dias; solto: 15 dias. Prazo dobra se for \u00f3rg\u00e3o colegiado (MP junto a Tribunal). CESPE adora.",
  dir_proc_penal_61: "QUEIXA-CRIME: peti\u00e7\u00e3o inicial da a\u00e7\u00e3o privada. Prazo: 6 meses decadenciais. Requer advogado com procura\u00e7\u00e3o com poderes especiais. CESPE: 'queixa pode ser verbal' -> FALSO (deve ser escrita).",
  dir_proc_penal_62: "INCIDENTE DE INSANIDADE MENTAL (art. 149 CPP): suspende o IP. Per\u00edcia por peritos m\u00e9dicos. CESPE: 'incidente de insanidade n\u00e3o suspende o IP' -> FALSO (suspende).",
  dir_proc_penal_64: "PUBLICIDADE DOS ATOS (art. 5, LX CF): regra: atos p\u00fablicos. Exce\u00e7\u00e3o: sigilo processual (intimidade ou interesse social). IP tem sigilo externo (art. 20 CPP). CESPE adora.",
  dir_proc_penal_65: "PRESUN\u00c7\u00c3O DE INOC\u00caNCIA (art. 5, LVII CF): at\u00e9 tr\u00e2nsito em julgado. \u00d4nus da prova \u00e9 da acusa\u00e7\u00e3o. STF: execu\u00e7\u00e3o provis\u00f3ria s\u00f3 ap\u00f3s esgotamento de recursos. CESPE adora.",
  dir_proc_penal_66: "PROVA TESTEMUNHAL: dever de comparecer (condu\u00e7\u00e3o coercitiva) e dizer a verdade (falso testemunho \u00e9 crime). Exce\u00e7\u00f5es: parentes, advogado, etc. (art. 206 CPP). CESPE: 'testemunha pode mentir' -> FALSO.",
  dir_proc_penal_68: "AUDI\u00caNCIA UNA (art. 400 CPP): concentra oitiva, interrogat\u00f3rio e alega\u00e7\u00f5es orais. Prazo: 60 dias. CESPE: 'audi\u00eancia una separa instru\u00e7\u00e3o e julgamento' -> FALSO (concentra).",
  dir_proc_penal_69: "IDENTIDADE F\u00cdSICA DO JUIZ (art. 399, \u00a72 CPP): juiz que instruiu deve sentenciar. Exce\u00e7\u00f5es: convoca\u00e7\u00e3o, licen\u00e7a, promo\u00e7\u00e3o. CESPE adora.",
  dir_proc_penal_70: "IND\u00cdCIO (art. 239 CPP): circunst\u00e2ncia conhecida que leva a conclus\u00e3o por dedu\u00e7\u00e3o. Prova plena: estabelece o fato diretamente. CESPE: 'ind\u00edcio \u00e9 prova plena' -> FALSO.",
  dir_proc_penal_71: "OITIVA DO OFENDIDO (art. 201 CPP): primeiro ato da instru\u00e7\u00e3o. N\u00c3O tem compromisso de verdade. CESPE: 'v\u00edtima tem dever de dizer a verdade como testemunha' -> FALSO.",
  dir_proc_penal_72: "AMPLA DEFESA (art. 5, LV CF): defesa t\u00e9cnica (advogado obrigat\u00f3rio) + autodefesa (interrogat\u00f3rio, presen\u00e7a). CESPE: 'ampla defesa dispensa advogado' -> FALSO (defesa t\u00e9cnica \u00e9 obrigat\u00f3ria).",
  dir_proc_penal_75: "FONTE INDEPENDENTE DE PROVA IL\u00cdCITA (art. 157, \u00a71 CPP): prova derivada \u00e9 admiss\u00edvel se obtida por fonte aut\u00f4noma. CESPE: 'fonte independente n\u00e3o aproveita prova il\u00edcita' -> FALSO (aproveita).",
  dir_proc_penal_76: "IN DUBIO PRO REO: na d\u00favida, favor do r\u00e9u. Corol\u00e1rio da presun\u00e7\u00e3o de inoc\u00eancia. CESPE: 'in dubio pro reo se aplica na investiga\u00e7\u00e3o' -> discut\u00edvel (no IP n\u00e3o h\u00e1 acusa\u00e7\u00e3o formal).",
  dir_proc_penal_new_77: "TEMPUS REGIT ACTUM (art. 2 CPP): lei nova se aplica imediatamente. Atos j\u00e1 praticados s\u00e3o v\u00e1lidos. CESPE: 'lei processual retroage' -> FALSO (aplica\u00e7\u00e3o imediata, n\u00e3o retroativa).",
  dir_proc_penal_new_78: "FONTES DO DIREITO PROCESSUAL PENAL (art. 3 CPP): lei, tratados, princ\u00edpios gerais. Analogia \u00e9 admitida (diferente do Direito Penal material). CESPE adora essa diferen\u00e7a.",
  dir_proc_penal_new_79: "CARACTER\u00cdSTICAS DO IP: administrativo, inquisitorial (n\u00e3o contradit\u00f3rio), sigiloso (externo), escrito, indispon\u00edvel, dispens\u00e1vel (MP pode denunciar sem IP). CESPE adora.",
  dir_proc_penal_new_80: "EXAME DE CORPO DE DELITO (art. 158 CPP): obrigat\u00f3rio em crimes que deixam vest\u00edgios. N\u00c3O pode ser suprido pela confiss\u00e3o. CESPE: 'confiss\u00e3o dispensa exame de corpo de delito' -> FALSO.",
  dir_proc_penal_new_81: "INTERROGAT\u00d3RIO: natureza mista (meio de prova + defesa). Direito ao sil\u00eancio (art. 5, LXIII CF). CESPE: 'interrogat\u00f3rio \u00e9 s\u00f3 meio de defesa' -> FALSO (tamb\u00e9m \u00e9 meio de prova).",
  dir_proc_penal_new_82: "CONFISS\u00c3O (art. 197 CPP): relativa, divis\u00edvel e retrat\u00e1vel. Deve ser cotejada com outras provas. CESPE: 'confiss\u00e3o \u00e9 prova absoluta' -> FALSO.",
  dir_proc_penal_new_83: "DEVERES DA TESTEMUNHA (arts. 206-219 CPP): comparecer (condu\u00e7\u00e3o coercitiva), compromisso de verdade, responder perguntas. Exce\u00e7\u00f5es: parentes, inimigos, profiss\u00e3o (sigilo). CESPE adora.",
  dir_proc_penal_new_84: "RECONHECIMENTO (art. 226 CPP): descri\u00e7\u00e3o pr\u00e9via, coloca\u00e7\u00e3o ao lado de outras pessoas, formalidade. Nulidade se n\u00e3o seguido o rito. CESPE: 'reconhecimento dispensa descri\u00e7\u00e3o pr\u00e9via' -> FALSO.",
  dir_proc_penal_new_85: "ACAREA\u00c7\u00c3O (arts. 229-230 CPP): confronto entre depoimentos divergentes sobre fato relevante. CESPE: 'acarea\u00e7\u00e3o \u00e9 entre acusado e v\u00edtima' -> VERDADEIRO (pode ser).",
  dir_proc_penal_new_86: "BUSCA DOMICILIAR (art. 5, XI CF): regra: mandado judicial. Exce\u00e7\u00f5es: flagrante, desastre, socorro. Busca pessoal: fundada suspeita (art. 244 CPP). CESPE adora.",
  dir_proc_penal_new_87: "MEDIDAS CAUTELARES DIVERSAS (art. 319 CPP): 9 incisos. Fumus commissi delicti + periculum libertatis. Proporcionalidade e adequa\u00e7\u00e3o (art. 282 CPP). CESPE: 'medidas cautelares substituem a preventiva' -> em parte sim.",
  dir_proc_penal_new_88: "PRIS\u00c3O TEMPOR\u00c1RIA (Lei 7.960/89): cautelar na fase investigativa. Exige representa\u00e7\u00e3o ou requerimento (juiz N\u00c3O decreta de of\u00edcio). Prazos: 5+5 ou 30+30. CESPE adora.",
};

const mojibakeMap = {
  'hediondos\u00e3o': 'hediondos?',
  'processuais\u00e3o': 'processuais?',
  'limites\u00e3o': 'limites?',
  'aeronaves\u00e3o': 'aeronaves?',
  'cautelares\u00e3o': 'cautelares?',
  'contravencoes\u00e3o': 'contraven\u00e7\u00f5es?',
};

const banco = JSON.parse(fs.readFileSync('src/data/banco.json', 'utf8'));
const cards = banco.dir_proc_penal;
const existing = JSON.parse(fs.readFileSync('scripts/rewrite_data/dir_proc_penal.json', 'utf8'));
const existingSet = new Set(existing.rewrites.map(r => r[0]));

const newRewrites = [];
cards.forEach(card => {
  if (existingSet.has(card.id)) return;
  
  const needsDica = !card.dica || card.dica.trim() === '';
  const hasMojibake = Object.keys(mojibakeMap).some(k => card.pergunta?.includes(k));
  
  if (needsDica || hasMojibake) {
    let pergunta = card.pergunta;
    let resposta = card.resposta;
    let dica = card.dica || '';
    
    // Fix mojibake
    if (hasMojibake) {
      Object.entries(mojibakeMap).forEach(([from, to]) => {
        pergunta = pergunta.replace(from, to);
        resposta = resposta.replace(from, to);
      });
    }
    
    // Add dica
    if (needsDica && dicas[card.id]) {
      dica = dicas[card.id];
    }
    
    newRewrites.push([card.id, pergunta, resposta, dica]);
  }
});

// Also fix mojibake in existing rewrites
const fixedRewrites = existing.rewrites.map(([id, pergunta, resposta, dica]) => {
  let p = pergunta, r = resposta, d = dica || '';
  Object.entries(mojibakeMap).forEach(([from, to]) => {
    p = p.replace(from, to);
    r = r.replace(from, to);
    d = d.replace(from, to);
  });
  return [id, p, r, d];
});

const output = {
  rewrites: [...fixedRewrites, ...newRewrites],
  removes: existing.removes,
  merges: existing.merges
};

fs.writeFileSync('scripts/rewrite_data/dir_proc_penal.json', JSON.stringify(output, null, 2), 'utf8');
console.log('Total rewrites:', output.rewrites.length);
console.log('New rewrites added:', newRewrites.length);
let md = 0;
output.rewrites.forEach(([id, p]) => {
  Object.keys(mojibakeMap).forEach(k => { if (p.includes(k)) { md++; console.log('MOJI REMAINING:', id, p); }});
});
console.log('Mojibake remaining:', md);
