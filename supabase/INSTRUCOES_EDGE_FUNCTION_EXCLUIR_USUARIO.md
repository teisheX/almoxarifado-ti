# Edge Function delete-user

Esta função permite excluir usuários pelo painel do administrador.

## Publicar a função

```powershell
supabase.cmd functions deploy delete-user
```

## Regras

- Apenas usuários com `role = admin` e `ativo = true` podem excluir usuários.
- O administrador não pode excluir o próprio usuário logado.
- A função remove o perfil em `public.profiles` e remove o usuário do `Supabase Auth`.
- A ação é registrada em `audit_logs`.

## Observação de segurança

A exclusão de usuários do Supabase Auth precisa da `service_role`, por isso deve passar por Edge Function. Nunca coloque a service role no frontend React.
