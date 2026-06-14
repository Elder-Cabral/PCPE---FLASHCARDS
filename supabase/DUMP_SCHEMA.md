# Como versionar as RLS Policies

## Pré-requisito

```bash
npx supabase login
```
Isso abrirá o navegador para autenticação no Supabase.

## Linkar o projeto

```bash
npx supabase link --project-ref qywadtazswulvzklzfdu
```

## Dump do schema (tabelas + policies)

```bash
npx supabase db dump --schema public > supabase/schema.sql
```

Depois de rodar, o arquivo `supabase/schema.sql` conterá todo o DDL, incluindo `CREATE POLICY` e `ALTER TABLE ENABLE ROW LEVEL SECURITY`. Comite esse arquivo no repositório para versionamento.

## Verificar RLS manualmente (via SQL Editor do Dashboard)

Caso prefira verificar pelo navegador:

1. Acesse https://supabase.com/dashboard/project/qywadtazswulvzklzfdu
2. Vá em **SQL Editor**
3. Execute:

```sql
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Isso mostra quais tabelas têm RLS habilitado.

Para ver as policies existentes:

```sql
SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```
