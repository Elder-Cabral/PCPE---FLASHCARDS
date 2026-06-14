# Plano de Negócios — Flashcards PC-PE

> **Produto:** Plataforma web de flashcards para o concurso de Agente da Polícia Civil de Pernambuco (PC-PE)
> **Estágio atual:** MVP funcional com 1.911 cards em 10 matérias, Supabase como backend, 3 usuários testadores
> **Operador:** Solo, disponibilidade de 1,5 a 2h por dia
> **Data:** Junho/2026

---

## 1. Resumo Executivo

Plataforma web de flashcards especializada no concurso PC-PE 2026, com algoritmo de repetição espaçada (SM-2), conteúdo organizado por edital e suporte a múltiplos usuários com progresso sincronizado na nuvem (Supabase).

**Números-chave do projeto:**
- 1.911 flashcards já produzidos, cobrindo 10 matérias do edital
- MVP testado por 3 usuários reais desde junho/2026
- Stack: Next.js 14 + Supabase (zero custo fixo de infraestrutura no estágio atual)
- Concorrência direta inexistente — não há plataforma focada exclusivamente em PC-PE com flashcards organizados por edital

**Oportunidade:**
- Edital PC-PE publicado recentemente com previsão de prova em ~6 meses (final de 2026)
- Mercado estimado em 30.000–50.000 inscritos potenciais (média histórica de concursos PC-PE)
- Conteúdo perpetual — cada edital gera um novo ciclo de demanda; os cards podem ser reutilizados/editados entre editais

**Modelo recomendado:** Freemium com upgrade para pagamento único (R$ 97) + banco de questões como up-sell (R$ 47).

---

## 2. Análise do Mercado-Alvo

### 2.1 Tamanho do Mercado

| Item | Estimativa | Fonte/Base |
|------|-----------|------------|
| Inscritos PC-PE 2026 (projeção) | 30.000–50.000 | Média histórica concursos PC de porte médio |
| Concurseiros que usam flashcard digital | ~40% | Estimativa conservadora |
| Dispostos a pagar por plataforma especializada | ~15% dos que usam flashcard | Survey informal de grupos de estudo |
| **TAM (Total Addressable Market)** | **30.000–50.000** | Todos os inscritos PC-PE |
| **SAM (Serviceable Addressable Market)** | **12.000–20.000** | Concurseiros que usam flashcard digital |
| **SOM (Serviceable Obtainable Market)** | **1.800–6.000** | Pagantes potenciais (15% do SAM) |

### 2.2 Perfil do Concurseiro PC-PE

- **Idade média:** 25–35 anos
- **Dispositivo predominante:** Celular (70% dos acessos), complementado por notebook/PC
- **Tempo de estudo diário:** 2–4h líquidas (concurseiro trabalhador)
- **Disposição para pagar:** R$ 50–150 em materiais complementares (apostilas, cursos, apps)
- **Maior dor:** Organização do estudo + revisão sistemática; "estudo mas esqueço"
- **Comportamento de consumo:** Compra por impulso racionalizado — pesquisa em grupos de Telegram/WhatsApp antes de pagar; prefere pagamento único a assinatura recorrente

### 2.3 Sazonalidade do Edital

```
                  ┌─────────────────────────────────────────┐
                  │                                         │
    Pico de       │   ┌──────────────────┐                  │
    Demanda       │   │                  │                  │
                  │   │   3-4 meses      │                  │
                  │   │   antes da prova │                  │
                  │   │   (ago-out 2026) │                  │
                  │  ┌┘                  └┐                 │
                  │  │                     │                │
    Crescimento   │  │    Lançamento       │   Pós-edital   │
    Gradual       │  │    do edital        │   (retração)   │
                  └──┴─────────────────────┴────────────────┘
                     jun/26     ago-out/26    nov-dez/26
```

**Implicação:** O pico de inscrições e vendas será entre agosto e outubro de 2026 (~3 meses). A janela de aquisição de usuários é curta. Toda ação de marketing e captação precisa estar rodando até agosto.

