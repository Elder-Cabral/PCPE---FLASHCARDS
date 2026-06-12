import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(__dirname, '..', 'src', 'data', 'banco.json');
const banco = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const cards = banco.dir_penal;
const idx = {};
cards.forEach((c, i) => idx[c.id] = i);

// ─── REWRITE MAP ──────────────────────────────────────────────────────────
// [id, pergunta, resposta, dica]
const rewrites = [];

// 1-2: Dolo eventual + Culpa consciente -> merge num card comparativo
const card44 = cards[idx['dir_penal_44']];
const card45 = cards[idx['dir_penal_45']];
// Change card44 to comparative format
rewrites.push(['dir_penal_44',
  'Qual a diferença entre dolo eventual (art. 18, I, CP) e culpa consciente (art. 18, II, CP)?',
  'No dolo eventual, o agente não quer o resultado, mas assume o risco de produzi-lo — há indiferença quanto ao resultado (elemento volitivo: "que seja"). Na culpa consciente, o agente prevê o resultado, mas acredita sinceramente que não ocorrerá — há confiança excessiva na própria habilidade ou nas circunstâncias (elemento volitivo: "não vai dar nada"). Ambos têm previsão, mas diferem na atitude interna diante do risco.',
  'PEGADINHA CLÁSSICA CEBRASPE: a banca troca os conceitos. Mnemônico: Dolo Eventual = "tanto faz" / "que seja" (indiferença). Culpa Consciente = "vai dar certo" / "confiança". Decore: nos dois o agente prevê, mas no DE assume o risco; na CC confia que não ocorrerá. Exemplo CESPE: motorista em alta velocidade em via movimentada — se pensou "posso matar alguém, mas não ligo" = DE; se pensou "sou bom motorista, não vou bater" = CC. Júri julga DE (crime doloso contra vida), não julga CC (culpa).'
]);

// Mark card45 (culpa consciente) for merging — we'll reuse its text
rewrites.push(['dir_penal_45',
  '(REMOVIDO — conteúdo mesclado ao card dir_penal_44)',
  '(Ver card dir_penal_44 — Dolo eventual vs Culpa consciente)',
  ''
]);

// 3-4: Erro de tipo + Erro de proibição
rewrites.push(['dir_penal_46',
  'É correto afirmar que o erro de tipo (art. 20 CP) SEMPRE exclui o dolo e a culpa?',
  'NÃO. O erro de tipo pode ser evitável ou inevitável. Se inevitável (escusável), exclui o dolo E a culpa — o agente é isento de pena. Se evitável (inescusável), exclui só o dolo, mas o agente responde por culpa, se prevista em lei (art. 20, §1º CP). Erro de tipo é a falsa percepção sobre elemento do tipo penal (ex: pegar mala alheia pensando ser sua).',
  'CESPE adora trocar: erro de tipo x erro de proibição. Erro de tipo incide sobre elemento do FATO (ex: desconhecer que a coisa é alheia). Erro de proibição incide sobre a ILICITUDE (ex: achar que é permitido caçar). Mnemônico: TIPO = FATO; PROIBIÇÃO = ILÍCITO. Para o erro de tipo evitável, CESPE cobra que o erro recai sobre elementar do tipo e NÃO há crime culposo se não previsto em lei (ex: furto não tem forma culposa).'
]);

rewrites.push(['dir_penal_47',
  'Qual a consequência do erro de proibição (art. 21 CP) inevitável e do evitável?',
  'Se inevitável (escusável), o agente é isento de pena — desconhecia a ilicitude do fato sem possibilidade de saber. Se evitável (inescusável), a pena é diminuída de 1/6 a 1/3 (art. 21, parágrafo único CP). Erro de proibição é o desconhecimento da ilicitude da conduta (ex: estrangeiro que desconhece lei brasileira sobre porte de arma).',
  'DIFERENÇA CRÍTICA CEBRASPE: (1) Erro de tipo evitável = responde por culpa, se houver. (2) Erro de proibição evitável = pena diminuída (não vira culpa). (3) Erro de tipo incide sobre elementar do fato; erro de proibição sobre a norma proibitiva. (4) Se o erro é sobre descriminante putativa (art. 20, §1º CP), aplicam-se as regras do erro de tipo. Art. 21 CP + Súmula 599 STJ.'
]);

