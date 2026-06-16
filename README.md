# Sistema de Almoxarifado de TI

Sistema web responsivo para gerenciamento de almoxarifado de TI, com React, Vite e Supabase.

## Recursos implementados

- Login com Supabase Auth
- Perfil `admin` e `supervisor`
- Dashboard por perfil
- Cadastro de itens
- Lista de itens com busca e filtros
- Scanner de código de barras via câmera do celular
- Exportação CSV com UTF-8 e separador `;`
- Exportação PDF
- Gestão de usuários para admin
- Gestão de categorias, marcas e localizações
- Logs de auditoria e exportação
- Soft delete para itens
- Interface responsiva mobile-first
- Imagens profissionais no login, dashboard, scanner e relatórios
- SQL completo com tabelas, triggers, funções e RLS
- Configuração pronta para GitHub Pages

## Como rodar localmente

```bash
npm install
cp .env.example .env
npm run dev
```

No arquivo `.env`, configure:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLIC
```

## Como configurar o Supabase

1. Crie um projeto no Supabase.
2. Vá em **SQL Editor**.
3. Execute o arquivo `supabase/schema.sql`.
4. Vá em **Authentication > Users** e crie um usuário.
5. Depois de criar o primeiro usuário, rode no SQL Editor:

```sql
update public.profiles
set role = 'admin', supervisor_pode_exportar = true
where email = 'SEU_EMAIL_AQUI';
```

6. Crie outros usuários normalmente pelo Supabase Auth. Eles entram como `supervisor` por padrão.

## Permissões principais

- Admin: cria, lê, edita, exclui por soft delete, exporta, gerencia usuários, categorias, marcas, localizações e logs.
- Supervisor: cria e lê itens. Não edita, não exclui e não gerencia usuários.
- Supervisor só exporta se `supervisor_pode_exportar = true`.

## Deploy no GitHub Pages

O projeto já vem com `vite.config.js` e script de deploy.

Se o nome do repositório for `almoxarifado-ti`, não precisa alterar nada.

Se o repositório tiver outro nome, altere em `vite.config.js`:

```js
base: '/NOME-DO-SEU-REPOSITORIO/',
```

Depois rode:

```bash
npm install
npm run deploy
```

No GitHub, ative em:

**Settings > Pages > Deploy from a branch > gh-pages > /root**

Mais detalhes estão no arquivo `INSTRUCOES_GITHUB_PAGES.md`.