---

## 3. Proposta de Valor e Diferenciais

### 3.1 O que o produto resolve

| Problema do concurseiro | Como o produto resolve |
|--------------------------|------------------------|
| "Estudo mas esqueço" | Algoritmo SM-2 de repetição espaçada, com revisões programadas |
| "Não sei o que estudar hoje" | Dashboard com cards vencidos, meta diária, priorização por dificuldade |
| "Material genérico não cai na minha prova" | Cards 100% baseados no edital PC-PE, com pegadinhas CEBRASPE |
| "Perco tempo montando resumo" | Cards prontos por especialista — é só estudar |
| "Não consigo medir progresso" | Estatísticas por matéria, gráficos de desempenho, ofensiva (streak) |

### 3.2 Diferenciais vs. Concorrentes

| Concorrente | Fraqueza explorável | Nosso diferencial |
|-------------|---------------------|-------------------|
| **Anki** (gratuito) | Custo de configurar; decks genéricos ou mal feitos; sem sincronia nativa grátis; interface feia | Cards prontos e revisados por professor especialista; UI moderna; progresso na nuvem sem configurar nada |
| **AnkiPró / Flashcards Genéricos** (pagos) | Conteúdo generalista, sem foco no edital PC-PE; sem dicas CEBRASPE | Conteúdo 100% alinhado ao edital; "Dica do Professor" com mnemônicos e jurisprudência |
| **Cursinhos (Gran, Estratégia, etc.)** | Preço alto (R$ 600–2.000); flashcard é acessório, não produto principal | Preço acessível (R$ 97); foco exclusivo em flashcard + repetição espaçada |
| **PDF / Resumo próprio** | Passivo (só lê); sem revisão ativa; sem métrica de progresso | Ativo (pergunta-resposta); SRS programa revisões; métrica de desempenho |

### 3.3 Diferenciais aspiracionais (futuro)

- **Banco de questões** integrado ao flashcard (ex: errou questão → vira card de revisão)
- **Simulados** com TRI ou critério CEBRASPE
- **Modo offline** (PWA) — celular com dados limitados

---

## 4. Modelo de Monetização Recomendado

### 4.1 Análise de Opções

| Modelo | Prós | Contras | Veredito |
|--------|------|---------|----------|
| **Assinatura mensal (R$ 19,90/mês)** | Receita recorrente previsível | Churn alto em concurso (pós-prova); resistência do público concurseiro; 2-3 meses de receita por usuário | ⚠️ Viável como plano B, mas não ideal para operador solo |
| **Pagamento único (R$ 97)** | Menos atrito na venda; maior conversão; alinhado ao hábito do concurseiro | Sem receita recorrente; depende de novos usuários todo ciclo | ✅ **Recomendado para o produto principal** |
| **Freemium (grátis limitado + upgrade)** | Gera base de usuários grande; prova social; aquecimento para venda | Precisa de engrenagem de conversão; custo de servidor cresce com usuários grátis | ✅ **Recomendado como porta de entrada** |
| **Assinatura vitalícia (R$ 147)** | Receita maior upfront; sensação de "oportunidade" | Pode canibalizar assinatura mensal | ✅ **Bom como oferta limitada no lançamento** |

### 4.2 Modelo Recomendado: Freemium + Pagamento Único

| Camada | O que inclui | Preço | Objetivo |
|--------|-------------|-------|----------|
| **Free** | 30 cards/dia de qualquer matéria, sem recurso de favoritos, sem estatísticas detalhadas | Grátis | Aquecer lead; provar valor |
| **Premium** | Todos os 1.911+ cards ilimitados, SRS completo, favoritos, estatísticas, ofensiva | **R$ 97** (pagamento único, acesso vitalício ao ciclo do edital) | Receita principal |
| **Premium + Questões** | Tudo do Premium + banco de questões comentadas (quando implementado) | **R$ 127** (up-sell) | Receita adicional |

