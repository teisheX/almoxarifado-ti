# Criar usuário pelo painel do administrador

O GitHub Pages é um site estático. Por segurança, o frontend não pode usar a `service_role key` do Supabase.

Para o botão **Criar usuário** funcionar dentro do painel do administrador, este projeto usa uma **Supabase Edge Function** chamada `create-user`.

## 1. Instalar Supabase CLI

No PowerShell:

```powershell
npm.cmd install -g supabase
```

## 2. Fazer login no Supabase CLI

```powershell
supabase login
```

## 3. Linkar o projeto local ao projeto do Supabase

Dentro da pasta do projeto:

```powershell
cd C:\Users\victor.lino\Documents\ALMOXARIFADO
supabase link --project-ref SEU_PROJECT_REF
```

O `project-ref` é o código do seu projeto Supabase. Exemplo: `abcdefghijklmno`.

## 4. Configurar a service role na Edge Function

No Supabase, vá em:

`Project Settings > API`

Copie a chave **service_role**.

Depois rode:

```powershell
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="SUA_SERVICE_ROLE_KEY"
```

Nunca coloque essa chave no `.env` do frontend e nunca envie para o GitHub.

## 5. Publicar a função

```powershell
supabase functions deploy create-user
```

## 6. Testar no sistema

1. Rode o sistema local ou abra o GitHub Pages.
2. Entre com usuário administrador.
3. Vá em **Usuários**.
4. Preencha nome, e-mail, senha, perfil e localização caso seja leitor.
5. Clique em **Criar usuário**.

O usuário será criado no Supabase Auth e também na tabela `profiles`.
