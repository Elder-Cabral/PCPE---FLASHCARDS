Resumo rápido da verificação de segurança (simples)

Contexto
- Projeto em desenvolvimento para flashcards (PCPE). Ambiente local, 3 usuários predefinidos.

Achados (prioridade alta → baixa)
1. Credenciais em texto claro: src/app/page.js contém um array USERS com senhas em texto claro ("passei"). Remover do código-fonte ou substituir por armazenamento seguro.
2. Uso de Supabase: package.json indica dependência @supabase/supabase-js. Verificar se as chaves (anon/key ou service_role) não estão commitadas em .env ou arquivos de configuração. .gitignore já contém .env*.local (positivo).
3. Artefatos build: diretório .next está presente — conteúdo gerado contém referências a process.env mas não deve ser commitado (já está ignorado no .gitignore). Confirme que não há segredos em commits anteriores.
4. Persistência local: uso de localStorage para sessão e SRS (pcpe_session, pcpe_srs_*). Informação sensível (tokens) não deve ser armazenada sem medidas (ex: breve expiração, proteção). Avaliar se algo sensível é colocado lá.
5. Proteção no front: não há proteção contra ataques de força bruta no login (apenas verifica USERS em memória). Para produção, usar backend com autenticação, rate limiting e hashing de senhas.

Recomendações (simples, imediatas)
1. Remover USERS com senhas em texto do repositório. Alternativas simples:
   - Substituir USERS por um único arquivo de fixture excluído do git (ex: users.local.json) e manter no .gitignore; ou
   - Implementar checagem que delega autenticação ao Supabase (ou backend) usando variáveis de ambiente para credenciais administrativas.
2. Nunca colocar chaves do Supabase (service_role) em código cliente. Usar apenas anon key no cliente e manter service_role no servidor.
3. Adicionar uma rotina mínima de hashing (bcrypt) caso opte por manter usuários locais temporariamente.
4. Verificar histórico Git por segredos (git log --patch) e, se encontrado, rotacionar credenciais comprometidas.
5. Proteções básicas HTTP quando publicar: HTTPS, CORS restrito, Content-Security-Policy, X-Frame-Options.

Checklist rápido (para executar localmente)
- [ ] Remover/rotacionar credenciais em texto claro
- [ ] Confirmar .gitignore cobre arquivos de ambiente e build
- [ ] Revisar commits anteriores por chaves
- [ ] Mover autenticação para backend/Supabase e usar hashing
- [ ] Rever uso de localStorage para dados sensíveis

Observação: esta verificação é intencionalmente simples e focada nas evidências locais encontradas rapidamente. Para auditoria completa, executar scans de dependências, SCA, e testes de penetração.

Feito por: OpenCode — verificação rápida solicitada