**Justificativa:**
- Concurseiro médio prefere pagar uma vez e "ter" o material
- Freemium é essencial para tração orgânica — o usuário experimenta sem risco
- Pagamento único reduz suporte técnico (sem cancelamentos, sem reembolso recorrente)
- Operador solo não consegue gerenciar cobranças recorrentes, chargebacks e suporte de cancelamento

### 4.3 Gatilho de Conversão no Freemium

O usuário Free deve sentir o limite diário de 30 cards de forma **suave mas incômoda**:
- Ao atingir 30 cards, mostrar: *"Você atingiu o limite diário. Assine o Premium para estudar sem limites e destravar todas as matérias."*
- Botão de upgrade com link para checkout (Stripe/Mercado Pago)
- Enviar e-mail automático após 3 dias de uso free: "Seu progresso está sendo salvo. Quer continuar de onde parou?"

---

## 5. Estratégia de Precificação

### 5.1 Faixas de Preço Recomendadas

| Produto | Preço Sugerido | Justificativa |
|---------|---------------|---------------|
| **Premium (pagamento único)** | **R$ 97** | Abaixo de R$ 100 = decisão de baixo risco; acima do preço de um combo de hambúrguer (~R$ 50), mas abaixo de uma apostila impressa (~R$ 150) |
| **Premium + Questões** | **R$ 127** | Incremento de R$ 30 pelo banco de questões — perceptível mas não assustador |
| **Assinatura mensal** | **R$ 19,90** | Caso queira testar outro modelo; preço de streaming |
| **Assinatura trimestral** | **R$ 47** | Equivalente a R$ 15,67/mês — sensação de economia |
| **Vitalícia (lançamento)** | **R$ 147** | Apenas para os primeiros 100 compradores — gatilho de escassez |

### 5.2 Testes A/B Recomendados

| Teste | Variação A | Variação B | Métrica |
|-------|-----------|-----------|---------|
| Preço Premium | R$ 97 | R$ 67 | Conversão free→pago |
| Preço Premium | R$ 97 | R$ 127 | Receita por usuário vs. conversão |
| Chamada do CTA | "Estude sem limites" | "Passe na PC-PE 2026" | Cliques no botão de upgrade |

### 5.3 Precificação Psicológica

- Usar **R$ 97** em vez de R$ 100 — diferença de "2 dígitos" para "3 dígitos" no subconsciente
- Exibir **preço original "riscado"** de R$ 147 → R$ 97 ("Oferta de lançamento") para criar urgência
- Badge: "Últimas 48h com este preço" — mas usar com moderação para não queimar credibilidade

---

## 6. Estratégia de Aquisição de Usuários

### 6.1 Canais Prioritários (operador solo, 2h/dia)

| Canal | Esforço semanal | Potencial | Prioridade |
|-------|----------------|-----------|------------|
| **Grupos de WhatsApp/Telegram de concurso PC-PE** | 30 min/dia (responder dúvidas + link sutil) | Alto — orgânico, público qualificado | 🔴 Prioritário |
| **Conteúdo no Instagram/TikTok (Reels)** | 45 min/dia (1-2 Reels de 30s) | Alto — alcance viral potencial | 🔴 Prioritário |
| **Parcerias com influenciadores de concurso** | 2h/semana (prospecção e negociação) | Médio-alto — depende de comissão + alinhamento | 🟡 Moderado |
| **Google Ads / Meta Ads** | 1h/semana (configuração e monitoramento) | Médio — pago, precisa de R$ 300-500/mês de verba | 🟡 Moderado |
| **Blog/SEO** | 2h/semana (2 artigos) | Baixo no curto prazo, alto no longo prazo | 🟢 Baixo (fazer se sobrar tempo) |
| **Grupo de estudos próprio (WhatsApp)** | 15 min/dia (moderação) | Médio — engajamento e retenção | 🟡 Moderado |

### 6.2 Plano de Ação: Canal Orgânico (WhatsApp/Telegram)