// 5: Excludentes de ilicitude
rewrites.push(['dir_penal_48',
  'Quais são as causas excludentes de ilicitude (art. 23 CP) e o que ocorre em caso de excesso?',
  'São quatro: estado de necessidade, legítima defesa, estrito cumprimento do dever legal e exercício regular de direito (art. 23 CP). Se o agente excede os limites da justificativa, responde pelo excesso doloso ou culposo (art. 23, parágrafo único CP). Excesso pode ser doloso (quis exceder) ou culposo (não teve cuidado).',
  'CESPE cobra: as excludentes de ilicitude incidem sobre a ANTIJURIDICIDADE, não sobre a tipicidade ou culpabilidade. Estrito cumprimento do dever legal é o que mais cai em carreiras policiais (ex: policial que cumpre mandado). Exercício regular de direito: direito de correção, intervenção médica consentida. Excesso: se o policial usa força desnecessária, responde pelo excesso — NÃO há legítima defesa. Art. 23-25 CP.'
]);

// 6: Legítima defesa
rewrites.push(['dir_penal_49',
  'É correto afirmar que a legítima defesa (art. 25 CP) exige agressão injusta, atual ou iminente, e o uso moderado de meios necessários?',
  'Sim. Requisitos previstos no art. 25 CP: (a) agressão INJUSTA (não há legítima defesa contra exercício regular de direito); (b) ATUAL ou IMINENTE (não cabe contra perigo futuro ou passado); (c) a direito PRÓPRIO ou ALHEIO; (d) uso MODERADO dos meios NECESSÁRIOS. Espécies: real (agressão existe), putativa (agente acredita erroneamente), excessiva (excesso punível, art. 23, parágrafo único CP).',
  'PEGADINHA CEBRASPE: (1) legítima defesa NÃO exige que o agente esgote todos os meios pacíficos antes de reagir — basta usar meio necessário e moderado. (2) Legítima defesa putativa = erro de tipo sobre descriminante (art. 20, §1º CP). (3) NÃO cabe legítima defesa contra estado de necessidade de outrem (quem age em estado de necessidade pratica fato típico, mas o agredido não pode usar legítima defesa contra quem age em estado de necessidade). (4) Súmula STJ: legítima defesa putativa evitável não exclui crime se havia possibilidade de conhecer a realidade.'
]);

// 7: Estado de necessidade
rewrites.push(['dir_penal_50',
  'Qual a diferença entre estado de necessidade (art. 24 CP) e legítima defesa (art. 25 CP)?',
  'Estado de necessidade: o agente pratica fato típico para salvar direito próprio ou alheio de perigo ATUAL, NÃO provocado voluntariamente, que não podia evitar de outro modo (art. 24 CP). Diferença essencial: na legítima defesa há agressão HUMANA; no estado de necessidade há perigo geral (não necessariamente de conduta humana — pode ser desastre natural, ataque de animal). O estado de necessidade pode ser próprio ou de terceiro, e exige proporcionalidade entre o bem sacrificado e o bem salvo.',
  'CESPE: (1) O estado de necessidade NÃO admite sacrifício de vida por outra vida (não se pode matar alguém para salvar outro, salvo se houver relação de dever). (2) Quem tem DEVER LEGAL de enfrentar o perigo (bombeiro, policial) não pode alegar estado de necessidade. (3) Diferença: legítima defesa = injusta agressão (humana); estado de necessidade = perigo (qualquer origem). (4) O direito sacrificado deve ser de valor IGUAL ou INFERIOR ao protegido (proporcionalidade). Art. 24 CP.'
]);

// 8: Excesso punível
rewrites.push(['dir_penal_73',
  'Em que situação o excesso na legítima defesa ou estado de necessidade é punível?',
  'O excesso é punível quando o agente usa meios desnecessários ou além do necessário para repelir a agressão ou evitar o perigo (art. 23, parágrafo único CP). Pode ser doloso (quis conscientemente exceder) ou culposo (não teve o cuidado devido ao avaliar a necessidade). O excesso exclui a justificante, e o agente responde pelo crime cometido, podendo ser beneficiado pelo perdão judicial em alguns casos (ex: excesso culposo por medo ou surpresa).',
  'PONTO CRÍTICO CEBRASPE: excesso NÃO se confunde com legítima defesa sucessiva. A legítima defesa sucessiva é a reação proporcional do agressor original contra o excesso do defensor — é uma NOVA legítima defesa. Excesso = o defensor original passa de vítima a agressor. Se o excesso resulta de medo, surpresa ou perturbação, pode haver perdão judicial (art. 121, §1º CP). Art. 23, parágrafo único CP.'
]);

