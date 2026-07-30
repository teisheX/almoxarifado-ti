-- Migração para adicionar o perfil LEITOR por localização.
-- Rode este arquivo no Supabase > SQL Editor se o banco já existir.

-- 1) Adiciona localização vinculada ao usuário.
alter table public.profiles add column if not exists localizacao_id uuid references public.localizacoes(id);

-- 2) Atualiza o CHECK da coluna role para aceitar admin, supervisor e leitor.
do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%role%';

  if constraint_name is not null then
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'supervisor', 'leitor'));

-- 3) Funções auxiliares.
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

create or replace function public.is_leitor_active()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'leitor' and ativo = true
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
      and (role = 'admin' or (role = 'supervisor' and supervisor_pode_exportar = true))
  );
$$;

-- 4) Recria políticas de itens com regra do leitor por localização.
drop policy if exists itens_select_admin_supervisor on public.itens;
drop policy if exists itens_insert_admin_supervisor on public.itens;
drop policy if exists itens_update_admin_only on public.itens;
drop policy if exists itens_delete_admin_only on public.itens;

create policy itens_select_admin_supervisor
on public.itens
for select
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or public.is_supervisor_active()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.ativo = true
        and p.role = 'leitor'
        and p.localizacao_id is not null
        and p.localizacao_id = itens.localizacao_id
    )
  )
);

create policy itens_insert_admin_supervisor
on public.itens
for insert
to authenticated
with check (
  (public.is_admin() or public.is_supervisor_active())
  and criado_por = auth.uid()
);

create policy itens_update_admin_only
on public.itens
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy itens_delete_admin_only
on public.itens
for delete
to authenticated
using (public.is_admin());

-- 5) Leitor não exporta. Admin exporta tudo. Supervisor só exporta se liberado.
drop policy if exists export_logs_insert_allowed on public.export_logs;

create policy export_logs_insert_allowed
on public.export_logs
for insert
to authenticated
with check (usuario_id = auth.uid() and public.can_export());

create index if not exists idx_profiles_localizacao_id on public.profiles(localizacao_id);
