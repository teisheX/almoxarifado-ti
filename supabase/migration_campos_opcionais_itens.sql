-- Execute este SQL no Supabase caso a tabela itens já exista.
-- Ele deixa obrigatório somente: modelo/nome, marca e patrimônio.

alter table public.itens alter column codigo_barras drop not null;
alter table public.itens alter column categoria_id drop not null;
alter table public.itens alter column localizacao_id drop not null;
alter table public.itens alter column status set default 'disponivel';
alter table public.itens alter column quantidade set default 1;
