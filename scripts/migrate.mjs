import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BANCO_PATH = path.join(ROOT, 'src', 'data', 'banco.json');
const MD_PATH = process.argv[2] || path.join(ROOT, 'flashcards_pcpe_agente.md');


const banco = JSON.parse(fs.readFileSync(BANCO_PATH, 'utf8'));
const mdContent = fs.readFileSync(MD_PATH, 'utf8');

// ============================================================
// TOPIC STRUCTURE
// ============================================================
const TOPIC_STRUCTURE = {
  leg_estadual: [
    { codigo: "1", topico: "Constituição do Estado de Pernambuco (artigos 101 a 105-B)" },
    { codigo: "2", topico: "Lei nº 6.425/1972 - Estatuto do Policial Civil" },
    { codigo: "3", topico: "Lei nº 6.123/1968 - Estatuto do Servidor do Estado de Pernambuco" },
    { codigo: "4", topico: "Lei Complementar nº 137/2008" },
    { codigo: "5", topico: "Lei Complementar nº 317/2015" },
  ],
  dir_const: [
    { codigo: "1", topico: "Constituição da República Federativa do Brasil de 1988" },
    { codigo: "1.1", topico: "Princípios fundamentais" },
    { codigo: "1.2", topico: "Poderes Constituintes Originário, Derivado e Decorrente" },
    { codigo: "2", topico: "Aplicabilidade das normas constitucionais" },
    { codigo: "3", topico: "Direitos e garantias fundamentais" },
    { codigo: "4", topico: "Organização político-administrativa do Estado" },
    { codigo: "4.1", topico: "Estado federal brasileiro, União, estados, Distrito Federal, municípios e territórios" },
    { codigo: "5", topico: "Administração pública" },
    { codigo: "5.1", topico: "Disposições gerais, servidores públicos" },
    { codigo: "5.2", topico: "Princípios implícitos da administração pública" },
    { codigo: "6", topico: "Poder executivo" },
    { codigo: "7", topico: "Poder legislativo" },
    { codigo: "8", topico: "Poder judiciário" },
    { codigo: "9", topico: "Funções essenciais à justiça" },
    { codigo: "9.1", topico: "Ministério Público, Advocacia Pública" },
    { codigo: "9.2", topico: "Defensoria Pública" },
    { codigo: "9.3", topico: "Da Defesa do Estado e das Instituições Democráticas" },
    { codigo: "9.4", topico: "Segurança Pública na Constituição do Estado de Pernambuco" },
  ],
  dir_adm: [
    { codigo: "1", topico: "Estado, governo e administração pública" },
    { codigo: "2", topico: "Direito administrativo" },
    { codigo: "3", topico: "Ato administrativo" },
    { codigo: "4", topico: "Poderes da administração pública" },
    { codigo: "4.1", topico: "Hierárquico, disciplinar, regulamentar e de polícia" },
    { codigo: "4.2", topico: "Uso e abuso do poder" },
    { codigo: "5", topico: "Regime jurídico-administrativo" },
    { codigo: "5.1", topico: "Conceito" },
    { codigo: "5.2", topico: "Princípios expressos e implícitos da administração pública" },
    { codigo: "6", topico: "Responsabilidade civil do Estado" },
    { codigo: "7", topico: "Serviços públicos" },
    { codigo: "8", topico: "Organização administrativa" },
    { codigo: "8.1", topico: "Centralização, descentralização, concentração e desconcentração" },
    { codigo: "8.2", topico: "Administração direta e indireta" },
    { codigo: "9", topico: "Controle da administração pública" },
    { codigo: "9.1", topico: "Controle exercido pela administração pública" },
    { codigo: "9.2", topico: "Controle judicial" },
    { codigo: "9.3", topico: "Controle legislativo" },
    { codigo: "9.4", topico: "Improbidade administrativa" },
    { codigo: "10", topico: "Processo administrativo" },
    { codigo: "11", topico: "Licitações e contratos administrativos" },
    { codigo: "12", topico: "Agente público" },
    { codigo: "12.1", topico: "Legislação pertinente" },
    { codigo: "12.1.1", topico: "Disposições constitucionais aplicáveis" },
    { codigo: "13", topico: "Cargo, emprego e função pública" },
  ],
  dir_penal: [
    { codigo: "1", topico: "Princípios básicos" },
    { codigo: "2", topico: "Crime e Contravenção Penal" },
    { codigo: "3", topico: "Aplicação da lei penal" },
    { codigo: "3.1", topico: "A lei penal no tempo e no espaço" },
    { codigo: "3.2", topico: "Tempo e lugar do crime" },
    { codigo: "3.3", topico: "Lei penal excepcional, especial e temporária" },
    { codigo: "3.4", topico: "Territorialidade e extraterritorialidade da lei penal" },
    { codigo: "3.5", topico: "Contagem de prazo" },
    { codigo: "3.6", topico: "Irretroatividade da lei penal" },
    { codigo: "4", topico: "Crimes contra a pessoa" },
    { codigo: "5", topico: "Crimes contra o patrimônio" },
    { codigo: "6", topico: "Crimes contra a dignidade sexual" },
    { codigo: "7", topico: "Crimes contra a administração pública" },
    { codigo: "8", topico: "Crimes Hediondos (Lei nº 8.072/1990)" },
    { codigo: "9", topico: "Crimes resultantes de Preconceito de Raça ou de Cor (Lei nº 7.716/1989)" },
    { codigo: "10", topico: "Crimes de Abuso de Autoridade (Lei nº 13.869/2019)" },
    { codigo: "11", topico: "Crimes de Tortura (Lei nº 9.455/1997)" },
    { codigo: "12", topico: "Estatuto da Criança e do Adolescente (Lei nº 8.069/1990)" },
    { codigo: "13", topico: "Organizações Criminosas (Lei nº 12.850/2013)" },
    { codigo: "14", topico: "Crimes de Trânsito (Lei nº 9.503/1997)" },
    { codigo: "15", topico: "Violência doméstica e familiar contra a mulher (Lei nº 11.340/2006)" },
    { codigo: "16", topico: "Lei de Drogas (Lei nº 11.343/2006)" },
    { codigo: "17", topico: "Violência doméstica e familiar contra a criança e o adolescente (Lei nº 14.344/2022)" },
    { codigo: "18", topico: "Crimes Ambientais (Lei nº 9.605/1998)" },
    { codigo: "19", topico: "Estatuto do Desarmamento (Lei nº 10.826/2003)" },
    { codigo: "20", topico: "Disposições constitucionais aplicáveis ao direito penal" },
  ],
  dir_proc_penal: [
    { codigo: "1", topico: "Aplicação da lei processual no tempo, no espaço e em relação às pessoas" },
    { codigo: "1.1", topico: "Disposições preliminares do Código de Processo Penal" },
    { codigo: "2", topico: "Inquérito policial" },
    { codigo: "3", topico: "Prova" },
    { codigo: "4", topico: "Prisão e liberdade provisória" },
    { codigo: "5", topico: "Medidas cautelares diversas da prisão" },
    { codigo: "6", topico: "Lei nº 7.960/1989 (prisão temporária)" },
    { codigo: "7", topico: "Juizados Especiais Criminais (Lei nº 9.099/1995)" },
    { codigo: "8", topico: "Investigação Criminal (Lei nº 12.830/2013)" },
    { codigo: "9", topico: "Disposições constitucionais aplicáveis ao direito processual penal" },
  ],
  portugues: [
    { codigo: "1", topico: "Compreensão e interpretação de textos de gêneros variados" },
    { codigo: "2", topico: "Reconhecimento de tipos e gêneros textuais" },
    { codigo: "3", topico: "Domínio da ortografia oficial" },
    { codigo: "4", topico: "Domínio dos mecanismos de coesão textual" },
    { codigo: "4.1", topico: "Emprego de elementos de referenciação, substituição e repetição, de conectores e de outros elementos de sequenciação textual" },
    { codigo: "4.2", topico: "Emprego de tempos e modos verbais" },
    { codigo: "5", topico: "Domínio da estrutura morfossintática do período" },
    { codigo: "5.1", topico: "Emprego das classes de palavras" },
    { codigo: "5.2", topico: "Relações de coordenação entre orações e entre termos da oração" },
    { codigo: "5.3", topico: "Relações de subordinação entre orações e entre termos da oração" },
    { codigo: "5.4", topico: "Emprego dos sinais de pontuação" },
    { codigo: "5.5", topico: "Concordância verbal e nominal" },
    { codigo: "5.6", topico: "Regência verbal e nominal" },
    { codigo: "5.7", topico: "Emprego do sinal indicativo de crase" },
    { codigo: "5.8", topico: "Colocação dos pronomes átonos" },
    { codigo: "6", topico: "Reescrita de frases e parágrafos do texto" },
    { codigo: "6.1", topico: "Significação das palavras" },
    { codigo: "6.2", topico: "Substituição de palavras ou de trechos de texto" },
    { codigo: "6.3", topico: "Reorganização da estrutura de orações e de períodos do texto" },
    { codigo: "6.4", topico: "Reescrita de textos de diferentes gêneros e níveis de formalidade" },
    { codigo: "7", topico: "Correspondência oficial (conforme Manual de Redação da Presidência da República)" },
    { codigo: "7.1", topico: "Aspectos gerais da redação oficial" },
    { codigo: "7.2", topico: "Finalidade dos expedientes oficiais" },
    { codigo: "7.3", topico: "Adequação da linguagem ao tipo de documento" },
    { codigo: "7.4", topico: "Adequação do formato do texto ao gênero" },
  ],
  informatica: [
    { codigo: "1", topico: "Sistema Operacional Windows: fundamentos do Windows" },
    { codigo: "1.1", topico: "Trabalho com pastas e arquivos: localização, movimentação, cópia, criação e exclusão de arquivos e pastas" },
    { codigo: "1.2", topico: "Configurações Básicas do Windows: resolução da tela, cores, fontes, impressoras, aparência, segundo plano, protetor de tela" },
    { codigo: "1.3", topico: "Windows Explorer" },
    { codigo: "1.4", topico: "Processador de Textos Word" },
    { codigo: "1.4.1", topico: "Formatação de documentos: margens, tabulação, recuo, espaçamento, fontes, destaques" },
    { codigo: "1.4.2", topico: "Organização do texto em listas e colunas" },
    { codigo: "1.4.3", topico: "Tabelas" },
    { codigo: "1.4.4", topico: "Estilos e modelos" },
    { codigo: "1.4.5", topico: "Cabeçalhos e Rodapés" },
    { codigo: "1.4.6", topico: "Configuração de Página" },
    { codigo: "1.5", topico: "Planilha Eletrônica Excel" },
    { codigo: "1.5.1", topico: "Introdução de números, textos, fórmulas e datas; referência absoluta e relativa" },
    { codigo: "1.5.2", topico: "Principais funções do Excel: matemáticas, estatísticas, data-hora, financeiras e de texto" },
    { codigo: "1.5.3", topico: "Formatação de planilhas: número, alinhamento, borda, fonte, padrões" },
    { codigo: "1.5.4", topico: "Edição da planilha: copiar, colar, recortar, limpar, marcar" },
    { codigo: "1.5.5", topico: "Classificação de dados nas planilhas" },
    { codigo: "1.5.6", topico: "Gráficos" },
    { codigo: "1.6", topico: "Software de apresentação do PowerPoint" },
    { codigo: "2", topico: "Redes de Computadores" },
  ],
  raciocinio: [
    { codigo: "1", topico: "Conjuntos numéricos: números inteiros, racionais e reais" },
    { codigo: "2", topico: "Sistema legal de medidas" },
    { codigo: "3", topico: "Razões e proporções" },
    { codigo: "3.1", topico: "Divisão proporcional" },
    { codigo: "3.2", topico: "Regras de três simples e compostas" },
    { codigo: "3.3", topico: "Porcentagens" },
    { codigo: "4", topico: "Equações e inequações de 1º e de 2º graus" },
    { codigo: "5", topico: "Sistemas lineares" },
    { codigo: "6", topico: "Funções e gráficos" },
    { codigo: "7", topico: "Princípios de contagem" },
    { codigo: "8", topico: "Progressões aritméticas e geométricas" },
    { codigo: "9", topico: "Compreensão de estruturas lógicas" },
    { codigo: "10", topico: "Lógica de argumentação: analogias, inferências, deduções e conclusões" },
    { codigo: "11", topico: "Lógica sentencial (ou proposicional)" },
    { codigo: "11.1", topico: "Proposições simples e compostas" },
    { codigo: "11.2", topico: "Tabelas-verdade" },
    { codigo: "11.3", topico: "Equivalências" },
    { codigo: "11.4", topico: "Leis de Morgan" },
    { codigo: "11.5", topico: "Diagramas lógicos" },
    { codigo: "12", topico: "Lógica de primeira ordem" },
    { codigo: "13", topico: "Princípios de contagem e probabilidade" },
    { codigo: "14", topico: "Operações com conjuntos" },
    { codigo: "15", topico: "Raciocínio lógico envolvendo problemas aritméticos, geométricos e matriciais" },
  ],
  contabilidade: [
    { codigo: "1", topico: "Conceitos, objetivos e finalidades da contabilidade" },
    { codigo: "2", topico: "Patrimônio: componentes, equação fundamental do patrimônio, situação líquida, representação gráfica" },
    { codigo: "3", topico: "Atos e fatos administrativos: conceitos, fatos permutativos, modificativos e mistos" },
    { codigo: "4", topico: "Contas: conceitos, contas de débitos, contas de créditos e saldos" },
    { codigo: "5", topico: "Plano de contas: conceitos, elenco de contas, função e funcionamento das contas" },
    { codigo: "6", topico: "Escrituração: conceitos, lançamentos contábeis, elementos essenciais, fórmulas de lançamentos, livros de escrituração, métodos e processos, regime de competência e regime de caixa" },
    { codigo: "7", topico: "Contabilização de operações contábeis diversas: juros, descontos, tributos, aluguéis, variação monetária/cambial, folha de pagamento, compras, vendas e provisões, depreciações e baixa de bens" },
    { codigo: "8", topico: "Balancete de verificação: conceitos, modelos e técnicas de elaboração" },
    { codigo: "9", topico: "Balanço patrimonial: conceitos, objetivo, composição" },
    { codigo: "10", topico: "Demonstração de resultado de exercício: conceito, objetivo, composição" },
    { codigo: "11", topico: "Normas Brasileiras de Contabilidade" },
  ],
  estatistica: [
    { codigo: "1", topico: "Estatística descritiva e análise exploratória de dados: gráficos, diagramas, tabelas, medidas descritivas (posição, dispersão, assimetria e curtose)" },
    { codigo: "2", topico: "Probabilidade" },
    { codigo: "2.1", topico: "Definições básicas e axiomas" },
    { codigo: "2.2", topico: "Probabilidade condicional e independência" },
    { codigo: "3", topico: "Técnicas de amostragem: amostragem aleatória simples, estratificada, sistemática e por conglomerados" },
    { codigo: "3.1", topico: "Tamanho amostral" },
  ],
};

