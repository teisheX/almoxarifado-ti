# Instruções para subir no GitHub Pages

Este projeto já está preparado para usar:

- Frontend: GitHub Pages
- Banco/Login/Permissões: Supabase

## 1. Antes de subir

Na raiz do projeto, crie o arquivo `.env` com suas chaves reais do Supabase:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLIC
```

Não envie o `.env` para o GitHub. O `.gitignore` já bloqueia esse arquivo.

## 2. Configure o nome do repositório

Abra o arquivo `vite.config.js`.

Se o repositório for chamado `almoxarifado-ti`, deixe assim:

```js
base: '/almoxarifado-ti/',
```

Se o repositório tiver outro nome, troque para:

```js
base: '/NOME-DO-SEU-REPOSITORIO/',
```

## 3. Instale e teste localmente

```bash
npm install
npm run dev
```

## 4. Suba o código para o GitHub

```bash
git init
git add .
git commit -m "feat: sistema almoxarifado ti"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/almoxarifado-ti.git
git push -u origin main
```

## 5. Faça o deploy para GitHub Pages

```bash
npm run deploy
```

Esse comando cria/atualiza a branch `gh-pages` com o conteúdo da pasta `dist`.

## 6. Ative o GitHub Pages

No GitHub:

1. Abra o repositório.
2. Vá em **Settings**.
3. Vá em **Pages**.
4. Em **Source**, escolha **Deploy from a branch**.
5. Em **Branch**, escolha `gh-pages`.
6. Em pasta, escolha `/root`.
7. Salve.

A URL ficará parecida com:

```text
https://SEU_USUARIO.github.io/almoxarifado-ti/
```

## 7. Configure o Supabase

1. Crie um projeto no Supabase.
2. Vá em **SQL Editor**.
3. Execute o conteúdo do arquivo `supabase/schema.sql`.
4. Vá em **Authentication > Users** e crie seu usuário.
5. Rode este SQL para transformar seu usuário em administrador:

```sql
update public.profiles
set role = 'admin', supervisor_pode_exportar = true
where email = 'SEU_EMAIL_AQUI';
```

## O que vai para o GitHub

Pode enviar:

- `src/`
- `public/`
- `supabase/schema.sql`
- `package.json`
- `vite.config.js`
- `.env.example`
- `.gitignore`
- `README.md`

Não envie:

- `.env`
- `node_modules/`
- `dist/`
