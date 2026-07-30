alter table public.itens add column if not exists numero_serie text;
create index if not exists idx_itens_numero_serie on public.itens (numero_serie);