// ============================================================
// CARD OVERRIDES MAPPING
// ============================================================
const LEG_ESTADUAL_MAP = {
  "Constituição de PE (Arts. 101 a 105-B)": "1",
  "Estatuto do Policial Civil (Lei 6.425/72)": "2",
  "Estatuto do Servidor (Lei 6.123/68)": "3",
  "Organização da PC-PE (LC 137/08)": "4",
  "Plano de Cargos e Carreiras (LC 317/15)": "5",
};

const CO = {};
CO.dir_const = {"3":"3","5":"2","6":"2","7":"2","0":"1.1","1":"1.1","2":"1.1","4":"1.1","44":"1.1","51":"1.1","58":"1.1","70":"1.1","35":"1.1","57":"1.1","75":"1.1","16":"5.1","21":"5.1","22":"5.1","23":"5.1","91":"5.1","65":"5.1","61":"5.2","62":"5.2","20":"4.1","34":"4.1","37":"4.1","76":"4.1","89":"4.1","36":"4.1","24":"7","43":"7","25":"8","33":"8","55":"8","77":"8","78":"8","81":"8","32":"8","26":"9.1","56":"9.1","27":"9.2","73":"9.2","28":"9","29":"9","30":"9","31":"9","52":"9","38":"9.3","39":"9.3","46":"9.4","47":"9.4","80":"9.4","60":"6","40":"3","41":"3","42":"3","45":"3","48":"3","49":"3","50":"3","53":"3","54":"3","63":"3","64":"3","66":"3","67":"3","68":"3","69":"3","71":"3","72":"3","74":"3","79":"3","82":"3","83":"3","84":"3","85":"3","86":"3","87":"3","88":"3","90":"3"};
CO.dir_adm = {"0":"1","1":"1","20":"5.1","21":"5","70":"5.1","71":"5.1","2":"3","3":"3","4":"3","5":"3","6":"3","7":"3","8":"3","9":"3","10":"3","11":"3","14":"3","16":"4.1","17":"3","18":"4.2","19":"4.2","30":"8.1","38":"10","43":"12","44":"13","45":"3","46":"3","48":"3","54":"3","55":"3","61":"3","65":"3","76":"3","77":"3","80":"3","72":"13","83":"13","93":"3","12":"4.1","13":"4.1","14":"4.1","15":"4.1","35":"9.2","37":"9.4","47":"5.2","59":"9.1","62":"9.3","63":"9.3","74":"9.1","75":"4.1","78":"4.1","81":"9.1","82":"9.3","84":"9.2","91":"9.3","22":"6","23":"6","24":"8.2","25":"8.2","26":"8.2","27":"8.2","28":"8.2","29":"8.1","31":"7","32":"7","33":"7","34":"7","36":"9.1","49":"7","50":"7","51":"7","52":"7","53":"7","58":"7","60":"5.2","64":"5.2","66":"5.2","67":"7","68":"7","69":"7","73":"5.2","79":"8.2","85":"8.2","86":"8.2","89":"8.2","92":"5.2","94":"6","39":"11","40":"11","41":"11","42":"11","56":"11","57":"11","87":"11","88":"11","90":"11"};
CO.dir_penal = {"0":"1","1":"1","2":"1","3":"2","4":"2","5":"3.6","6":"3.3","7":"3.3","8":"3.2","9":"3.2","10":"4","11":"4","12":"4","13":"4","14":"5","15":"5","16":"5","17":"5","18":"5","19":"6","20":"6","21":"7","22":"7","23":"7","24":"7","66":"7","67":"7","68":"7","72":"7","90":"7","91":"7","25":"8","26":"9","27":"9","28":"10","29":"11","30":"11","31":"12","32":"12","33":"12","59":"12","34":"13","35":"13","36":"14","37":"15","38":"15","39":"16","40":"17","41":"18","42":"19","43":"19","44":"1","45":"1","46":"1","47":"1","48":"1","49":"1","50":"1","51":"2","52":"2","53":"2","54":"2","55":"2","56":"2","57":"2","58":"2","60":"1","61":"2","62":"2","63":"2","64":"3.1","65":"2","69":"1","70":"1","71":"1","73":"1","74":"2","75":"2","76":"2","77":"2","78":"2","79":"2","80":"2","81":"1","82":"1","83":"1","84":"1","85":"1","86":"1","87":"3.4","88":"5","89":"5","92":"5","93":"5","94":"5","95":"5","96":"5","97":"5"};
CO.dir_proc_penal = {"0":"2","1":"2","2":"2","3":"2","23":"2","24":"2","25":"2","27":"2","28":"2","29":"2","34":"2","44":"2","45":"2","46":"2","56":"2","57":"2","60":"2","61":"2","62":"2","63":"2","4":"3","5":"3","6":"3","7":"3","8":"3","9":"3","10":"3","30":"3","31":"3","32":"3","33":"3","42":"3","53":"3","54":"3","55":"3","58":"3","59":"3","64":"3","65":"3","66":"3","68":"3","69":"3","70":"3","71":"3","72":"3","73":"3","74":"3","75":"3","76":"3","11":"4","12":"4","13":"4","15":"4","16":"4","17":"4","19":"4","35":"4","36":"4","37":"4","38":"4","39":"4","40":"4","43":"4","18":"5","14":"6","41":"6","20":"7","21":"7","22":"7","49":"7","26":"8","51":"8","52":"8","67":"8","47":"1","48":"1","50":"9"};
CO.portugues = {"0":"4","1":"4","2":"2","3":"1","4":"5.7","5":"5.7","6":"5.5","7":"5.5","8":"5.6","9":"5.6","10":"5.6","11":"5","12":"5","13":"5","14":"3","15":"5.8","16":"5.8","17":"5.8","18":"3","19":"5.4","20":"5.2","21":"5.3","22":"5.3","23":"5.3","24":"5","25":"7","26":"7","27":"7.2","28":"7","29":"7.1","30":"7","31":"5.1","32":"5.1","33":"6.1","34":"6.1","35":"6.1","36":"6.1","37":"5","38":"5","39":"5","40":"5","41":"5","42":"4.1","43":"5","44":"5","45":"6.1","46":"5","47":"5.6","48":"4.2","49":"4.2","50":"1","51":"5","52":"2","53":"5.2","54":"5.2","55":"3","56":"3","57":"5.4","58":"5","59":"4.1","60":"4.1","61":"4.1","62":"5","63":"5","64":"5","65":"5","66":"5","67":"5","68":"5","69":"2","70":"2","71":"5","72":"5","73":"7","74":"5","75":"5","76":"3","77":"3","78":"5.5","79":"2","80":"5","81":"7","82":"5","83":"2","84":"5","85":"5","86":"5","87":"5","88":"5","89":"4.1","90":"4.2","91":"5","92":"7.1","93":"5.5","94":"5.7"};
CO.informatica = {"9":"1","10":"1.4","11":"1.4.1","12":"1.4.4","13":"1.4.5","14":"1.4","15":"1.5","16":"1.5","17":"1.5.1","18":"1.5.1","19":"1.5.2","20":"1.5.2","21":"1.5.2","22":"1.5.2","23":"1.5.2","24":"1.5.2","25":"1.6","26":"1.6","27":"1.6","28":"1.6","57":"1.4.6","61":"1.5","62":"1.5.6","63":"1.5","89":"1.4","90":"1.4.1","91":"1.4.1","92":"1.4.3","93":"1.5.2","94":"1.5.2","95":"1.5.5","96":"1.6","98":"1.5.2"};
CO.raciocinio = {"12":"12","13":"12","14":"12","15":"14","16":"3","17":"3.2","18":"3.2","19":"3.3","20":"3.3","21":"8","22":"8","23":"8","24":"7","25":"7","26":"7","27":"7","28":"13","29":"13","30":"13","31":"4","32":"4","33":"4","34":"5","35":"6","36":"6","37":"7","38":"7","39":"1","40":"1","41":"1","42":"1","43":"3.1","44":"3.3","45":"14","46":"10","47":"10","48":"10","49":"1","50":"1","51":"3","52":"15","53":"15","54":"1","55":"11","56":"11.3","57":"10","58":"15","59":"3.3","60":"3.3","61":"11.3","62":"11.4","63":"11.4","64":"10","65":"15","66":"3.2","67":"1","68":"1","69":"1","70":"2","71":"9","72":"10","73":"12","74":"12","75":"11.5","76":"3.3","77":"14","78":"12","79":"3.3","80":"15","81":"14","82":"11.4","83":"11.4","84":"11","85":"15","86":"11.3","87":"11"};
CO.contabilidade = {"0":"1","1":"1","2":"2","3":"2","4":"2","5":"2","6":"2","7":"2","8":"2","9":"2","10":"3","11":"3","12":"3","13":"3","14":"3","15":"4","16":"4","17":"4","18":"4","19":"4","20":"4","21":"5","22":"6","23":"6","24":"6","25":"6","26":"6","27":"6","28":"6","29":"8","30":"9","31":"9","32":"9","33":"9","34":"10","35":"10","36":"7","37":"7","38":"7","39":"7","40":"7","41":"7","42":"11","43":"11","44":"9","45":"9","46":"9","47":"9","48":"9","49":"9","50":"9"};
CO.estatistica = {"0":"1","1":"1","2":"1","3":"1","4":"1","5":"1","6":"1","7":"2","8":"2","9":"2","10":"2","11":"2","12":"2.1","13":"2.2","14":"2.2","15":"3","16":"3.1","17":"3","18":"1","19":"1","20":"1","21":"1","22":"1","23":"1","24":"1","25":"1","26":"1","27":"1","28":"1","29":"1","30":"1","31":"1","32":"1","33":"1","34":"1","35":"1","36":"1","37":"1","38":"1","39":"1","40":"1","41":"1","42":"1","43":"1","44":"1","45":"1","46":"1","47":"1","48":"1","49":"1","50":"1","51":"1","52":"1","53":"1","54":"1","55":"1","56":"1","57":"1","58":"1","59":"1","60":"1","61":"1","62":"1","63":"1","64":"1","65":"1","66":"1","67":"1","68":"1","69":"1","70":"1","71":"1","72":"1","73":"1","74":"1","75":"1","76":"1","77":"1","78":"1","79":"1","80":"1","81":"1","82":"1","83":"1","84":"1","85":"1","86":"1","87":"1","88":"3.1"};

