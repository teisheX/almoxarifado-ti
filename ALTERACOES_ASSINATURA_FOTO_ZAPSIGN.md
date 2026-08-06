# Alterações ZapSign - assinatura com selfie

Arquivos alterados:

- `supabase/functions/create-zapsign-term/index.ts`
  - Removido `sandbox: true`.
  - Adicionada assinatura na tela em produção.
  - Adicionado `require_selfie_photo: true`.
  - Adicionado `require_cpf: true`.
  - Mantido `selfie_validation_type: "none"` por padrão para coletar fotos sem biometria avançada.

- `supabase/functions/zapsign-webhook/index.ts`
  - Captura links de selfie e imagem da assinatura quando vierem no webhook.
  - Salva as evidências nas colunas do termo.

- `supabase/migration_zapsign_termos.sql`
  - Adiciona colunas para evidências da assinatura.

- `src/pages/Terms.jsx`
  - Mostra links de selfie e assinatura na tabela de termos quando a ZapSign retornar esses dados.

Depois de copiar os arquivos, rode:

```powershell
cd C:\Users\victor.lino\Documents\ALMOXARIFADO

supabase.cmd functions deploy create-zapsign-term
supabase.cmd functions deploy zapsign-webhook --no-verify-jwt

npm.cmd run build
npm.cmd run deploy
```

No Supabase SQL Editor, rode novamente:

```text
supabase/migration_zapsign_termos.sql
```

Documentos antigos em sandbox não deixam de ser sandbox. Gere um termo novo depois desta alteração.