Os grupos de concurso são o canal mais eficiente para operador solo. Tática:

1. **Entre em 5–10 grupos** de concurso PC-PE no Telegram/WhatsApp
2. **Não venda de cara.** Passe 1 semana só respondendo dúvidas de legislação e direito — mostre autoridade
3. **Gatilho de oferta:** Quando alguém perguntar "como revisar", compartilhe um link da plataforma com 7 dias grátis de Premium
4. **Prova social:** Peça para os 3 testadores atuais postarem depoimento nos grupos ("uso há 2 semanas, meu acerto subiu X%")
5. **Torneio de ofensiva (streak):** Ofereça 1 mês grátis para quem mantiver 7 dias de streak e postar print no grupo

### 6.3 Plano de Ação: Conteúdo em Vídeo (Reels/Short)

Formato testado que funciona com concurseiros:

| Tipo de Reel | Duração | Exemplo | Frequência |
|-------------|---------|---------|------------|
| **Pegadinha CEBRASPE** | 30s | "80% erram essa: o que é crime hediondo?" + resposta surpresa | 3x/semana |
| **Mnemônico rápido** | 15s | "Decore os fundamentos da CF com SO-CI-DI-VA-PLU" | 2x/semana |
| **Progresso real** | 20s | Print do dashboard: "fulano estudou 500 cards em 10 dias" | 1x/semana |
| **Antes e depois** | 25s | "Sem flashcard: esquecia tudo. Com flashcard: 85% de retenção" | 1x/semana |

**Hashtags:** #PCPE #ConcursosPoliciais #CEBRASPE #FlashcardPCPE #ConcursoPC

### 6.4 Parcerias com Produtores de Conteúdo

- **Modelo:** Comissão de 30–40% por venda via link exclusivo
- **Perfil ideal:** Professor/produtor de cursos preparatórios para carreiras policiais (Instagram com 5k–50k seguidores)
- **Abordagem:** "Seus alunos usam flashcard? Tenho uma plataforma pronta. Você ganha comissão sem precisar criar nada."
- **Meta:** Fechar 3 parcerias até agosto/2026

### 6.5 Orçamento de Aquisição (primeiros 6 meses)

| Item | Cálculo | Total |
|------|---------|-------|
| **Anúncios pagos** (Google Ads + Instagram Ads) | R$ 400/mês × 3 meses (ago-out) | R$ 1.200 |
| **Comissão de afiliados** | ~30% × receita estimada de parceiros | Variável (pagamento só após venda) |
| **Ferramentas** (Canva Pro, Stripe taxa) | R$ 100/mês | R$ 600 |
| **Total estimado** | | **~R$ 1.800** |

---

## 7. Roadmap de Funcionalidades

### 7.1 Curto Prazo (Jun–Jul 2026) — Lançamento

**Objetivo:** Transformar MVP em produto vendável.

| Funcionalidade | Prioridade | Esforço estimado | Impacto |
|---------------|-----------|-------------------|---------|
| Stripe/Mercado Pago checkout integrado | 🔴 Essencial | 8–12h | Permite vender |
| Paywall freemium (limite de 30 cards/dia) | 🔴 Essencial | 4–6h | Força upgrade |
| Página de preços / planos | 🔴 Essencial | 4h | Clareza na oferta |
| Tela de cadastro com e-mail + senha (em vez de fixture) | 🔴 Essencial | 6–8h | Segurança e escalabilidade |
| Página de login reformulada com CTAs | 🟡 Alta | 3h | Melhora conversão |
| Landing page simples (o que é, para quem é, preço) | 🟡 Alta | 6h | Primeira impressão profissional |
| Onboarding tutorial (3 telas ao primeiro login) | 🟡 Alta | 4h | Reduz churn inicial |
| Redirecionamento automático para revisão do dia | 🟡 Alta | 2h | Engajamento |

### 7.2 Médio Prazo (Ago–Set 2026)

**Objetivo:** Escalar base de usuários e aumentar retenção.

