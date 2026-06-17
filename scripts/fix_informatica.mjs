import { readFileSync, writeFileSync } from 'fs';

const BANCO_PATH = 'src/data/banco.json';
const raw = readFileSync(BANCO_PATH, 'utf8');
const banco = JSON.parse(raw);
const cards = banco['informatica'];

let changes = 0;

function log(id, field, msg) {
  console.log(`  ${id}.${field}: ${msg}`);
  changes++;
}

// ── 1. FIX TÓPICOS MAL CATEGORIZADOS ──────────────────────────
const topicFixes = {
  'informatica_12':  { topico: 'Windows Explorer', codigo_topico: '1.3.3' },
  'informatica_26':  { topico: 'Principais funções do Excel: matemáticas, estatísticas, data-hora, financeiras e de texto', codigo_topico: '2.2.3' },
  'informatica_27':  { topico: 'Principais funções do Excel: matemáticas, estatísticas, data-hora, financeiras e de texto', codigo_topico: '2.2.3' },
  'informatica_35':  { topico: 'Principais funções do Excel: matemáticas, estatísticas, data-hora, financeiras e de texto', codigo_topico: '2.2.3' },
  'informatica_47':  { topico: 'Principais funções do Excel: matemáticas, estatísticas, data-hora, financeiras e de texto', codigo_topico: '2.2.3' },
  'informatica_59':  { topico: 'Principais funções do Excel: matemáticas, estatísticas, data-hora, financeiras e de texto', codigo_topico: '2.2.3' },
  'informatica_68':  { topico: 'Principais funções do Excel: matemáticas, estatísticas, data-hora, financeiras e de texto', codigo_topico: '2.2.3' },
  'informatica_75':  { topico: 'Principais funções do Excel: matemáticas, estatísticas, data-hora, financeiras e de texto', codigo_topico: '2.2.3' },
  'informatica_79':  { topico: 'Software de apresentação do PowerPoint', codigo_topico: '2.3.1' },
  'informatica_88':  { topico: 'Segurança da Informação', codigo_topico: '5.1.1' },
  'informatica_93':  { topico: 'Redes de Computadores', codigo_topico: '3.1.1' },
  'informatica_98':  { topico: 'Segurança da Informação', codigo_topico: '5.1.1' },
  'informatica_new_127': { topico: 'Software de apresentação do PowerPoint', codigo_topico: '2.3.1' },
  'informatica_new_128': { topico: 'Software de apresentação do PowerPoint', codigo_topico: '2.3.1' },
};

for (const [id, fix] of Object.entries(topicFixes)) {
  const card = cards.find(c => c.id === id);
  if (!card) { console.log(`  ${id}: não encontrado`); continue; }
  if (card.topico !== fix.topico) {
    log(id, 'topico', `"${card.topico}" → "${fix.topico}"`);
    card.topico = fix.topico;
  }
  if (card.codigo_topico !== fix.codigo_topico) {
    log(id, 'codigo_topico', `"${card.codigo_topico}" → "${fix.codigo_topico}"`);
    card.codigo_topico = fix.codigo_topico;
  }
}

