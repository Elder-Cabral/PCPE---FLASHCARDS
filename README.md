# Flashcards PC-PE — Deploy na Vercel

## Usuários
| Usuário  | Senha | Perfil |
|----------|-------|--------|
| elder    | 123   | admin  |
| helo     | 123   | user   |
| dannilo  | 123   | user   |

## Como fazer deploy na Vercel (passo a passo)

### 1. Instalar o Node.js
- Baixe em: https://nodejs.org (versão LTS)
- Instale normalmente

### 2. Criar conta na Vercel
- Acesse: https://vercel.com
- Clique em "Sign Up" → use sua conta do GitHub (recomendado) ou e-mail

### 3. Criar conta no GitHub (se não tiver)
- Acesse: https://github.com
- Crie uma conta gratuita

### 4. Criar repositório no GitHub
- Clique em "New repository"
- Nome: `flashcards-pcpe`
- Deixe como Public ou Private
- Clique "Create repository"

### 5. Subir o projeto
Abra o terminal na pasta do projeto e rode:
```bash
git init
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/flashcards-pcpe.git
git push -u origin main
```

### 6. Deploy na Vercel
- Acesse: https://vercel.com/new
- Clique "Import Git Repository"
- Selecione o repositório `flashcards-pcpe`
- Clique "Deploy"
- Aguarde ~2 minutos
- Pronto! A Vercel gera um link como: `https://flashcards-pcpe.vercel.app`

### 7. Compartilhar
Envie o link para Helo e Dannilo. Eles acessam pelo celular ou computador, fazem login com usuário e senha, e os flashcards salvos ficam separados por usuário.

## Estrutura do projeto
```
src/app/
  layout.js   — configuração da página
  page.js     — app completo (login + flashcards)
package.json  — dependências
next.config.js
```

## Alterar senhas
Edite o arquivo `src/app/page.js`, procure por `const USERS = [` e altere os valores de `password`.