| Funcionalidade | Justificativa | Esforço |
|---------------|--------------|---------|
| **Banco de questões integrado** (500 questões estilo CEBRASPE) | Aumenta valor percebido — habilita up-sell de R$ 127 | 20–30h de conteúdo + 10h de dev |
| **Modo offline (PWA com service worker)** | Essencial para celular com internet limitada | 8–12h |
| **Notificações push** (revisão do dia) | Reduz churn — lembrete diário aumenta retenção em ~40% | 4–6h |
| **Login com Google** | Reduz atrito no cadastro | 3–4h |
| **Progresso semanal por e-mail** | Engajamento — "Você estudou X cards esta semana" | 4h |
| **Meta personalizável de cards/dia** | Adaptação a diferentes ritmos de estudo | 2h |

### 7.3 Longo Prazo (Out 2026+)

**Objetivo:** Diversificar receita e preparar para o próximo edital.

| Funcionalidade | Justificativa |
|---------------|--------------|
| **Simulados completos** com temporizador e TRI | Principal pedido de concurseiros avançados |
| **Flashcards gerados por IA** (aluno cola texto e vira card) | Diferencial forte — "seu material, nosso algoritmo" |
| **Modo "Bateria CEBRASPE"** — quiz rápido de 10 questões aleatórias | Gamificação e engajamento diário |
| **Ranking entre usuários** (opcional, anônimo) | Engajamento social |
| **Exportar cards para PDF/Anki** | Mitigação de objeção ("e se eu quiser sair?") |
| **Aplicativo mobile nativo (React Native)** | Quando a receita sustentar — PWA já cobre 80% |

### 7.4 O Que NÃO Fazer (por enquanto)

| Ideia | Motivo para adiar |
|-------|-------------------|
| App nativo Android/iOS | PWA cobre bem; app nativo consome 5–10x mais tempo de dev |
| Fórum/comunidade interna | Moderação consome tempo; use grupos de WhatsApp externos |
| Gamificação complexa (níveis, badges, moedas) | Não é diferencial decisivo para conversão |
| Assinatura anual | Concurseiro compra para ciclo do edital; anual não faz sentido |

---

## 8. Projeção Financeira Simplificada

### 8.1 Premissas

| Premissa | Conservador | Moderado | Otimista |
|----------|-------------|----------|----------|
| Usuários cadastrados (6 meses) | 200 | 500 | 1.200 |
| Taxa de conversão free→pago | 5% | 8% | 12% |
| Preço médio do ticket | R$ 97 | R$ 97 | R$ 107 (alguns compram + questões) |
| Churn de usuários ativos (mensal) | 10% | 7% | 5% |
| Custo fixo mensal (servidor + ferramentas) | R$ 50 | R$ 80 | R$ 150 |
| Custo de aquisição (anúncios) | R$ 0 (só orgânico) | R$ 400/mês (ago-out) | R$ 800/mês (ago-out) |

### 8.2 Projeção para 6 Meses (Jun–Nov 2026)

**Cenário Conservador (200 cadastros, 5% conversão = 10 pagantes)**

| Mês | Cadastros | Pagantes no mês | Receita | Custo | Resultado |
|-----|-----------|-----------------|---------|-------|-----------|
| Jun | 10 | 0 | R$ 0 | R$ 50 | -R$ 50 |
| Jul | 25 | 1 | R$ 97 | R$ 50 | +R$ 47 |
| Ago | 30 | 2 | R$ 194 | R$ 50 | +R$ 144 |
| Set | 45 | 2 | R$ 194 | R$ 50 | +R$ 144 |
| Out | 55 | 3 | R$ 291 | R$ 50 | +R$ 241 |
| Nov | 35 | 2 | R$ 194 | R$ 50 | +R$ 144 |
| **Total** | **200** | **10** | **R$ 970** | **R$ 300** | **+R$ 670** |

**Cenário Moderado (500 cadastros, 8% conversão = 40 pagantes)**