// ── 2. FUNDIR DUPLICATAS (manter o melhor de cada par) ────────
const merges = [
  // SOMA: informatica_19 (completo) + informatica_26 (repetido)
  { keep: 'informatica_19', remove: 'informatica_26',
    pergunta: 'Qual a diferença entre =SOMA(A1:A10) e =SOMA(A1;A10)? E qual atalho insere SOMA automaticamente?',
    resposta: '=SOMA(A1:A10) soma TODAS as células de A1 a A10 (intervalo contínuo).\n=SOMA(A1;A10) soma apenas as células A1 e A10 (argumentos individuais).\nAtalho Alt+= insere a função SOMA automaticamente para o intervalo adjacente.\n⚠️ CESPE: SOMA ignora células com texto, mas considera VERDADEIRO=1 e FALSO=0. Aceita até 255 argumentos e suporta referências 3D entre planilhas.',
    dica: 'Alt+= insere SOMA automática. A1:A10 (intervalo) vs A1;A10 (células individuais). CESPE: SOMA ignora texto; considera VERDADEIRO=1, FALSO=0. Aceita 255 argumentos e referências 3D.'
  },
  // PROCV: informatica_22 + informatica_59
  { keep: 'informatica_22', remove: 'informatica_59',
    pergunta: 'O que faz a função PROCV no Excel e qual o efeito do parâmetro "procurar_intervalo" (FALSO vs VERDADEIRO)?',
    resposta: 'PROCV (PROcurar na Vertical) procura um valor na primeira coluna de uma tabela e retorna um valor na mesma linha de outra coluna.\nParâmetros: =PROCV(valor_procurado; tabela; índice_coluna; procurar_intervalo)\n→ FALSO (0): busca EXATA (CESPE adora cobrar isso). Se não achar → #N/D.\n→ VERDADEIRO (1): busca APROXIMADA. Exige dados ordenados.\n⚠️ CESPE: PROCV sempre procura na PRIMEIRA coluna da tabela. Se o valor não estiver na primeira coluna, PROCV não funciona.',
    dica: 'PROCV FALSO = exata; VERDADEIRO = aproximada (dados ordenados). CESPE: procura PRIMEIRA coluna. Não confundir com PROCH (horizontal).'
  },
  // SE: informatica_21 + informatica_35
  { keep: 'informatica_21', remove: 'informatica_35',
    pergunta: 'O que faz a função SE no Excel e como testar múltiplas condições com SE aninhado?',
    resposta: 'SE(condição; valor_se_verdadeiro; valor_se_falso)\nEx: =SE(A1>10;"Aprovado";"Reprovado")\nSE aninhado: =SE(A1>7;"Aprovado";SE(A1>=5;"Recuperação";"Reprovado"))\n⚠️ CESPE adora cobrar: strings no SE devem estar entre ASPAS duplas. Valores numéricos SEM aspas. Os parâmetros são separados por ; ou , conforme configuração regional.',
    dica: 'SE(condição; V; F). Texto SEMPRE entre aspas duplas. CESPE: SE aninhado limita 64 níveis no Excel 2016+. SE(VERDADEIRO;x;y) retorna x; SE(FALSO;x;y) retorna y.'
  },
  // CONT.SE: informatica_23 + informatica_47
  { keep: 'informatica_23', remove: 'informatica_47',
    pergunta: 'O que faz a função CONT.SE no Excel? Como contar células com base em múltiplos critérios?',
    resposta: 'CONT.SE(intervalo; critério) conta células que atendem a UM critério.\nEx: =CONT.SE(A1:A10;">5") conta células >5.\nCONT.SES(intervalo1; critério1; intervalo2; critério2...) conta células que atendem a MÚLTIPLOS critérios.\n⚠️ CESPE: critérios com operadores devem estar entre aspas (">5"). Critérios com texto também entre aspas ("Aprovado"). CONT.SES exige que TODOS os critérios sejam atendidos (E lógico).',
    dica: 'CONT.SE = 1 critério; CONT.SES = múltiplos critérios (E). Operadores entre aspas: ">5". CESPE: CONT.SES exige todos critérios simultaneamente.'
  },
  // CONCATENAR: informatica_54 + informatica_94
  { keep: 'informatica_54', remove: 'informatica_94',
    pergunta: 'O que é a função CONCATENAR no Excel e qual a alternativa moderna?',
    resposta: 'CONCATENAR(texto1; texto2; ...) junta textos de múltiplas células.\nNo Excel 2016+: CONCAT (substitui CONCATENAR) e TEXTUNIR (com delimitador).\nAlternativa moderna: use o operador & (e comercial). Ex: =A1&" "&B1 junta A1 e B1 com espaço.\n⚠️ CESPE: CONCATENAR aceita até 255 argumentos. A nova função TEXTUNIR permite ignorar células vazias (parâmetro ignorar_vazio).',
    dica: '& é mais rápido que CONCATENAR. CONCAT substitui CONCATENAR (2016+). TEXTUNIR(delim; ignorar_vazio; textoN).'
  },
  // Área de Trabalho: informatica_1 + informatica_8 (merge e remove 8)
  { keep: 'informatica_1', remove: 'informatica_8',
    pergunta: 'O que é a Área de Trabalho (Desktop) no Windows?',
    resposta: 'É a principal tela exibida após o login. Contém ícones (atalhos, pastas, arquivos), Barra de Tarefas, Área de Notificação e Wallpaper.\nCESPE: a Área de Trabalho é uma pasta do sistema (C:\\Users\\nome\\Desktop). Qualquer arquivo salvo ali aparece visualmente na tela.\nPersonalização: clique direito → Personalizar → plano de fundo, cores, temas, protetor de tela.',
    dica: 'Desktop = pasta real C:\\Users\\nome\\Desktop. CESPE: arquivos salvos no Desktop aparecem na tela. Ícone padrão: Lixeira.'
  },
  // Word: informatica_10 + informatica_14
  { keep: 'informatica_10', remove: 'informatica_14',
    pergunta: 'O que é o Microsoft Word e quais suas principais funcionalidades cobradas em concurso?',
    resposta: 'Processador de texto da Microsoft (parte do Pacote Office) para criar, editar e formatar documentos.\nFuncionalidades-chave para prova: formatação de texto/fonte/parágrafo, estilos, tabelas, cabeçalho/rodapé, numeração de páginas, mala direta, revisão ortográfica, sumário automático.\n⚠️ CESPE: o Word trabalha com extensão .docx (padrão desde 2007). .doc é formato legado (2003). Modo de exibição: Layout de Impressão (padrão), Layout da Web, Leitura, Estrutura de Tópicos, Rascunho.',
    dica: 'Extensão: .docx (2007+). Layout de Impressão é o padrão. CESPE: atalho Ctrl+Enter = quebra de página. F12 = Salvar como.'
  },
  // Backup: informatica_38 + informatica_101
  { keep: 'informatica_38', remove: 'informatica_101',
    pergunta: 'O que é backup e quais seus tipos principais?',
    resposta: 'Cópia de segurança dos dados para recuperação em caso de perda.\nTipos:\n- Completo (Full): copia TODOS os dados. Demora mais, restauração mais rápida.\n- Incremental: copia apenas dados alterados DESDE o ÚLTIMO backup (completo ou incremental). Restauração lenta (precisa do full + todos incrementais).\n- Diferencial: copia dados alterados DESDE o ÚLTIMO backup COMPLETO. Restauração mais rápida que incremental.\n⚠️ CESPE: regra 3-2-1 → 3 cópias, 2 mídias diferentes, 1 offsite.',
    dica: 'Completo: tudo. Incremental: desde último backup. Diferencial: desde último completo. CESPE: 3-2-1 (3 cópias, 2 mídias, 1 offsite).'
  },
];

