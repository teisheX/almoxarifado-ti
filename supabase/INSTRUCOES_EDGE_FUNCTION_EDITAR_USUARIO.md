# Edge Function: update-user

Esta função permite editar usuário pelo painel ADM.

## Publicar

```powershell
supabase.cmd functions deploy update-user
```

Depois atualize o frontend:

```powershell
npm.cmd run build
npm.cmd run deploy
```

A função usa as variáveis padrão do Supabase Edge Functions: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Não coloque a service role no frontend.