| Mês | Cadastros | Pagantes no mês | Receita | Custo | Resultado |
|-----|-----------|-----------------|---------|-------|-----------|
| Jun | 20 | 1 | R$ 97 | R$ 80 | +R$ 17 |
| Jul | 60 | 3 | R$ 291 | R$ 80 | +R$ 211 |
| Ago | 100 | 7 | R$ 679 | R$ 480 | +R$ 199 |
| Set | 130 | 10 | R$ 970 | R$ 480 | +R$ 490 |
| Out | 130 | 12 | R$ 1.164 | R$ 480 | +R$ 684 |
| Nov | 60 | 7 | R$ 679 | R$ 80 | +R$ 599 |
| **Total** | **500** | **40** | **R$ 3.880** | **R$ 1.680** | **+R$ 2.200** |

**Cenário Otimista (1.200 cadastros, 12% conversão = 144 pagantes)**

| Mês | Cadastros | Pagantes no mês | Receita | Custo | Resultado |
|-----|-----------|-----------------|---------|-------|-----------|
| Jun | 30 | 2 | R$ 214 | R$ 150 | +R$ 64 |
| Jul | 120 | 10 | R$ 1.070 | R$ 150 | +R$ 920 |
| Ago | 250 | 22 | R$ 2.354 | R$ 950 | +R$ 1.404 |
| Set | 350 | 40 | R$ 4.280 | R$ 950 | +R$ 3.330 |
| Out | 300 | 46 | R$ 4.922 | R$ 950 | +R$ 3.972 |
| Nov | 150 | 24 | R$ 2.568 | R$ 150 | +R$ 2.418 |
| **Total** | **1.200** | **144** | **R$ 15.408** | **R$ 3.300** | **+R$ 12.108** |

### 8.3 Projeção para 12 Meses (até Maio/2027)

| Cenário | Receita 12m | Custo 12m | Lucro 12m | Breakeven |
|---------|------------|-----------|-----------|-----------|
| Conservador | ~R$ 1.500 | ~R$ 600 | ~R$ 900 | Não atinge (lucro baixo) |
| Moderado | ~R$ 5.500 | ~R$ 2.500 | ~R$ 3.000 | Mês 2 |
| Otimista | ~R$ 22.000 | ~R$ 5.500 | ~R$ 16.500 | Mês 1 |

> **Nota:** A receia pós-prova (dez 2026+) cai drasticamente. O ciclo seguinte (próximo edital) reacende a demanda. Por isso o plano de 12 meses considera receita concentrada em 4 meses (ago–nov 2026).

### 8.4 Métricas de Acompanhamento (KPIs)

| Métrica | Meta conservadora | Meta moderada | Meta otimista | Frequência |
|---------|------------------|---------------|---------------|------------|
| Cadastros/dia | 2 | 5 | 15 | Diário |
| Conversão free→pago | 5% | 8% | 12% | Semanal |
| DAU (usuários ativos/dia) | 15 | 50 | 150 | Diário |
| Cards estudados/dia | 200 | 800 | 3.000 | Diário |
| Streak médio (dias) | 3 | 5 | 7 | Semanal |
| Custo de aquisição (CAC) | R$ 0 (orgânico) | R$ 8 | R$ 5 | Mensal |
| Receita por usuário (LTV) | R$ 97 | R$ 97 | R$ 107 | Mensal |

---

## 9. Riscos e Mitigação