for (const merge of merges) {
  const keepCard = cards.find(c => c.id === merge.keep);
  const removeCard = cards.find(c => c.id === merge.remove);
  if (!keepCard || !removeCard) {
    if (!keepCard) console.log(`  [MERGE] keep ${merge.keep} não encontrado`);
    if (!removeCard) console.log(`  [MERGE] remove ${merge.remove} não encontrado`);
    continue;
  }
  // Atualiza o card mantido
  if (merge.pergunta) { keepCard.pergunta = merge.pergunta; log(merge.keep, 'pergunta', 'atualizada (merge)'); }
  if (merge.resposta) { keepCard.resposta = merge.resposta; log(merge.keep, 'resposta', 'atualizada (merge)'); }
  if (merge.dica) { keepCard.dica = merge.dica; log(merge.keep, 'dica', 'atualizada (merge)'); }
  // Remove o card duplicado
  const idx = cards.findIndex(c => c.id === merge.remove);
  if (idx !== -1) {
    cards.splice(idx, 1);
    log(merge.remove, '', 'REMOVIDO (duplicata fundida)');
  }
}

// ── 3. FIX DICAS GENÉRICAS ─────────────────────────────────────
// Dicas que contêm texto genérico copiado sem relação com o card
const dicaFixes = {
  'informatica_0': 'SO: gerencia hardware e software. CESPE: NÃO é programa aplicativo. Ex: Windows, Linux, macOS. Kernel é o núcleo do SO.',
  'informatica_2': 'Barra de Tarefas: Iniciar, ícones fixados, programas abertos, relógio. CESPE: á direita fica a Área de Notificação (system tray).',
  'informatica_3': 'Lixeira: armazena arquivos excluídos. CESPE: Shift+Del = exclusão definitiva (NÃO vai pra Lixeira). Arquivos de rede/unidade removível NÃO vão pra Lixeira.',
  'informatica_4': 'Ctrl+C: copiar (mantém original + copia pra área de transferência). CESPE: Ctrl+C não recorta; Ctrl+X recorta.',
  'informatica_5': 'Ctrl+V: colar conteúdo da área de transferência. CESPE: Ctrl+Shift+V = colar sem formatação em alguns programas.',
  'informatica_6': 'Ctrl+Z: desfazer última ação. CESPE: Ctrl+R = refazer (ou Ctrl+Y). Word tem lista de desfazer (múltiplas ações).',
  'informatica_7': 'Ctrl+X: recortar (remove original + copia pra área de transferência). CESPE: difere de Ctrl+C (cópia mantém original).',
  'informatica_9': 'Extensão: sufixo após o ponto (.exe, .pdf, .docx). CESPE: extensão de arquivo NÃO determina o conteúdo, apenas associa programa padrão. Windows oculta extensões conhecidas por padrão.',
  'informatica_11': 'Formatação de parágrafo: alinhamento (justificado, esquerda, direita, centralizado), recuo, espaçamento antes/depois, entrelinhas. CESPE: justificado distribui texto uniformemente entre margens.',
  'informatica_13': 'Cabeçalho (topo) e Rodapé (fim da página). CESPE: pode ser diferente na primeira página e em páginas pares/ímpares. Inserir numeração = Inserir → Número de Página.',
  'informatica_15': 'Excel: planilha eletrônica (cálculos, gráficos, banco de dados). Extensão: .xlsx (2007+). CESPE: arquivo = pasta de trabalho (workbook); planilha individual = worksheet.',
  'informatica_16': 'Célula = interseção de linha (número) e coluna (letra). Endereço: A1 = coluna A, linha 1. CESPE: $A$1 = referência absoluta; A1 = relativa.',
  'informatica_17': 'Referência absoluta ($A$1): NÃO altera ao copiar fórmula. CESPE: F4 alterna entre absoluta/relativa/mista. $A1 = coluna absoluta; A$1 = linha absoluta.',
  'informatica_18': 'Referência relativa (A1): altera conforme a posição ao copiar fórmula. CESPE: copiar =SOMA(A1:A5) para baixo vira =SOMA(A2:A6). Para evitar, use $A$1:$A$5.',
  'informatica_20': 'Formatação Condicional: altera aparência da célula conforme regras (ex: realçar >10). CESPE: até 3 regras por célula no Excel 2016. Gerenciar regras em: Formatação Condicional → Gerenciar Regras.',
  'informatica_25': 'PowerPoint: software de apresentação de slides. Extensão: .pptx. CESPE: não confundir com Word (texto) ou Excel (planilha). Animações (dentro do slide) ≠ Transições (entre slides).',
  'informatica_28': 'Transição: efeito visual AO TROCAR de slide. CESPE: NÃO confundir com Animação (efeito DENTRO do slide). Transição pode ter som e duração configuráveis.',
  'informatica_29': 'Internet: rede mundial de computadores (rede de redes). CESPE: baseada no protocolo TCP/IP. NÃO é sinônimo de Web (Web é serviço sobre a Internet). Navegador = browser.',
  'informatica_30': 'Intranet: rede PRIVADA (acesso restrito) que usa tecnologia Internet (TCP/IP). CESPE: intranet NÃO é necessariamente conectada à Internet. Extranet = intranet com acesso externo limitado.',
  'informatica_31': 'HTTP (porta 80): não criptografado. HTTPS (porta 443): com SSL/TLS (criptografado). CESPE: HTTPS = HTTP + SSL. Cadeado verde no navegador indica HTTPS.',
  'informatica_32': 'Phishing: golpe que se passa por entidade confiável para roubar dados. CESPE: phishing NÃO é vírus; é engenharia social. Spear phishing = direcionado a alvo específico.',
  'informatica_33': 'Malware: software malicioso (termo genérico). Tipos: vírus, worm, trojan, ransomware, spyware, keylogger, adware. CESPE: nem todo malware é vírus.',
  'informatica_34': 'Vírus: malware que se replica e depende de um hospedeiro (arquivo executável). CESPE: vírus NÃO se replica sozinho pela rede (isso é worm). Exige ação do usuário para propagar.',
  'informatica_36': 'Antivírus: detecta e remove malware. CESPE: antivírus NÃO substitui firewall. Deve estar atualizado. Detecta por assinatura (padrão conhecido) e heurística (comportamento suspeito).',
  'informatica_37': 'Firewall: barreira que FILTRA tráfego (não impede totalmente). CESPE: "firewall impede totalmente invasões" = FALSO. Regras de entrada (inbound) e saída (outbound). Host-based vs Network-based.',
  'informatica_40': 'Spam: mensagem não solicitada (geralmente comercial). CESPE: spam NÃO é vírus. Spam é lixo eletrônico. Phishing pode usar spam como veículo.',
  'informatica_42': 'Assinatura Digital: garante autenticidade (quem assinou) e integridade (não foi alterado). CESPE: usa criptografia assimétrica (chave privada para assinar, pública para verificar). Difere de certificado digital.',
  'informatica_43': 'LAN (Local): rede local (curta distância). WAN (Wide): rede geograficamente distribuída (longa distância). CESPE: Internet = maior WAN pública. LAN típica: escritório, casa.',
  'informatica_45': 'Endereço IP: identificador único de dispositivo na rede. IPv4 (32 bits, ex: 192.168.0.1) e IPv6 (128 bits). CESPE: IP público (Internet) vs privado (rede local: 192.168.x.x, 10.x.x.x, 172.16-31.x.x).',
  'informatica_46': 'DNS: traduz nomes de domínio (www.google.com) em endereços IP. CESPE: DNS NÃO é URL nem navegador. Funciona como catálogo telefônico da Internet.',
  'informatica_48': 'Dark Web: conteúdo NÃO indexado por buscadores e que exige software específico (ex: Tor) para acessar. CESPE: Deep Web (não indexado) é MAIS ampla que Dark Web (subconjunto com acesso anônimo).',
  'informatica_49': 'Engenharia Social: manipulação psicológica para obter informações confidenciais. Não é ataque técnico. CESPE: phishing, pretexting, baiting, tailgating são exemplos.',
  'informatica_50': '2FA: duas etapas de autenticação (algo que sei + algo que tenho/sou). CESPE: 2FA NÃO elimina senha fraca; adiciona camada extra. Ex: senha + código SMS/App/biometria.',
  'informatica_51': 'Compactação: reduz tamanho do arquivo. Zip, Rar, 7z. CESPE: compactar NÃO altera o conteúdo. É possível proteger com senha. Compactação com perda (JPEG) vs sem perda (ZIP).',
  'informatica_52': 'RAM: memória volátil (dados perdidos ao desligar). Armazenamento TEMPORÁRIO de dados em uso. CESPE: RAM NÃO é armazenamento permanente. Mais RAM = melhor desempenho em multitarefa.',
  'informatica_53': 'HD (disco mecânico): mais lento, maior capacidade, menor custo. SSD (estado sólido): mais rápido, sem partes móveis, maior custo por GB. CESPE: SSD acelera boot e abertura de programas.',
  'informatica_55': 'Alt+F4: FECHA a janela/programa ativo. CESPE: NÃO é o mesmo que Ctrl+W (fecha aba no navegador). Alt+F4 no Desktop abre desligar Windows.',
  'informatica_56': 'Windows+L: BLOQUEIA o computador (tela de login). CESPE: essencial para segurança física. NÃO desliga nem suspende. Protege contra acesso não autorizado na ausência.',
  'informatica_63': 'AutoFiltro: filtra dados por critérios. CESPE: AutoFiltro NÃO exclui linhas; apenas oculta temporariamente. Filtro Avançado permite critérios mais complexos.',
  'informatica_65': 'Licença de Software: contrato de uso (NÃO é propriedade). CESPE: software livre (código aberto) ≠ gratuito. Open source permite modificar o código. Freeware = gratuito mas sem acesso ao código.',
  'informatica_69': 'NTFS: sistema de arquivos do Windows (NT File System). CESPE: suporta permissões, criptografia (EFS), compressão, arquivos >4GB. FAT32: limite 4GB por arquivo. exFAT: sem limite de 4GB.',
  'informatica_70': 'Nuvem pública: recursos compartilhados (terceiros). Privada: uso exclusivo. Híbrida: combina ambas. CESPE: pública MENOS controle; privada MAIS controle e MAIS custo.',
  'informatica_71': 'CPU (processador): executa instruções, coração do computador. CESPE: GHz indica velocidade, mas NÃO é único fator de desempenho (núcleos, cache, arquitetura também importam).',
  'informatica_72': 'Desfragmentação: reorganiza dados no HD (disco magnético) para acesso mais rápido. CESPE: NÃO desfragmente SSD! Desfragmentação é para HD. No SSD, faz TRIM.',
  'informatica_73': 'Limpeza de Disco: remove arquivos temporários, lixeira, caches. CESPE: limpeza de disco NÃO desfragmenta. Libera espaço mas não acelera o disco mecanicamente.',
  'informatica_74': 'ROM: memória NÃO volátil (mantém dados sem energia). CESPE: ROM contém firmware/BIOS. Diferente de RAM (volátil). ROM = apenas leitura (em uso normal).',
  'informatica_77': 'Worm: malware que se auto-replica PELA REDE (sem precisar de arquivo hospedeiro). CESPE: worm se espalha sozinho; vírus precisa de ação do usuário (executar arquivo infectado).',
  'informatica_78': 'Trojan (Cavalo de Troia): malware que se DISFARÇA de programa legítimo. CESPE: trojan NÃO se replica sozinho (diferente de vírus/worm). Exige que usuário baixe e execute.',
  'informatica_80': 'Keylogger: captura TECLAS digitadas (senhas, dados). CESPE: keylogger pode ser software ou hardware (dispositivo físico entre teclado e computador). Detectado por antivírus.',
  'informatica_82': 'SMTP: protocolo para ENVIO de e-mail (porta 25/587). CESPE: POP3 (porta 110) = baixar e-mails; IMAP (porta 143) = sincronizar. SMTP só envia, não recebe.',
  'informatica_83': 'VPN: túnel criptografado sobre rede pública (ex: Internet). CESPE: VPN NÃO é antivírus nem firewall. Garante privacidade e segurança. Empresas usam para acesso remoto à intranet.',
  'informatica_84': 'QR Code: código de barras 2D (armazena mais dados que código de barras linear). CESPE: QR Code NÃO é malware. Pode conter URL, texto, contato. Lido por câmera do celular.',
  'informatica_86': 'Desfragmentação (HD): reorganiza dados. Limpeza: remove temporários. CESPE: NÃO confundir. SSD precisa TRIM, não desfragmentação. Windows agenda ambos automaticamente.',
  'informatica_87': 'Painel de Controle: central de configurações (versão clássica). CESPE: Windows 10+ tem Configurações (moderno) + Painel de Controle (legado). Ambos coexistem.',
  'informatica_98': 'Certificado Digital: identidade digital (garante quem é o emissor). CESPE: ICP-Brasil é a infraestrutura brasileira. Certificado A1 (software, 1 ano) vs A3 (token/cartão, 3 anos). Difere de assinatura digital.',
  'informatica_61': 'Tabela Dinâmica (Pivot Table): resume/analisa grandes volumes de dados. CESPE: arrasta campos entre linhas, colunas, valores e filtros. Atualizar: clique direito → Atualizar.',
  'informatica_64': 'Hyperlink: link para outro local (mesmo documento, outro arquivo, URL). CESPE: Ctrl+K insere hyperlink. Pode apontar para: URL, e-mail, lugar no documento, novo documento.',
  'informatica_66': 'IoT: objetos do dia a dia conectados à Internet. CESPE: IoT NÃO é exclusivamente computadores. Ex: geladeira smart, lâmpada inteligente, termostato. Desafio: segurança dos dispositivos.',
  'informatica_67': 'Big Data: conjunto de dados tão grande que exige ferramentas especiais. 4 Vs: Volume, Velocidade, Variedade, Veracidade. CESPE: Big Data NÃO é um software específico.',
  'informatica_81': 'Certificado Digital: identidade digital. CESPE: ICP-Brasil. A1 (software, arquivo) vs A3 (token/cartão). Cadeia hierárquica: Raiz → Autoridades Certificadoras → Autoridades de Registro.',
  'informatica_85': 'IA: simulação de inteligência humana por máquinas. CESPE: IA NÃO é sinônimo de machine learning (ML é subárea). Deep Learning (subárea de ML) usa redes neurais profundas.',
};