// 9-10: Crimes hediondos
rewrites.push(['dir_penal_25',
  'É correto afirmar que o tráfico privilegiado (art. 33, §4º Lei 11.343/06) é considerado crime hediondo?',
  'NÃO. O STF (HC 118.533) firmou que o tráfico privilegiado (§4º) NÃO é hediondo, pois a lei o trata com regime mais brando. Os crimes hediondos estão listados no art. 1º da Lei 8.072/90 (homicídio qualificado, latrocínio, extorsão qualificada pela morte, estupro, estupro de vulnerável, genocídio, etc.). São insuscetíveis de anistia, graça, indulto e fiança (CF/88 art. 5º, XLIII).',
  'LISTA DE HEDIONDOS: decore os principais — homicídio qualificado, latrocínio, extorsão qualificada pela morte, estupro, estupro de vulnerável, genocídio. Equiparados (CF/88): tráfico de drogas (caput), tortura, terrorismo. ATENÇÃO: tráfico privilegiado (§4º) NÃO é hediondo. Lesão corporal seguida de morte (§3º) NÃO é hedionda. Peculato, corrupção, concussão NÃO são hediondos. Progressão: 40% (primário) ou 50% (reincidente) para hediondos com resultado morte. Lei 13.964/2019 (Pacote Anticrime).'
]);

rewrites.push(['dir_penal_39',
  'O tráfico de drogas (art. 33, caput, Lei 11.343/06) é crime hediondo? E o tráfico privilegiado (§4º)?',
  'O tráfico de drogas na forma do caput (art. 33) é equiparado a hediondo pela CF/88 (art. 5º, XLIII) e incluído na Lei 8.072/90. Já o tráfico privilegiado (art. 33, §4º — réu primário, bons antecedentes, não se dedica a atividade criminosa nem integra organização criminosa) NÃO é hediondo, conforme STF (HC 118.533). O §4º é causa de diminuição de pena (1/6 a 2/3) e exclui a hediondez.',
  'CESPE adora essa pegadinha: "tráfico é hediondo" — CERTEIRO se falar do caput; ERRADO se falar do §4º (tráfico privilegiado). Outra pegadinha: a CF/88 diz "tráfico ilícito de entorpecentes" no art. 5º, XLIII, mas a lei (8.072/90) e a jurisprudência (STF) distinguem caput e §4º. Crime de associação para o tráfico (art. 35) também NÃO é hediondo. Art. 33, §4º Lei 11.343/06 + HC 118.533 STF.'
]);

// 11: Organização criminosa
rewrites.push(['dir_penal_34',
  'Qual a diferença entre organização criminosa (Lei 12.850/13) e associação criminosa (art. 288 CP)?',
  'Organização criminosa (Lei 12.850/13, art. 1º, §1º): associação de 4 ou mais pessoas, estruturalmente ordenada, com divisão de tarefas, visando obter vantagem de qualquer natureza, mediante crimes cuja pena máxima seja superior a 4 anos ou transnacionais. Associação criminosa (art. 288 CP): associação de 3 ou mais pessoas para fins de cometer crimes (qualquer pena). Diferenças-chave: número mínimo de agentes (4 x 3), estrutura ordenada (exigido na org. criminosa), pena mínima dos crimes (org. criminosa exige crimes >4a ou transnacionais).',
  'PEGADINHA CESPE: associação criminosa = 3 pessoas (art. 288 CP). Organização criminosa = 4 pessoas (Lei 12.850/13). A org. criminosa exige estrutura ordenada e divisão de tarefas; a associação criminosa não. NÃO confunda com associação para o tráfico (art. 35 Lei 11.343/06 = 2 pessoas). CESPE já cobrou explicitamente esses números. Art. 288 CP x Lei 12.850/13 art. 1º, §1º.'
]);

// 12: Colaboração premiada
rewrites.push(['dir_penal_35',
  'Quais os benefícios da colaboração premiada (Lei 12.850/13) e em que NÃO pode ser aplicada?',
  'A colaboração premiada (art. 4º Lei 12.850/13) pode conceder: (I) perdão judicial; (II) redução da pena de até 2/3; (III) substituição da privativa de liberdade por restritiva de direitos. Requisitos: o colaborador deve fornecer informações efetivas que levem à identificação de coautores, recuperação de produtos do crime, localização de vítimas, etc. NÃO se aplica ao chefe da organização criminosa se este não for o primeiro a colaborar (art. 4º, §4º).',
  'PONTOS QUENTES CESPE: (1) redução máxima = 2/3 (NÃO há redução de 3/4 ou mais). (2) O delegado pode requerer, mas QUIEM HOMOLOGA é o juiz (art. 4º, §3º e §7º). (3) A colaboração pode ser feita na fase policial (com acompanhamento do MP) ou judicial. (4) O acordo deve conter o relato e as condições — se o colaborador mentir, perde os benefícios. (5) Lei 12.850/13 art. 4º. Cespe cobra: "a palavra do colaborador é a única prova" — errado, precisa de corroboração.'
]);

