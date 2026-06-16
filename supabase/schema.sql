-- Execute este arquivo no SQL Editor do Supabase.
-- Depois crie os usuários em Authentication > Users.
-- O primeiro usuário deve ser promovido manualmente para admin na tabela profiles.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  role text not null default 'supervisor' check (role in ('admin', 'supervisor')),
  ativo boolean not null default true,
  supervisor_pode_exportar boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.marcas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.localizacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.itens (
  id uuid primary key default gen_random_uuid(),
  modelo text not null,
  marca_id uuid not null references public.marcas(id),
  patrimonio text not null unique,
  codigo_barras text not null unique,
  categoria_id uuid not null references public.categorias(id),
  tipo text,
  status text not null default 'disponivel' check (status in ('disponivel', 'em_uso', 'manutencao', 'descartado')),
  quantidade integer not null default 1 check (quantidade >= 0),
  localizacao_id uuid not null references public.localizacoes(id),
  responsavel_atual text,
  observacoes text,
  foto_url text,
  nota_fiscal_url text,
  data_aquisicao date,
  valor_estimado numeric(12,2),
  fornecedor text,
  garantia_ate date,
  criado_por uuid not null references public.profiles(id),
  atualizado_por uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.movimentacoes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.itens(id) on delete cascade,
  tipo_movimentacao text not null,
  status_anterior text,
  status_novo text,
  localizacao_anterior uuid references public.localizacoes(id),
  localizacao_nova uuid references public.localizacoes(id),
  responsavel_anterior text,
  responsavel_novo text,
  observacao text,
  realizado_por uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.profiles(id),
  acao text not null,
  tabela_afetada text,
  registro_id uuid,
  detalhes jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.export_logs (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles(id),
  tipo_exportacao text not null,
  formato text not null check (formato in ('pdf', 'csv')),
  filtros_aplicados jsonb default '{}',
  quantidade_registros integer not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists trg_itens_updated_at on public.itens;
create trigger trg_itens_updated_at before update on public.itens for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email, role, ativo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    'supervisor',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and ativo = true
  );
$$;

create or replace function public.is_supervisor_active()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'supervisor' and ativo = true
  );
$$;

create or replace function public.can_export()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and ativo = true
      and (role = 'admin' or supervisor_pode_exportar = true)
  );
$$;

alter table public.profiles enable row level security;
alter table public.categorias enable row level security;
alter table public.marcas enable row level security;
alter table public.localizacoes enable row level security;
alter table public.itens enable row level security;
alter table public.movimentacoes enable row level security;
alter table public.audit_logs enable row level security;
alter table public.export_logs enable row level security;

-- PROFILES
create policy "profiles_select_own_or_admin" on public.profiles
for select using (id = auth.uid() or public.is_admin());

create policy "profiles_update_admin_only" on public.profiles
for update using (public.is_admin()) with check (public.is_admin());

-- Impede usuário comum de se promover para admin. Inserts são feitos pelo trigger.

-- TABELAS ADMINISTRATIVAS
create policy "categorias_select_active" on public.categorias
for select using (ativo = true or public.is_admin());
create policy "categorias_admin_all" on public.categorias
for all using (public.is_admin()) with check (public.is_admin());

create policy "marcas_select_active" on public.marcas
for select using (ativo = true or public.is_admin());
create policy "marcas_admin_all" on public.marcas
for all using (public.is_admin()) with check (public.is_admin());

create policy "localizacoes_select_active" on public.localizacoes
for select using (ativo = true or public.is_admin());
create policy "localizacoes_admin_all" on public.localizacoes
for all using (public.is_admin()) with check (public.is_admin());

-- ITENS
create policy "itens_select_admin_supervisor" on public.itens
for select using ((public.is_admin() or public.is_supervisor_active()) and deleted_at is null);

create policy "itens_insert_admin_supervisor" on public.itens
for insert with check (
  (public.is_admin() or public.is_supervisor_active())
  and criado_por = auth.uid()
);

create policy "itens_update_admin_only" on public.itens
for update using (public.is_admin()) with check (public.is_admin());

create policy "itens_delete_admin_only" on public.itens
for delete using (public.is_admin());

-- MOVIMENTAÇÕES
create policy "movimentacoes_select_admin" on public.movimentacoes
for select using (public.is_admin());
create policy "movimentacoes_insert_admin" on public.movimentacoes
for insert with check (public.is_admin() and realizado_por = auth.uid());

-- AUDITORIA
create policy "audit_logs_select_admin" on public.audit_logs
for select using (public.is_admin());
create policy "audit_logs_insert_authenticated" on public.audit_logs
for insert with check (usuario_id = auth.uid());

-- EXPORTAÇÕES
create policy "export_logs_select_admin" on public.export_logs
for select using (public.is_admin());
create policy "export_logs_insert_allowed" on public.export_logs
for insert with check (usuario_id = auth.uid() and public.can_export());

insert into public.categorias (nome, descricao) values
('Notebook', 'Computadores portáteis'),
('Monitor', 'Monitores e telas'),
('Periférico', 'Teclados, mouses, webcams e acessórios'),
('Rede', 'Roteadores, switches e equipamentos de rede'),
('Peça', 'Peças de reposição')
on conflict (nome) do nothing;

insert into public.marcas (nome) values
('Dell'), ('HP'), ('Lenovo'), ('Acer'), ('Samsung'), ('Logitech'), ('TP-Link'), ('Intelbras')
on conflict (nome) do nothing;

insert into public.localizacoes (nome, descricao) values
('Almoxarifado TI', 'Sala principal do almoxarifado'),
('Sala Técnica', 'Ambiente técnico'),
('Manutenção', 'Bancada de manutenção'),
('Usuário Final', 'Equipamento entregue a colaborador')
on conflict (nome) do nothing;