for (const [id, novaDica] of Object.entries(dicaFixes)) {
  const card = cards.find(c => c.id === id);
  if (!card) continue;
  if (card.dica !== novaDica) {
    log(id, 'dica', 'atualizada');
    card.dica = novaDica;
  }
}

// ── 4. FIX ACENTUAÇÃO/ORTOGRAFIA ──────────────────────────────
// Padrões comuns de erro nos cards de informática
const accentPatterns = [
  // "e" isolado que deveria ser "é"
  [/ (?<!º)é(?! )/g, 'é'], // already correct, skip
  // Casos específicos identificados
  [/analise/g, 'análise'],
  [/analises/g, 'análises'],
  [/caracter/g, 'caráter'],
  [/caracteres/g, 'caracteres'],
  [/topico/g, 'tópico'],
  [/Topicos/g, 'Tópicos'],
  [/topicos/g, 'tópicos'],
  [/automatico/g, 'automático'],
  [/automatica/g, 'automática'],
  [/Automatico/g, 'Automático'],
  [/Automatica/g, 'Automática'],
  [/especifico/g, 'específico'],
  [/especifica/g, 'específica'],
  [/Especifico/g, 'Específico'],
  [/Especifica/g, 'Específica'],
  [/pratico/g, 'prático'],
  [/pratica/g, 'prática'],
  [/Pratica/g, 'Prática'],
  [/publico/g, 'público'],
  [/publica/g, 'pública'],
  [/Publico/g, 'Público'],
  [/Publica/g, 'Pública'],
  [/juridico/g, 'jurídico'],
  [/juridica/g, 'jurídica'],
  [/Juridico/g, 'Jurídico'],
  [/Juridica/g, 'Jurídica'],
  [/eletronico/g, 'eletrônico'],
  [/eletronica/g, 'eletrônica'],
  [/Eletronico/g, 'Eletrônico'],
  [/Eletronica/g, 'Eletrônica'],
  [/periodo/g, 'período'],
  [/Periodo/g, 'Período'],
  [/exclusao/g, 'exclusão'],
  [/Exclusao/g, 'Exclusão'],
  [/formatacao/g, 'formatação'],
  [/Formatacao/g, 'Formatação'],
  [/aplicacao/g, 'aplicação'],
  [/Aplicacao/g, 'Aplicação'],
  [/autenticacao/g, 'autenticação'],
  [/Autenticacao/g, 'Autenticação'],
  [/criptografia/g, 'criptografia'], // already correct
  [/proprio/g, 'próprio'],
  [/propria/g, 'própria'],
  [/Proprio/g, 'Próprio'],
  [/Propria/g, 'Própria'],
  [/simbolos/g, 'símbolos'],
  [/Simbolos/g, 'Símbolos'],
  [/temporario/g, 'temporário'],
  [/temporaria/g, 'temporária'],
  [/Temporario/g, 'Temporário'],
  [/Temporaria/g, 'Temporária'],
  [/necessario/g, 'necessário'],
  [/necessaria/g, 'necessária'],
  [/Necessario/g, 'Necessário'],
  [/Necessaria/g, 'Necessária'],
  [/numeracao/g, 'numeração'],
  [/Numeracao/g, 'Numeração'],
  [/conteudo/g, 'conteúdo'],
  [/Conteudo/g, 'Conteúdo'],
  [/transferencia/g, 'transferência'],
  [/Transferencia/g, 'Transferência'],
  [/preferencia/g, 'preferência'],
  [/Preferencia/g, 'Preferência'],
  [/precedencia/g, 'precedência'],
  [/Precedencia/g, 'Precedência'],
  [/referencia/g, 'referência'],
  [/Referencia/g, 'Referência'],
  [/diferenca/g, 'diferença'],
  [/Diferenca/g, 'Diferença'],
  [/copia/g, 'cópia'],
  [/Copia/g, 'Cópia'],
  [/indice/g, 'índice'],
  [/Indice/g, 'Índice'],
  [/codigo/g, 'código'],
  [/Codigo/g, 'Código'],
  [/ambiente/g, 'ambiente'],
  [/Ambiente/g, 'Ambiente'],
  [/simetrico/g, 'simétrico'],
  [/simetrica/g, 'simétrica'],
  [/assimetrico/g, 'assimétrico'],
  [/assimetrica/g, 'assimétrica'],
];

