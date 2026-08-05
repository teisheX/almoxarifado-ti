-- Integração ZapSign: colaboradores, termos de responsabilidade e itens vinculados.
-- Execute este arquivo no Supabase > SQL Editor antes de usar a aba Termos.

create table if not exists public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text unique,
  email text,
  telefone text,
  cargo text,
  setor text,
  ativo boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.termos_responsabilidade (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references public.colaboradores(id),
  status text default 'rascunho',
  zapsign_document_token text,
  zapsign_signer_token text,
  zapsign_sign_url text,
  pdf_original_url text,
  pdf_assinado_url text,
  local_data text,
  webhook_payload jsonb,
  criado_por uuid references public.profiles(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.termo_itens (
  id uuid primary key default gen_random_uuid(),
  termo_id uuid references public.termos_responsabilidade(id) on delete cascade,
  item_id uuid references public.itens(id),
  modelo text,
  marca text,
  patrimonio text,
  numero_serie text,
  setor text,
  time text,
  localizacao text,
  created_at timestamp with time zone default now()
);

create index if not exists idx_colaboradores_cpf on public.colaboradores (cpf);
create index if not exists idx_termos_colaborador_id on public.termos_responsabilidade (colaborador_id);
create index if not exists idx_termos_zapsign_document_token on public.termos_responsabilidade (zapsign_document_token);
create index if not exists idx_termo_itens_termo_id on public.termo_itens (termo_id);
create index if not exists idx_termo_itens_item_id on public.termo_itens (item_id);

alter table public.colaboradores enable row level security;
alter table public.termos_responsabilidade enable row level security;
alter table public.termo_itens enable row level security;

drop policy if exists colaboradores_admin_supervisor_select on public.colaboradores;
drop policy if exists colaboradores_admin_supervisor_insert on public.colaboradores;
drop policy if exists colaboradores_admin_supervisor_update on public.colaboradores;
drop policy if exists colaboradores_admin_delete on public.colaboradores;

create policy colaboradores_admin_supervisor_select
on public.colaboradores
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.ativo = true
    and p.role in ('admin', 'supervisor')
  )
);

create policy colaboradores_admin_supervisor_insert
on public.colaboradores
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.ativo = true
    and p.role in ('admin', 'supervisor')
  )
);

create policy colaboradores_admin_supervisor_update
on public.colaboradores
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.ativo = true
    and p.role in ('admin', 'supervisor')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.ativo = true
    and p.role in ('admin', 'supervisor')
  )
);

create policy colaboradores_admin_delete
on public.colaboradores
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.ativo = true
    and p.role = 'admin'
  )
);

drop policy if exists termos_admin_supervisor_select on public.termos_responsabilidade;
drop policy if exists termos_admin_supervisor_insert on public.termos_responsabilidade;
drop policy if exists termos_admin_supervisor_update on public.termos_responsabilidade;
drop policy if exists termos_admin_delete on public.termos_responsabilidade;

create policy termos_admin_supervisor_select
on public.termos_responsabilidade
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.ativo = true
    and p.role in ('admin', 'supervisor')
  )
);

create policy termos_admin_supervisor_insert
on public.termos_responsabilidade
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.ativo = true
    and p.role in ('admin', 'supervisor')
  )
);

create policy termos_admin_supervisor_update
on public.termos_responsabilidade
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.ativo = true
    and p.role in ('admin', 'supervisor')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.ativo = true
    and p.role in ('admin', 'supervisor')
  )
);

create policy termos_admin_delete
on public.termos_responsabilidade
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.ativo = true
    and p.role = 'admin'
  )
);

drop policy if exists termo_itens_admin_supervisor_select on public.termo_itens;
drop policy if exists termo_itens_admin_supervisor_insert on public.termo_itens;
drop policy if exists termo_itens_admin_supervisor_update on public.termo_itens;
drop policy if exists termo_itens_admin_delete on public.termo_itens;

create policy termo_itens_admin_supervisor_select
on public.termo_itens
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.ativo = true
    and p.role in ('admin', 'supervisor')
  )
);

create policy termo_itens_admin_supervisor_insert
on public.termo_itens
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.ativo = true
    and p.role in ('admin', 'supervisor')
  )
);

create policy termo_itens_admin_supervisor_update
on public.termo_itens
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.ativo = true
    and p.role in ('admin', 'supervisor')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.ativo = true
    and p.role in ('admin', 'supervisor')
  )
);

create policy termo_itens_admin_delete
on public.termo_itens
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.ativo = true
    and p.role = 'admin'
  )
);

notify pgrst, 'reload schema';
