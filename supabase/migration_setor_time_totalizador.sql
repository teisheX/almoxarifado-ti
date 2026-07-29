-- Execute este arquivo no SQL Editor do Supabase se o banco já existe.
-- Ele adiciona os campos Setor e Time na tabela de itens.

alter table public.itens add column if not exists setor text;
alter table public.itens add column if not exists time text;

-- Opcional: índices simples para melhorar busca/filtros futuros por setor/time.
create index if not exists idx_itens_setor on public.itens (setor);
create index if not exists idx_itens_time on public.itens (time);
