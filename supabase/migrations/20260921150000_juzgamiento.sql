-- Juzgamiento interno: formulario de la clase, formato A, libreta F-2 y hoja de cómputo.
-- Solo lo usa un administrador. No es público.

create table public.juzgamientos (
  id uuid primary key default gen_random_uuid(),
  evento text not null,
  fecha date,
  lugar text,
  categoria text not null,
  codigo text,
  creado_en timestamptz not null default now()
);

create table public.juzgamiento_ejemplares (
  id uuid primary key default gen_random_uuid(),
  juzgamiento_id uuid not null references public.juzgamientos (id) on delete cascade,
  numero integer not null check (numero > 0),
  registro text,
  asociacion text,
  nombre text not null,
  sexo text,
  nacimiento date,
  padre text,
  madre text,
  criador text,
  propietario text,
  montador text,
  escogido boolean not null default true,
  unique (juzgamiento_id, numero)
);

create table public.juzgamiento_jueces (
  id uuid primary key default gen_random_uuid(),
  juzgamiento_id uuid not null references public.juzgamientos (id) on delete cascade,
  puesto integer not null check (puesto between 1 and 5),
  juez_codigo integer,
  nombre text not null,
  unique (juzgamiento_id, puesto)
);

create table public.juzgamiento_votos (
  id uuid primary key default gen_random_uuid(),
  juzgamiento_id uuid not null references public.juzgamientos (id) on delete cascade,
  juez_puesto integer not null check (juez_puesto between 1 and 5),
  lugar text not null check (lugar in ('GC', 'GCR', 'MJ', '1', '2', '3', '4', '5')),
  ejemplar_numero integer not null check (ejemplar_numero > 0),
  unique (juzgamiento_id, juez_puesto, lugar)
);

create index on public.juzgamiento_ejemplares (juzgamiento_id);
create index on public.juzgamiento_jueces (juzgamiento_id);
create index on public.juzgamiento_votos (juzgamiento_id);

alter table public.juzgamientos enable row level security;
alter table public.juzgamiento_ejemplares enable row level security;
alter table public.juzgamiento_jueces enable row level security;
alter table public.juzgamiento_votos enable row level security;

create policy juzgamientos_admin on public.juzgamientos
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

create policy juzgamiento_ejemplares_admin on public.juzgamiento_ejemplares
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

create policy juzgamiento_jueces_admin on public.juzgamiento_jueces
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

create policy juzgamiento_votos_admin on public.juzgamiento_votos
  for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

grant select, insert, update, delete on
  public.juzgamientos,
  public.juzgamiento_ejemplares,
  public.juzgamiento_jueces,
  public.juzgamiento_votos
to authenticated;

revoke all on
  public.juzgamientos,
  public.juzgamiento_ejemplares,
  public.juzgamiento_jueces,
  public.juzgamiento_votos
from anon;