// 13: Insignificância  
rewrites.push(['dir_penal_60',
  'Em que situações NÃO se aplica o princípio da insignificância segundo o STF?',
  'O STF (HC 84.412) consolidou que o princípio da insignificância exige quatro vetores cumulativos: (a) mínima ofensividade da conduta; (b) ausência de periculosidade social; (c) reduzidíssimo grau de reprovabilidade; (d) inexpressividade da lesão jurídica. NÃO se aplica quando: há violência ou grave ameaça (ex: roubo), o valor é ínfimo mas há reincidência (STF mudou entendimento recente), ou o bem subtraído é de necessidade básica (ex: furto de alimentos para matar a fome — nesse caso pode ser aplicado, a depender das circunstâncias).',
  'CESPE adora: o princípio da insignificância exclui a TIPICIDADE MATERIAL (fato atípico), não a ilicitude ou culpabilidade. NÃO se aplica a crimes com violência ou grave ameaça. Reincidência: o STF vinha restringindo, mas recentemente passou a admitir em algumas hipóteses. Súmula 599 STJ: "é cabível o princípio da insignificância no crime de descaminho quando o valor do tributo não pago não ultrapassar R$ 20.000,00." ATENÇÃO: valor alterado pela Portaria MF 75/2024.'
]);

// 14: Tentativa
rewrites.push(['dir_penal_55',
  'Em que consiste o crime tentado (art. 14, II CP) e como se calcula a pena?',
  'Crime tentado: quando o agente inicia a execução de um crime, mas não se consuma por circunstâncias alheias à sua vontade (art. 14, II CP). Aplica-se a pena do crime consumado diminuída de 1/3 a 2/3 (art. 14, parágrafo único CP). O critério de redução é o ITER CRIMINIS percorrido: quanto mais próximo da consumação, menor a redução. NÃO admite tentativa: crimes culposos, preterdolosos (lesão seguida de morte), unissubsistentes (consumam-se em um único ato, ex: injúria verbal), crimes de atentado (ex: evasão mediante violência).',
  'CESPE costuma cobrar: (1) Tentativa exige dolo — crimes culposos não admitem tentativa. (2) Na desistência voluntária e arrependimento eficaz (art. 15 CP), responde SÓ pelos atos praticados (tentativa é descartada). (3) Crime falho = tentativa perfeita (agente esgotou os meios, mas o resultado não ocorreu). (4) Tentativa branca = o agente não atinge o objeto material (ex: disparo e não acerta). (5) Aplicação da redução de 1/3 a 2/3 conforme o iter criminis.'
]);

// 15-16: Desistência voluntária + Arrependimento eficaz
rewrites.push(['dir_penal_56',
  'Qual a consequência da desistência voluntária (art. 15 CP)? O agente responde por tentativa?',
  'NÃO. Na desistência voluntária, o agente abandona voluntariamente a execução do crime já iniciada. Por força do art. 15 CP, ele NÃO responde pela tentativa — responde apenas pelos atos já praticados. Se os atos praticados constituem outro crime (ex: violência, dano), responde por esses. A desistência deve ser voluntária (espontânea), mas não precisa ser espontânea no sentido moral — pode ser motivada por medo da punição, desde que a decisão seja do agente.',
  'DIFERENÇA CRÍTICA: na desistência voluntária, o agente PARA de agir; no arrependimento eficaz, ele termina a execução mas IMPEDE o resultado. Em ambos, não responde por tentativa. CESPE já cobrou: "se o agente desiste por estar com medo de ser preso, ainda é desistência voluntária?" — SIM, voluntariedade não exige motivação altruísta. Só NÃO é desistência se houve impossibilidade material de continuar (ex: chegou a polícia). Art. 15 CP.'
]);