// ============================================================
// TOPIC ALIASES (old banco topic strings → official codigos)
// ============================================================
const TOPIC_ALIASES = {
  informatica: {
    "Sistema Operacional Windows": "1",
    "Redes, Internet/Intranet e Computação em Nuvem": "2",
    "Correio Eletrônico": "2",
    "Segurança da Informação e Armazenamento": "2",
  },
  raciocinio: {
    "Lógica Sentencial/Proposicional": "11",
  },
  contabilidade: {
    "Balancete e Demonstrações Contábeis": "8",
    "Contas, Fatos Contábeis e Escrituração": "6",
    "Conceitos, Finalidades e Patrimônio": "1",
    "Normas Brasileiras de Contabilidade (NBC)": "11",
  },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function getCardSuffix(id) {
  const m = id.match(/_(\d+)$/);
  return m ? m[1] : null;
}

function getTopicText(materia, codigo) {
  if (!TOPIC_STRUCTURE[materia]) return codigo;
  const found = TOPIC_STRUCTURE[materia].find(t => t.codigo === codigo);
  return found ? found.topico : codigo;
}

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// ============================================================
// PROCESS EXISTING CARDS
// ============================================================
const processedBanco = {};
let totalProcessedExisting = 0;
const unmatchedCards = [];
const topicStats = {};

for (const [materia, cards] of Object.entries(banco)) {
  processedBanco[materia] = cards.map(card => {
    let codigo = null;
    if (materia === 'leg_estadual') {
      codigo = LEG_ESTADUAL_MAP[card.topico] || null;
    } else {
      const suffix = getCardSuffix(card.id);
      if (suffix && CO[materia] && CO[materia][suffix] !== undefined) {
        codigo = CO[materia][suffix];
      }
    }
    // Fallback: try to match card.topico text against TOPIC_STRUCTURE entries
    if (!codigo && TOPIC_STRUCTURE[materia]) {
      const normalizedTopic = normalize(card.topico);
      const found = TOPIC_STRUCTURE[materia].find(t => normalize(t.topico) === normalizedTopic);
      if (found) codigo = found.codigo;
    }
    // Fallback 2: check topic aliases for unmatched old topic strings
    if (!codigo && TOPIC_ALIASES[materia]) {
      codigo = TOPIC_ALIASES[materia][card.topico] || null;
    }
    if (codigo) {
      totalProcessedExisting++;
      const topicoText = getTopicText(materia, codigo);
      if (!topicStats[materia]) topicStats[materia] = {};
      topicStats[materia][codigo] = (topicStats[materia][codigo] || 0) + 1;
      return { ...card, codigo_topico: codigo, topico: topicoText };
    }
    unmatchedCards.push({ id: card.id, materia, topico_antigo: card.topico });
    return card;
  });
}

// ============================================================
// PARSE MD FILE
// ============================================================
const MATERIA_HEADER_MAP = {
  "NOÇÕES DE DIREITO — LEGISLAÇÃO ESTADUAL": "leg_estadual",
  "NOÇÕES DE DIREITO CONSTITUCIONAL": "dir_const",
  "NOÇÕES DE DIREITO ADMINISTRATIVO": "dir_adm",
  "NOÇÕES DE DIREITO PENAL": "dir_penal",
  "NOÇÕES DE DIREITO PROCESSUAL PENAL": "dir_proc_penal",
  "LÍNGUA PORTUGUESA": "portugues",
  "INFORMÁTICA": "informatica",
  "RACIOCÍNIO LÓGICO": "raciocinio",
  "CONTABILIDADE GERAL": "contabilidade",
  "ESTATÍSTICA": "estatistica",
};

const MD_MAP = {
  leg_estadual: { "constituição": "1","estatuto do policial":"2","6.425":"2","estatuto do servidor":"3","6.123":"3","lc 137":"4","137/2008":"4","lc 317":"5","317/2015":"5","plano de cargos":"5" },
  dir_const: { "princípios fundamentais":"1.1","poderes constituintes":"1.2","aplicabilidade das normas":"2","direitos e garantias fundamentais":"3","organização político-administrativa":"4","estado federal":"4.1","administração pública":"5.1","poder executivo":"6","poder legislativo":"7","poder judiciário":"8","funções essenciais":"9","ministério público":"9.1","defensoria pública":"9.2","defesa do estado":"9.3","segurança pública na constituição":"9.4" },
  dir_adm: { "estado, governo e administração":"1","direito administrativo":"2","ato administrativo":"3","poderes da administração":"4","hierárquico":"4.1","disciplinar":"4.1","regulamentar":"4.1","uso e abuso":"4.2","regime jurídico-administrativo":"5.1","princípios expressos":"5.2","responsabilidade civil":"6","serviços públicos":"7","organização administrativa":"8","centralização":"8.1","descentralização":"8.1","administração direta":"8.2","administração indireta":"8.2","controle da administração":"9","autotutela":"9.1","controle judicial":"9.2","controle legislativo":"9.3","improbidade":"9.4","processo administrativo":"10","licitações":"11","agente público":"12","cargo, emprego e função":"13" },
  dir_penal: { "princípios básicos":"1","crime e contravenção":"2","aplicação da lei penal":"3","a lei penal no tempo":"3.1","tempo e lugar do crime":"3.2","lei penal excepcional":"3.3","territorialidade":"3.4","contagem de prazo":"3.5","irretroatividade":"3.6","crimes contra a pessoa":"4","crimes contra o patrimônio":"5","crimes contra a dignidade sexual":"6","crimes contra a administração pública":"7","crimes hediondos":"8","preconceito de raça":"9","abuso de autoridade":"10","tortura":"11","estatuto da criança":"12","organizações criminosas":"13","crimes de trânsito":"14","violência doméstica e familiar contra a mulher":"15","lei de drogas":"16","violência doméstica e familiar contra a criança":"17","crimes ambientais":"18","estatuto do desarmamento":"19" },
  dir_proc_penal: { "aplicação da lei processual no tempo":"1","disposições preliminares":"1.1","inquérito policial":"2","prova":"3","prisão e liberdade provisória":"4","medidas cautelares":"5","prisão temporária":"6","juizados especiais":"7","investigação criminal":"8" },
  portugues: { "compreensão e interpretação":"1","tipos e gêneros textuais":"2","ortografia oficial":"3","coesão textual":"4","referenciação":"4.1","tempos e modos verbais":"4.2","estrutura morfossintática":"5","classes de palavras":"5.1","coordenação":"5.2","subordinação":"5.3","pontuação":"5.4","concordância":"5.5","regência":"5.6","crase":"5.7","colocação dos pronomes":"5.8","reescrita de frases":"6","significação das palavras":"6.1","substituição de palavras":"6.2","reorganização da estrutura":"6.3","reescrita de textos":"6.4","correspondência oficial":"7","redação oficial":"7.1","expedientes oficiais":"7.2","adequação da linguagem":"7.3","adequação do formato":"7.4" },
  informatica: { "sistema operacional windows":"1","pastas e arquivos":"1.1","configurações básicas":"1.2","windows explorer":"1.3","processador de textos word":"1.4","formatação de documentos":"1.4.1","listas e colunas":"1.4.2","tabelas":"1.4.3","estilos e modelos":"1.4.4","cabeçalhos e rodapés":"1.4.5","configuração de página":"1.4.6","planilha eletrônica excel":"1.5","introdução de números":"1.5.1","funções do excel":"1.5.2","formatação de planilhas":"1.5.3","edição da planilha":"1.5.4","classificação de dados":"1.5.5","gráficos":"1.5.6","powerpoint":"1.6","redes de computadores":"2","internet":"2","deep web":"2","correio eletrônico":"2","segurança da informação":"2","backup":"2" },
  raciocinio: { "conjuntos numéricos":"1","sistema legal de medidas":"2","razões e proporções":"3","divisão proporcional":"3.1","regras de três":"3.2","porcentagens":"3.3","equações e inequações":"4","sistemas lineares":"5","funções e gráficos":"6","princípios de contagem":"7","progressões":"8","estruturas lógicas":"9","lógica de argumentação":"10","lógica sentencial":"11","proposições simples e compostas":"11.1","tabelas-verdade":"11.2","equivalências":"11.3","leis de morgan":"11.4","diagramas lógicos":"11.5","lógica de primeira ordem":"12","probabilidade":"13","operações com conjuntos":"14","aritméticos":"15","geométricos":"15","matriciais":"15" },
  contabilidade: { "conceitos, objetivos e finalidades":"1","patrimônio":"2","atos e fatos administrativos":"3","contas":"4","plano de contas":"5","escrituração":"6","contabilização de operações":"7","balancete de verificação":"8","balanço patrimonial":"9","demonstração de resultado":"10","normas brasileiras de contabilidade":"11" },
  estatistica: { "estatística descritiva":"1","probabilidade":"2","definições básicas e axiomas":"2.1","probabilidade condicional":"2.2","técnicas de amostragem":"3","tamanho amostral":"3.1" },
};

function detectCodigo(materia, headingLine) {
  const h = headingLine.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const map = MD_MAP[materia];
  if (map) {
    for (const [kw, cod] of Object.entries(map)) {
      if (h.includes(kw)) return cod;
    }
  }
  const numMatch = headingLine.match(/\b(\d+(?:\.\d+)*)\b/);
  if (numMatch && TOPIC_STRUCTURE[materia] && TOPIC_STRUCTURE[materia].some(t => t.codigo === numMatch[1])) {
    return numMatch[1];
  }
  return null;
}

const existingPerguntas = new Set();
for (const cards of Object.values(banco)) {
  for (const card of cards) {
    existingPerguntas.add(normalize(card.pergunta));
  }
}

const lines = mdContent.split('\n');
const newCards = [];
let currentMateria = null;
let currentCodigo = null;
let currentPergunta = null;
let currentResposta = null;
let inSection11 = false;

for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  if (!trimmed || trimmed.startsWith('---')) continue;

  const sectionMatch = trimmed.match(/^##\s+(\d+)\.\s+(.+)/);
  if (sectionMatch) {
    // Flush any pending card before switching sections
    if (currentPergunta && currentResposta) {
      newCards.push({ pergunta: currentPergunta, resposta: currentResposta, materia: currentMateria, codigo_topico: currentCodigo || "unknown" });
      currentPergunta = null; currentResposta = null;
    }
    const sn = parseInt(sectionMatch[1]);
    inSection11 = sn === 11;
    if (inSection11) { currentMateria = null; continue; }
    const fn = MATERIA_HEADER_MAP[sectionMatch[2].trim()];
    if (fn) { currentMateria = fn; currentCodigo = null; }
    continue;
  }

  if (!currentMateria || inSection11) continue;

  // Card marker must be processed BEFORE # headings to flush the previous card
  // with the correct (current) codigo before the next topic heading updates it.
  const cardMatch = trimmed.match(/^\*\*Card\s+(\d+[A-Za-z]?)\*\*/);
  if (cardMatch) {
    if (currentPergunta && currentResposta) {
      newCards.push({ pergunta: currentPergunta, resposta: currentResposta, materia: currentMateria, codigo_topico: currentCodigo || "unknown" });
    }
    currentPergunta = null; currentResposta = null;
    continue;
  }

  if (trimmed.startsWith('#')) {
    // Flush any pending card before changing to a new topic codigo
    if (currentPergunta && currentResposta) {
      newCards.push({ pergunta: currentPergunta, resposta: currentResposta, materia: currentMateria, codigo_topico: currentCodigo || "unknown" });
      currentPergunta = null; currentResposta = null;
    }
    const cod = detectCodigo(currentMateria, trimmed);
    if (cod) currentCodigo = cod;
    continue;
  }

  const pMatch = trimmed.match(/^P:\s*(.+)/);
  const rMatch = trimmed.match(/^R:\s*(.+)/);
  if (pMatch) currentPergunta = pMatch[1].trim();
  else if (rMatch) currentResposta = rMatch[1].trim();
}

if (currentPergunta && currentResposta) {
  newCards.push({ pergunta: currentPergunta, resposta: currentResposta, materia: currentMateria, codigo_topico: currentCodigo || "unknown" });
}

// ============================================================
// DEDUPLICATE AND INSERT
// ============================================================
const skippedDuplicates = [];
const newCardCounts = {};
const noMatchCards = [];
const insertedCards = [];

const counters = {};
for (const materia of Object.keys(banco)) {
  const last = banco[materia][banco[materia].length - 1];
  const s = getCardSuffix(last.id);
  counters[materia] = parseInt(s) + 1;
}

for (const nc of newCards) {
  const normP = normalize(nc.pergunta);
  if (existingPerguntas.has(normP)) {
    skippedDuplicates.push(nc);
    continue;
  }
  existingPerguntas.add(normP);

  const materia = nc.materia;
  const codigo = nc.codigo_topico;
  if (codigo === "unknown") {
    noMatchCards.push(nc);
    continue;
  }

  const cnt = counters[materia] || 0;
  counters[materia] = cnt + 1;
  const newCard = {
    id: materia + "_new_" + cnt,
    pergunta: nc.pergunta,
    resposta: nc.resposta,
    dica: "",
    topico: getTopicText(materia, codigo),
    codigo_topico: codigo,
  };
  if (!processedBanco[materia]) processedBanco[materia] = [];
  processedBanco[materia].push(newCard);
  insertedCards.push(newCard);
  if (!newCardCounts[materia]) newCardCounts[materia] = {};
  newCardCounts[materia][codigo] = (newCardCounts[materia][codigo] || 0) + 1;
}

// ============================================================
// WRITE OUTPUT
// ============================================================
fs.writeFileSync(BANCO_PATH, JSON.stringify(processedBanco, null, 2) + '\n', 'utf8');

const totalOutput = Object.values(processedBanco).reduce((a, b) => a + b.length, 0);

console.log("===========================================");
console.log("  MIGRATION REPORT");
console.log("===========================================");
console.log("");
console.log("Existing cards processed:", totalProcessedExisting);
console.log("New cards imported:", insertedCards.length);
console.log("Total cards in output:", totalOutput);
console.log("");
if (unmatchedCards.length > 0) {
  console.log("--- Unmatched existing cards (" + unmatchedCards.length + ") ---");
  unmatchedCards.forEach(d => console.log("  " + d.materia + "/" + d.id + ": " + d.topico_antigo));
}
if (skippedDuplicates.length > 0) {
  console.log("--- Skipped duplicates (" + skippedDuplicates.length + ") ---");
  skippedDuplicates.forEach(d => console.log("  [" + d.materia + "] " + d.pergunta.substring(0, 60)));
}
if (noMatchCards.length > 0) {
  console.log("--- Unmatched new cards ---");
  noMatchCards.forEach(d => console.log("  [" + d.materia + "] " + d.pergunta.substring(0, 60)));
}
console.log("===========================================");
