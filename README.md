# Sistema de Almoxarifado de TI

Sistema web responsivo para gerenciamento de gestão patrimonial, com React, Vite e Supabase.

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

## Importação de CSV

A tela **Itens** possui o botão **Importar CSV** e o botão **Baixar modelo CSV**.

Colunas aceitas no CSV:

```csv
modelo;marca;patrimonio;codigo_barras;categoria;status;quantidade;localizacao;tipo;responsavel_atual;observacoes;fornecedor;data_aquisicao;valor_estimado;garantia_ate
```

Regras importantes:

- `modelo`, `marca`, `patrimonio`, `codigo_barras`, `categoria` e `localizacao` são obrigatórios.
- `patrimonio` não pode estar duplicado no sistema nem no próprio CSV.
- `codigo_barras` não pode estar duplicado no sistema nem no próprio CSV.
- `marca`, `categoria` e `localizacao` precisam estar cadastradas antes da importação.
- O separador recomendado é ponto e vírgula `;`, compatível com o padrão brasileiro/Excel.
- Status aceitos: `disponivel`, `em_uso`, `manutencao`, `descartado`.


## Campos obrigatórios no cadastro de itens

Nesta versão, somente estes campos são obrigatórios:

- Nome do item / Modelo
- Marca
- Patrimônio

Código de barras, categoria, status, quantidade, localização e demais campos são opcionais.

Se você já criou o banco no Supabase antes desta alteração, execute também:

```sql
-- supabase/migration_campos_opcionais_itens.sql
alter table public.itens alter column codigo_barras drop not null;
alter table public.itens alter column categoria_id drop not null;
alter table public.itens alter column localizacao_id drop not null;
alter table public.itens alter column status set default 'disponivel';
alter table public.itens alter column quantidade set default 1;
```

## Atualização: Setor, Time e Totalizador

Esta versão adiciona os campos `setor` e `time` no cadastro de itens, na listagem, na busca global, na importação CSV e na exportação PDF/CSV.

Também foi adicionado um totalizador na tela de Itens com:

- total de itens filtrados;
- quantidade total filtrada;
- valor estimado total, calculado por `quantidade x valor_estimado`.

Se o banco já estiver criado no Supabase, execute o arquivo abaixo no SQL Editor:

```sql
supabase/migration_setor_time_totalizador.sql
```


## Campo Número de Série

O cadastro de ativos possui o campo opcional `numero_serie`. Para bancos já criados, execute no Supabase o arquivo `supabase/migration_numero_serie_itens.sql`.


## Perfil Leitor por localização

O sistema agora possui o perfil `leitor`.

Regras do leitor:

- Visualiza somente itens vinculados à `localizacao_id` configurada no perfil dele.
- Não pode cadastrar itens.
- Não pode editar itens.
- Não pode excluir itens.
- Não pode importar CSV.
- Não pode exportar PDF/CSV.
- Não acessa gestão de usuários, cadastros ou auditoria.

Para usar em banco já existente, rode no Supabase SQL Editor:

```sql
-- arquivo incluso no projeto
-- supabase/migration_perfil_leitor_localizacao.sql
```

Depois acesse **Gestão de usuários**, altere o usuário para `Leitor` e selecione a **Localização do leitor**.

## Criar usuários pelo painel do administrador

A tela **Usuários** possui um formulário para criar usuário diretamente pelo painel ADM.

Como o projeto roda no GitHub Pages, a criação segura do usuário no Supabase Auth é feita por uma Supabase Edge Function em:

```text
supabase/functions/create-user/index.ts
```

Para configurar, leia:

```text
supabase/INSTRUCOES_EDGE_FUNCTION_CRIAR_USUARIO.md
```

Atenção: a chave `service_role` deve ficar somente nas secrets da Edge Function. Nunca coloque essa chave no frontend, `.env` público ou GitHub.

## QR Code de localizações

A aba **Cadastros > Localizações** possui o botão **Gerar QR**. O QR Code gerado abre o sistema direto na aba **Itens** com o filtro da localização selecionada.

Formato do link gerado:

```text
https://teisheX.github.io/almoxarifado-ti/#/itens?localizacao_id=ID_DA_LOCALIZACAO
```

Se o usuário não estiver autenticado, ele será levado para o login e, após entrar, retornará para a listagem filtrada. Usuários com perfil **Leitor** continuam limitados pelas políticas RLS e só visualizam itens da localização vinculada ao perfil.
