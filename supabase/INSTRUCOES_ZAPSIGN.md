# Integração ZapSign - 3RN Ativos

## Onde colocar o token da ZapSign

O token da ZapSign NÃO fica no `.env` do React e NÃO deve ir para o GitHub.

Coloque o token como secret da Supabase Edge Function:

```powershell
cd C:\Users\victor.lino\Documents\ALMOXARIFADO
supabase.cmd secrets set ZAPSIGN_API_TOKEN="COLE_SEU_TOKEN_DA_ZAPSIGN_AQUI"
```

## Onde pegar o token

Na ZapSign, acesse a área de integrações/API da conta e copie o Access Token/API Token.

## Banco de dados

Execute no Supabase > SQL Editor:

```text
supabase/migration_zapsign_termos.sql
```

## Publicar Edge Functions

```powershell
supabase.cmd functions deploy create-zapsign-term
supabase.cmd functions deploy zapsign-webhook --no-verify-jwt
```

## Webhook na ZapSign

Cadastre esta URL no painel da ZapSign:

```text
https://kvsbgmkxjrtxulvqbnvd.functions.supabase.co/zapsign-webhook
```

Eventos recomendados: documento criado, documento assinado, documento finalizado, documento recusado e documento deletado.

## Frontend

Depois das funções:

```powershell
npm.cmd run build
npm.cmd run deploy
```

A aba Termos fica disponível para Admin e Supervisor.