### 9.1 Matriz de Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| **Edital muda radicalmente** | Baixa | Alto — cards podem ficar obsoletos | Arquitetura de cards por tópico permite edição rápida; adaptar cards de matérias alteradas em ~1 semana de trabalho |
| **Concorrente maior (Gran, Estratégia) lança flashcard integrado** | Média | Médio — mas eles não têm foco PC-PE | Reforçar diferenciais de qualidade de conteúdo + preço baixo + curadoria CEBRASPE; nicho é nossa defesa |
| **Baixa conversão free→pago** | Média | Alto | Testar preços (A/B); melhorar onboarding; adicionar prova social no checkout |
| **Churn alto pós-prova** | Alta | Médio — já esperado | Modelo de pagamento único mitiga; aquecer base para próximo edital com e-mail marketing |
| **Usuário grátis consome muito servidor** | Média | Médio | Limitar requisições de API para usuários free; usar cache no frontend; Supabase free tier aguenta até 50k requests/mês |
| **Problemas de pagamento (chargeback, fraude)** | Baixa | Médio | Stripe Radar + Mercado Pago; política de reembolso de 7 dias clara |
| **Operador solo fica doente ou sobrecarregado** | Média | Alto | Automatizar o máximo possível (e-mails automáticos, onboarding); documentar tudo; considerar VA (assistente virtual) de R$ 500/mês se receita permitir |

### 9.2 Risco Específico: Mudança de Edital

**Probabilidade:** Baixa para PCPE 2026 (edital já publicado).
**Cenário futuro:** Editais podem mudar drasticamente (ex: nova lei incluída).

**Estratégia de mitigação por design:**
- Cards são estruturados com `topico` e `codigo_topico` — se um tópico sai do edital, basta desabilitá-lo, não deletá-lo
- Se um novo tópico entra, a geração de cards assistida por IA + revisão do professor especialista leva ~5–7 dias para criar 100–150 cards
- Manter um "comodato" de atualização: assinantes vitalícios têm direito a receber cards novos sem custo extra (fidelização)

### 9.3 Risco Específico: Concorrência

O risco real não são os apps genéricos, mas sim plataformas como **Gran Cursos** ou **Estratégia Concursos** lançarem flashcard integrado.

**Defesa:**
1. **Foco em nicho:** Gran/Estratégia têm milhares de concursos — flashcard genérico deles nunca será tão específico quanto o nosso para PC-PE
2. **Precificação:** R$ 97 vs. R$ 600+ de assinatura de cursinho — mesmo que eles ofertem flashcard, será como complemento, não como produto standalone acessível
3. **Conteúdo com curadoria CEBRASPE:** Dicas de pegadinha, mnemônicos, súmulas — cursinhos produzem conteúdo em massa, não com profundidade de banca

---

## 10. Próximos Passos Imediatos (Próximas 2 Semanas)

### Semana 1 (ação ~1,5h/dia)

| Dia | Tarefa | Tempo | Ferramenta |
|-----|--------|-------|-----------|
| **Seg** | Criar conta Stripe + Mercado Pago (sandbox) | 1h | Stripe.com / Mercado Pago Developers |
| **Ter** | Implementar componente de paywall freemium (limite 30 cards/dia) | 2h | Código (js) |
| **Qua** | Criar página de planos com CTAs | 1,5h | Código (jsx) |
| **Qui** | Implementar checkout Stripe (Checkout Session) + webhook | 2h | Código + Stripe dashboard |
| **Sex** | Testar fluxo completo: cadastro → free → upgrade → premium ativo | 1h | Manual |
| **Sáb** | Criar landing page simples (publish na Vercel) + domínio | 1,5h | Vercel + Registro.br (R$ 40) |
| **Dom** | Pesquisar 10 grupos de Telegram/WhatsApp PC-PE para entrar | 1h | Telegram / Facebook |

### Semana 2

| Dia | Tarefa | Tempo | Ferramenta |
|-----|--------|-------|-----------|
| **Seg** | Gravar 1 Reel de apresentação (30s) + postar | 1h | Instagram/TikTok (CapCut) |
| **Ter** | Entrar nos grupos de concurso, se apresentar (não vender) | 30min | Telegram/WhatsApp |
| **Qua** | Criar e-mail automático de boas-vindas para cadastrados | 1h | Resend / SendGrid (free tier) |
| **Qui** | Criar política de reembolso + termos de uso (página legal) | 1h | Markdown (copiar de referências + adaptar) |
| **Sex** | Testar checkout com cartão real (comprar próprio produto por R$ 1) | 30min | Stripe |
| **Sáb** | Lançar versão paga oficialmente — postar nos grupos | 1h | Redes sociais + grupos |
| **Dom** | Monitorar primeiras conversões; ajustar preço se necessário | 30min | Stripe dashboard |