rewrites.push(['dir_penal_57',
  'Qual a diferença entre arrependimento eficaz (art. 15 CP) e arrependimento posterior (art. 16 CP)?',
  'Arrependimento eficaz (art. 15 CP): o agente JÁ TERMINOU a execução do crime, mas impede voluntariamente o resultado — responde apenas pelos atos praticados. Ex: dá veneno, mas após arrepender-se, leva a vítima ao hospital e salva. Arrependimento posterior (art. 16 CP): o crime JÁ SE CONSUMA, mas o agente repara o dano ou restitui a coisa, voluntariamente, até o recebimento da denúncia — é causa de diminuição de pena de 1 a 2/3. O arrependimento posterior exige crime sem violência ou grave ameaça.',
  'CESPE troca os institutos. Mnemônico: ARREPENDIMENTO EFICAZ = impede consumação (≠ tentativa). ARREPENDIMENTO POSTERIOR = repara após consumação (diminuição 1 a 2/3). O eficaz se aplica a QUALQUER crime; o posterior NÃO se aplica a crimes com violência ou grave ameaça. Art. 15 e art. 16 CP.'
]);

// 17: Abuso de autoridade
rewrites.push(['dir_penal_28',
  'É correto afirmar que o crime de abuso de autoridade (Lei 13.869/2019) exige resultado naturalístico?',
  'NÃO. O abuso de autoridade é CRIME FORMAL — consuma-se com a conduta + finalidade específica de prejudicar, beneficiar ou mero capricho (dolo específico), independentemente de dano efetivo (art. 1º, §1º Lei 13.869/19). Exige que o agente público atue com finalidade de prejudicar outrem, beneficiar a si ou a terceiro, ou por mero capricho. TODOS os tipos da lei exigem dolo específico (não há modalidade culposa). A ação penal é pública condicionada à representação do ofendido (art. 16), salvo se o interesse público justificar a atuação de ofício do MP.',
  'PONTOS CEBRASPE: (1) NÃO há modalidade culposa. (2) Dolo específico é ESSENCIAL — se o agente agiu sem essa finalidade, não há crime. (3) A pena é de DETENÇÃO de 6 meses a 2 anos (admite penas restritivas de direito e sursis). (4) Inabilitação para cargo eletivo por até 5 anos (art. 10). (5) Aplica-se a qualquer Poder — Executivo, Legislativo, Judiciário, MP, TC (art. 2º). Lei 13.869/2019. ATENÇÃO ao art. 16 (representação como condição de procedibilidade).'
]);

// 18: Tortura
rewrites.push(['dir_penal_29',
  'A tortura (Lei 9.455/97) é crime próprio ou comum? E quais as suas modalidades?',
  'É crime COMUM — qualquer pessoa pode ser sujeito ativo. Aumento de pena de 1/6 a 1/3 se o crime é praticado por agente público (art. 1º, §4º, II). Modalidades (art. 1º, I): (a) tortura-confissão — constranger alguém com violência ou grave ameaça para obter informação ou confissão; (b) tortura-castigo — para provocar ação ou omissão de natureza criminosa; (c) tortura-discriminação — em razão de discriminação racial ou religiosa. Penas: 2 a 8 anos (caput), 4 a 10 anos (lesão grave), 8 a 16 anos (morte).',
  'ATENÇÃO CEBRASPE: (1) Tortura NÃO é crime próprio — o aumento para agente público é majorante, não elementar. (2) É inafiançável (CF/88 art. 5º, XLIII). (3) Ação penal pública incondicionada. (4) Crime hediondo (equiparado). (5) NÃO confunda com o crime de constrangimento ilegal (art. 146 CP) nem com abuso de autoridade (Lei 13.869/19). Lei 9.455/97 art. 1º. Cespe já cobrou distinção entre as três modalidades.'
]);

// 19: Inimputabilidade
rewrites.push(['dir_penal_58',
  'Quem são os inimputáveis no CP e qual a consequência penal?',
  'São inimputáveis (art. 26 CP): (a) menores de 18 anos (art. 27 CP + art. 228 CF/88); (b) doentes mentais; (c) desenvolvimento mental incompleto ou retardado. A consequência é a aplicação de MEDIDA DE SEGURANÇA (detentiva — internação em hospital de custódia; restritiva — tratamento ambulatorial), e não pena. A imputabilidade é aferida no momento da ação ou omissão (teoria da atividade, art. 4º CP).',
  'PEGADINHA CESPE: (1) Menor de 18 anos é absolutamente inimputável — NÃO responde penalmente, submete-se ao ECA. (2) Doente mental que, no momento do fato, era inteiramente incapaz = inimputável. Se a doença mental não tirava totalmente a capacidade = semi-imputável (pena reduzida de 1/3 a 2/3 — art. 26, parágrafo único CP). (3) Emoção ou paixão NÃO excluem a imputabilidade (art. 28, I CP). (4) Embriaguez voluntária ou culposa NÃO exclui (art. 28, II CP). Art. 26-28 CP.'
]);