function fixAccentsInField(text) {
  if (!text || typeof text !== 'string') return text;
  let result = text;
  for (const [pattern, replacement] of accentPatterns) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

for (const card of cards) {
  for (const field of ['pergunta', 'resposta', 'dica']) {
    if (!card[field]) continue;
    const fixed = fixAccentsInField(card[field]);
    if (fixed !== card[field]) {
      log(card.id, field, `acentuação corrigida`);
      card[field] = fixed;
    }
  }
}

// ── 5. REWRITE "O QUE É X?" CARDS FOR CEBRASPE STYLE ─────────
// Cards com pergunta começando com "O que é" que são apenas definições genéricas
// Aqui reformulamos os mais críticos para estilo assertiva CEBRASPE
const cebraspeRewrites = {
  'informatica_33': {
    pergunta: 'V/F: "Malware é um termo genérico que abrange apenas vírus de computador." Quais são os principais tipos de malware?',
    resposta: 'FALSO. Malware (malicious software) é o termo GENÉRICO para TODO software malicioso, NÃO apenas vírus.\nPrincipais tipos: Vírus (precisa de hospedeiro), Worm (auto-replicação em rede), Trojan (disfarçado de legítimo), Ransomware (sequestra dados), Spyware (espiona), Keylogger (captura teclas), Adware (publicidade indesejada), Rootkit (acesso privilegiado oculto).\n⚠️ CESPE: todo vírus é malware, mas NEM todo malware é vírus.',
    dica: 'Malware ≠ vírus. Vírus é UM tipo de malware. CESPE: "malware = vírus" = FALSO. Ransomware é malware que CRIPTOGRAFA dados.'
  },
  'informatica_34': {
    pergunta: 'V/F: "Vírus de computador pode se propagar automaticamente pela rede sem ação do usuário."',
    resposta: 'FALSO. Vírus DEPENDE de um arquivo hospedeiro e REQUER ação do usuário (executar arquivo infectado, abrir anexo) para propagar. Quem se auto-replica pela rede é WORM.\n⚠️ CESPE: a principal diferença entre VÍRUS e WORM é que o worm NÃO precisa de hospedeiro nem de ação do usuário para se espalhar.',
    dica: 'Vírus → precisa executar arquivo. Worm → auto-replicável pela rede. CESPE adora essa diferença!'
  },
  'informatica_38': {
    pergunta: 'V/F: "Backup incremental copia todos os dados desde o último backup completo."',
    resposta: 'FALSO. Backup incremental copia apenas dados alterados DESDE o ÚLTIMO backup (seja completo, seja incremental). Backup DIFERENCIAL copia dados desde o ÚLTIMO completo.\nExemplo: Seg (Completo), Ter (Incremental: só alterados seg-ter), Qua (Incremental: só alterados ter-qua). Restauração: precisa do Completo + TODOS incrementais em ordem.\n⚠️ CESPE: Diferencial = cresce mais rápido (sempre desde o completo). Incremental = restauração mais lenta (precisa da sequência toda).',
    dica: 'Incremental: desde o ÚLTIMO backup (qualquer tipo). Diferencial: desde o ÚLTIMO COMPLETO. CESPE: restauração incremental é MAIS LENTA.'
  },
  'informatica_48': {
    pergunta: 'V/F: "Dark Web e Deep Web são sinônimos para o mesmo conceito de conteúdo não indexado."',
    resposta: 'FALSO. Deep Web: TODO conteúdo NÃO indexado por mecanismos de busca (ex: e-mails, drives privados, páginas protegidas por login). Dark Web: subconjunto da Deep Web que EXIGE software específico (Tor, I2P) para acesso anônimo.\n⚠️ CESPE: Deep Web é MAIS ampla que Dark Web. A Deep Web representa a MAIORIA do conteúdo da Internet (~90%). Nem toda Deep Web é ilegal.',
    dica: 'Deep Web (não indexado) > Dark Web (exige Tor). CESPE: Deep Web = ~90% da Internet. Dark Web NÃO é sinônimo de ilegalidade.'
  },
  'informatica_88': {
    pergunta: 'V/F: "A segurança da informação baseia-se em três pilares: confidencialidade, integridade e disponibilidade (CID)." Descreva cada um.',
    resposta: 'VERDADEIRA (a tríade CID é o modelo fundamental).\n- Confidencialidade: acesso apenas a pessoas autorizadas (ex: criptografia, senhas).\n- Integridade: dados NÃO alterados indevidamente (ex: checksum, hash, assinatura digital).\n- Disponibilidade: dados acessíveis quando necessário (ex: backup, redundância, SLA).\n⚠️ CESPE costuma incluir AUTENTICIDADE e NÃO REPÚDIO como pilares adicionais em questões mais recentes. Não confundir: autenticidade (quem criou) ≠ confidencialidade (quem acessa).',
    dica: 'CID: Confidencialidade, Integridade, Disponibilidade. CESPE: Autenticidade e Não repúdio são pilares adicionais. Hash = integridade, Criptografia = confidencialidade.'
  },
};

for (const [id, nova] of Object.entries(cebraspeRewrites)) {
  const card = cards.find(c => c.id === id);
  if (!card) continue;
  if (nova.pergunta) { card.pergunta = nova.pergunta; log(id, 'pergunta', 'reescrita estilo CEBRASPE'); }
  if (nova.resposta) { card.resposta = nova.resposta; log(id, 'resposta', 'reescrita estilo CEBRASPE'); }
  if (nova.dica) { card.dica = nova.dica; log(id, 'dica', 'reescrita estilo CEBRASPE'); }
}

// ── SALVAR ────────────────────────────────────────────────────
banco['informatica'] = cards;
writeFileSync(BANCO_PATH, JSON.stringify(banco, null, 2), 'utf8');
console.log(`\n✅ Total de alterações: ${changes}`);
console.log(`📊 Cards restantes em informatica: ${cards.length}`);