### Checklist de Lançamento

- [ ] Stripe/Mercado Pago configurado e testado
- [ ] Paywall freemium funcionando (30 cards/dia)
- [ ] Checkout → Premium libera acesso total
- [ ] Página de planos com CTAs
- [ ] Landing page publicada
- [ ] Domínio próprio (ex: flashcardpcpe.com.br) — ~R$ 40
- [ ] E-mail automático de boas-vindas
- [ ] Termos de uso + política de privacidade
- [ ] Post em 5+ grupos de concurso
- [ ] 1 Reel no Instagram/TikTok
- [ ] Teste completo de todas as funcionalidades

---

## Apêndice A: Stack Técnica Atual e Recomendação

| Componente | Atual | Recomendado | Motivo |
|-----------|-------|-------------|--------|
| **Frontend** | Next.js 14 | Manter | Já funcional, ótimo para SEO |
| **Backend/Banco** | Supabase (Postgres) | Manter | Free tier robusto, Auth incluso |
| **Autenticação** | Fixture local | Supabase Auth | Segurança e escalabilidade |
| **Pagamento** | Nenhum | Stripe (principal) + Mercado Pago (PIX) | Stripe: melhor experiência dev; Mercado Pago: PIX é essencial no Brasil |
| **Domínio** | Vercel.app (.vercel.app) | flashcardpcpe.com.br | Profissionalismo e confiança |
| **E-mail** | Nenhum | Resend (free: 100 emails/dia) | Disparo de boas-vindas e recuperação |
| **Hospedagem** | Vercel (gratuita) | Manter | Enquanto não passar do free tier |
| **Analytics** | Nenhum | Plausible ou Umami (self-hosted) | Privacidade, sem anúncios |
| **CDN / Assets** | Vercel | Manter | Incluso na hospedagem |

## Apêndice B: Script de Checkout (Stripe) — Referência Rápida

Para implementar o checkout de pagamento único:

```javascript
// /src/app/api/create-checkout/route.js
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const { userId, email } = await req.json();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: 'price_premium_id_aqui', quantity: 1 }],
    customer_email: email,
    success_url: `${req.headers.get('origin')}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.headers.get('origin')}/cancelado`,
    metadata: { userId }
  });
  return Response.json({ url: session.url });
}
```

Webhook para liberar acesso após pagamento:

```javascript
// /src/app/api/webhook/route.js
export async function POST(req) {
  const event = stripe.webhooks.constructEvent(
    await req.text(),
    req.headers.get('stripe-signature'),
    process.env.STRIPE_WEBHOOK_SECRET
  );
  if (event.type === 'checkout.session.completed') {
    const { metadata: { userId } } = event.data.object;
    await supabase.from('users').update({ premium: true }).eq('id', userId);
  }
  return Response.json({ received: true });
}
```

---

## Apêndice C: Gatilhos de E-mail Automáticos

| Gatilho | Timing | Conteúdo | Ferramenta |
|---------|--------|----------|------------|
| Boas-vindas Free | Imediato após cadastro | "Bem-vindo! Aqui estão 30 cards/dia grátis. Quer ver como funciona?" | Resend |
| Alerta de limite | Ao atingir 28 cards no dia | "Você está quase no limite diário. Que tal liberar o acesso total?" | Resend |
| Abandono (3 dias sem login) | 3 dias sem atividade | "Seus cards estão te esperando. Volte e veja o que revisar hoje." | Resend |
| Conversão (upgrade) | Imediato após pagamento | "Premium ativo! Aqui está seu guia rápido de estudo." | Resend |
| Pós-prova (dez/2026) | 1 semana após a prova | "Parabéns por ter chegado até aqui! Enquanto espera o resultado, que tal se preparar para o próximo?" | Resend |