// 20-21: Concurso material + formal
rewrites.push(['dir_penal_61',
  'Como se aplica a pena no concurso material de crimes (art. 69 CP)?',
  'No concurso material (art. 69 CP), o agente pratica dois ou mais crimes mediante condutas autônomas e distintas. As penas são SOMADAS (cumulação material). Ex: agente furta (2-8 anos) e depois estupra (6-10 anos) — cumulam-se as penas. Não há limite máximo para a soma. O regime inicial é calculado considerando o total da pena unificada.',
  'DIFERENÇA ESSENCIAL: concurso material = várias condutas + vários crimes. Concurso formal = uma conduta + vários crimes. Crime continuado = várias condutas + vários crimes da mesma espécie (mesmas condições de tempo, lugar e execução). Nenhum confunda com o concurso aparente de normas (um fato, duas normas — resolve-se pelos princípios da especialidade, subsidiariedade, consunção e alternatividade). Art. 69, 70, 71 CP.'
]);

rewrites.push(['dir_penal_62',
  'Qual a diferença entre concurso formal (art. 70 CP) próprio e impróprio?',
  'Concurso formal PRÓPRIO: uma conduta dá origem a dois ou mais crimes, mas o agente NÃO quis nem assumiu o risco de produzir múltiplos resultados — aplica-se a pena mais grave, aumentada de 1/6 a 1/2 (sistema da exasperação). Concurso formal IMPRÓPRIO: os crimes decorrem de desígnios autônomos — aplica-se o sistema do cúmulo material (penas somadas). Ex próprio: um só tiro atinge duas pessoas (sem intenção). Ex impróprio: um só tiro atinge duas pessoas, mas o agente QUIS matar ambas.',
  'CESPE adora cobrar a diferença entre o sistema do concurso formal próprio (exasperação) e impróprio (cúmulo material). No formal próprio, o aumento é de 1/6 a 1/2 — se as penas são iguais, qualquer aumento serve; se diferentes, aumenta-se a maior. Art. 70 CP. Crime continuado (art. 71 CP) também usa exasperação: maior pena aumentada de 1/6 a 2/3 (ou 1/6 a 3x se violento).'
]);

// 22: Participação criminosa
rewrites.push(['dir_penal_63',
  'No concurso de agentes (art. 29 CP), o partícipe responde na mesma medida que o autor?',
  'Regra geral: todos os que concorrem para o crime respondem na medida da sua culpabilidade (art. 29, caput CP). Exceção: se o partícipe queria participar de crime MENOS grave e ocorreu crime MAIS grave, responde apenas pelo menos grave, salvo se o mais grave era previsível (art. 29, §2º CP — cooperação dolosamente distinta). O partícipe contribui sem ser executor (induz, instiga, auxilia). Autor é quem executa o núcleo do tipo. Distingue-se da autoria mediata (autor usa pessoa como instrumento).',
  'PONTO CEBRASPE: (1) Teoria adotada é a MONISTA (todos respondem pelo mesmo crime), com a exceção do art. 29, §2º (cooperação dolosamente distinta). (2) Autoria colateral: dois agentes, independentemente, tentam matar a vítima — cada um responde pela sua conduta. (3) Autoria incerta: não se sabe quem matou — se havia liame subjetivo, ambos respondem. (4) Participação de menor importância: redução de 1/6 a 1/3 (art. 29, §1º CP). Art. 29-31 CP.'
]);

// 23: Crime continuado
rewrites.push(['dir_penal_52',
  'Quais os requisitos do crime continuado (art. 71 CP) e qual a consequência penal?',
  'Crime continuado: duas ou mais condutas da mesma espécie, unidas por condições de tempo, lugar e modo de execução semelhantes (art. 71 CP). Aplica-se a pena de um dos crimes (o mais grave) aumentada de 1/6 a 2/3 (sistema da exasperação). Se os crimes são violentos contra pessoa, o aumento pode chegar a 3x a maior pena (art. 71, parágrafo único CP). Continuidade delitiva NÃO se confunde com crime habitual (ex: exercício ilegal da medicina — exige reiteração para configurar).',
  'CESPE: os requisitos são: (a) mesmas condições de tempo (proximidade temporal), (b) mesmo lugar, (c) mesmo modo de execução. A continuidade NÃO se aplica se há interrupção por condenação definitiva. Súmula 711 STF: se lei mais grave entra em vigor durante a continuidade, aplica-se a todos os crimes da série — CESPE já cobrou essa questão. Crime continuado específico (art. 71, parágrafo único): crimes violentos contra vítimas diferentes — aumento de até 3x.'
]);

// 24-25: Peculato + Concussão
rewrites.push(['dir_penal_21',
  'Qual a diferença entre peculato (art. 312 CP) e concussão (art. 316 CP)?',
  'Peculato (art. 312 CP): o funcionário público se apropria de bem público ou particular em razão do cargo, ou dá ao bem destinação diversa (peculato-desvio). Pena: 2 a 12 anos. Concussão (art. 316 CP): o funcionário EXIGE vantagem indevida para si ou para outrem, em razão da função. Pena: 2 a 8 anos. A diferença-chave: no peculato o bem JÁ está sob posse do funcionário (se apropria, desvia); na concussão o funcionário EXIGE vantagem que ainda não possui.',
  'CESPE confunde. Mnemônico: PECULATO = já tenho (apropriação/desvio). CONCUSSÃO = quero (exigir). Corrupção passiva (art. 317 CP) = pedir/receber (não exige — é solicitar ou receber). Peculato de uso (doutrina): usar o bem sem intenção de se apropriar — STF entende que não é crime se for uso momentâneo e sem intenção de apropriação. Todos são crimes próprios (exigem qualidade de funcionário público). Arts. 312, 316, 317 CP.'
]);

// 26-27: Corrupção passiva + ativa
rewrites.push(['dir_penal_22',
  'Qual a diferença entre corrupção passiva (art. 317 CP) e concussão (art. 316 CP)?',
  'Na corrupção passiva (art. 317 CP), o funcionário público SOLICITA ou RECEBE vantagem indevida, para si ou para outrem, ainda que fora da função ou antes de assumi-la (art. 317, §1º CP). Na concussão, o funcionário EXIGE vantagem indevida. A diferença: na concussão há EXIGÊNCIA (pressão, coação moral); na corrupção passiva há SOLICITAÇÃO ou RECEBIMENTO (o particular pode recusar sem sofrer retaliação imediata). Pena corrupção passiva: 2 a 12 anos + multa. Corrupção ativa (art. 333 CP): 2 a 12 anos — oferecer ou prometer vantagem indevida.',
  'PEGADINHA CEBRASPE: (1) Corrupção passiva admite a modalidade "antes de assumir" (§1º) — oferecer cargo em troca de propina futura. (2) Corrupção ativa é crime cometido pelo PARTICULAR contra a Administração. (3) Distinção sutil entre concussão (exigir) e corrupção passiva (solicitar/receber): na concussão há imposição, na passiva há pedido. (4) Se o funcionário RECEBE vantagem que não solicitou nem exigiu, sem praticar qualquer ato = não há crime de corrupção (pode ser peculato se desviar). Arts. 317, 316, 333 CP.'
]);

// 28: Crimes contra adm pública (desobediência, resistência, desacato)
rewrites.push(['dir_penal_66',
  'Qual a diferença entre desobediência (art. 330 CP), resistência (art. 329 CP) e desacato (art. 331 CP)?',
  'Desobediência (art. 330 CP): desobedecer ordem legal de funcionário público — detenção 15 dias a 6 meses. Resistência (art. 329 CP): opor-se à execução de ato legal mediante violência ou grave ameaça — detenção 2 meses a 2 anos. Desacato (art. 331 CP): desacatar funcionário público no exercício da função ou em razão dela — detenção 6 meses a 2 anos. A resistência exige violência ou ameaça; a desobediência não — basta a mera desobediência a ordem legal.',
  'DISTINÇÃO CEBRASPE: (1) Desobediência = não fazer o que foi ordenado legalmente (crime omissivo). (2) Resistência = fazer oposição ativa com violência/ameaça (crime comissivo). (3) Desacato = ofensa à honra/dignidade do funcionário (ofensa verbal ou gestual). ATENÇÃO: o STF (ADPF 496) debate a constitucionalidade do desacato, mas a lei ainda está em vigor e é cobrada em concursos. Arts. 329-331 CP. Cespe cobra: se a violência na resistência causa lesão corporal, responde por resistência + lesão (concurso material).'
]);

// 29: Modalidades de culpa (merge)
rewrites.push(['dir_penal_69',
  'Quais as três modalidades de culpa no CP e como diferenciá-las?',
  'São três (art. 18, II CP): (a) NEGLIGÊNCIA — omissão do cuidado devido (o agente deixa de fazer o que deveria); (b) IMPRUDÊNCIA — ação arriscada (o agente faz o que não deveria); (c) IMPERÍCIA — falta de aptidão técnica (não sabe fazer corretamente). Em todas, o agente não quer o resultado nem assume o risco (diferente do dolo eventual). A culpa consciente é uma espécie de imprudência em que o agente prevê o resultado mas acredita que não ocorrerá.',
  'MNEMÔNICO: NEGLIGÊNCIA = NÃO FAZ (deixou de fazer). IMPRUDÊNCIA = FAZ MAL (fez sem cuidado). IMPERÍCIA = NÃO SABE FAZER (falta técnica). CESPE costuma dar exemplos e pedir para classificar: "deixar de recolher passagem de nível" = negligência; "fazer ultrapassagem proibida" = imprudência; "médico que faz cirurgia sem especialização" = imperícia. Importante: o CP NÃO define essas modalidades — é construção doutrinária e jurisprudencial. Art. 18, II CP.'
]);

// 30: Extraterritorialidade
rewrites.push(['dir_penal_87',
  'Qual a diferença entre extraterritorialidade incondicionada (art. 7º, I CP) e condicionada (art. 7º, II CP)?',
  'Incondicionada (art. 7º, I CP): aplica-se a lei brasileira independentemente de qualquer condição. Crimes: atentado contra a vida do Presidente da República, genocídio, crimes contra o patrimônio da União, crimes praticados na administração pública federal, crimes previstos em tratados. Condicionada (art. 7º, II CP): exige requisitos cumulativos — (a) o agente entrou no Brasil, (b) o fato é crime no Brasil e no país de execução (dupla incriminação), (c) consta de tratado ou o Brasil pode extraditar, (d) não foi julgado no exterior.',
  'CESPE cobra os requisitos da condicionada. Mnemônico: Incondicionada = sem "mas". Condicionada = "mas" (requisitos). Art. 7º, CP. Art. 5º, CP: territorialidade temperada (NÃO é absoluta). Súmula STF: "a lei penal brasileira aplica-se ao crime cometido em navio mercante brasileiro, em alto-mar" — extensão do território nacional (art. 5º, §§1º-2º CP). Navio público = sempre território brasileiro. Navio privado = só em alto-mar.'
]);

// ─── REDUNDANT CARDS TO MERGE/REMOVE ──────────────────────────────────────
// Mark dir_penal_new_106 through dir_penal_new_121 as removed
const removeIds = [
  'dir_penal_new_106', 'dir_penal_new_107', 'dir_penal_new_108', 'dir_penal_new_109',
  'dir_penal_new_110', 'dir_penal_new_111', 'dir_penal_new_112', 'dir_penal_new_113',
  'dir_penal_new_114', 'dir_penal_new_115', 'dir_penal_new_116', 'dir_penal_new_117',
  'dir_penal_new_118', 'dir_penal_new_119', 'dir_penal_new_120', 'dir_penal_new_121',
  'dir_penal_45'
];

for (const rid of removeIds) {
  if (idx[rid] !== undefined) {
    rewrites.push([rid,
      '(CARD REMOVIDO)',
      '(CARD REMOVIDO — conteúdo mesclado em outro card)',
      ''
    ]);
  }
}

// ─── APPLY REWRITES ────────────────────────────────────────────────────────
let changes = 0;
for (const [id, pergunta, resposta, dica] of rewrites) {
  const i = idx[id];
  if (i === undefined) {
    console.log('ID não encontrado:', id);
    continue;
  }
  // Only update if content changed
  if (cards[i].pergunta !== pergunta || cards[i].resposta !== resposta || cards[i].dica !== dica) {
    cards[i].pergunta = pergunta;
    cards[i].resposta = resposta;
    cards[i].dica = dica;
    changes++;
    console.log('  ✓', id);
  }
}

// ─── SAVE ──────────────────────────────────────────────────────────────────
fs.writeFileSync(filePath, JSON.stringify(banco, null, 2) + '\n', 'utf8');
console.log('\n' + changes + ' cards atualizados em dir_penal');
console.log((cards.length - removeIds.length) + ' cards ativos (após remoção de ' + removeIds.length + ' redundantes)');
