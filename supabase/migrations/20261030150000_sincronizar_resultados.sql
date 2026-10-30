-- Sincronizar resultados: la administración revisa la competencia cerrada y pasa sus resultados a
-- participaciones (Resultados y ranking) con la regla del histórico: 1.º 10, 2.º 7, 3.º 5 puntos,
-- iguales para el caballo, el propietario, el criador y el montador.

alter table public.competencias
  add column sincronizado_en timestamptz,
  add column sincronizado_por uuid;

-- Las filas sincronizadas guardan su competencia (para deshacer) y un número negativo: el Excel usa
-- su número de fila como id, así que nunca chocan.
alter table public.participaciones
  add column competencia_id uuid references public.competencias (id);

create index on public.participaciones (competencia_id) where competencia_id is not null;

create sequence public.participaciones_en_vivo_id
  as bigint increment by -1 minvalue -9223372036854775807 maxvalue -1 start with -1;

revoke all on sequence public.participaciones_en_vivo_id from public, anon;
grant usage on sequence public.participaciones_en_vivo_id to authenticated;

create or replace function public.puntos_por_puesto(p_puesto integer)
returns integer
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case p_puesto when 1 then 10 when 2 then 7 when 3 then 5 else 0 end
$$;

-- Resultado de cada ejemplar, igual que la hoja de cómputo: suma de los lugares de cada juez,
-- gana la suma más baja; si empatan, más primeros, luego más segundos… y por último el número.
-- Solo tiene puesto quien recibió lugar de todos los jueces de la clase.
create or replace function public.resultados_competencia(p_competencia uuid)
returns table (
  clase_id uuid,
  categoria text,
  evento_codigo integer,
  fase text,
  ejemplar_id uuid,
  numero integer,
  caballo_codigo text,
  caballo_nombre text,
  propietario text,
  criador text,
  montador text,
  asistio boolean,
  escogido boolean,
  excusa text,
  total integer,
  puesto integer,
  puntos integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with jueces as (
    select juzgamiento_id, count(*) as n from public.juzgamiento_jueces group by juzgamiento_id
  ),
  sumas as (
    select v.juzgamiento_id, v.ejemplar_numero,
      count(*) as lugares,
      sum(v.lugar::integer) as total,
      count(*) filter (where v.lugar = '1') as l1,
      count(*) filter (where v.lugar = '2') as l2,
      count(*) filter (where v.lugar = '3') as l3,
      count(*) filter (where v.lugar = '4') as l4,
      count(*) filter (where v.lugar = '5') as l5
    from public.juzgamiento_votos v
    where v.lugar in ('1', '2', '3', '4', '5')
    group by v.juzgamiento_id, v.ejemplar_numero
  ),
  base as (
    select j.id as clase_id, j.categoria, j.evento_codigo, j.fase, j.orden,
      e.id as ejemplar_id, e.numero, e.caballo_codigo, e.nombre, e.propietario, e.criador, e.montador,
      e.asistio, e.escogido, e.excusa,
      s.total, s.l1, s.l2, s.l3, s.l4, s.l5,
      (e.escogido and e.excusa is null and e.asistio is not false
        and s.lugares is not null and s.lugares = coalesce(ju.n, 0) and ju.n > 0) as completo
    from public.juzgamientos j
    join public.juzgamiento_ejemplares e on e.juzgamiento_id = j.id
    left join jueces ju on ju.juzgamiento_id = j.id
    left join sumas s on s.juzgamiento_id = j.id and s.ejemplar_numero = e.numero
    where j.competencia_id = p_competencia
  ),
  ordenados as (
    select b.*,
      case when b.completo then
        row_number() over (
          partition by b.clase_id, b.completo
          order by b.total, b.l1 desc, b.l2 desc, b.l3 desc, b.l4 desc, b.l5 desc, b.numero
        )::integer
      end as puesto
    from base b
  )
  select clase_id, categoria, evento_codigo, fase, ejemplar_id, numero, caballo_codigo, nombre,
    propietario, criador, montador, asistio, escogido, excusa,
    case when completo then total::integer end, puesto, public.puntos_por_puesto(puesto)
  from ordenados
  order by orden nulls last, categoria, puesto nulls last, numero nulls last;
$$;

revoke execute on function public.resultados_competencia(uuid) from public, anon;
grant execute on function public.resultados_competencia(uuid) to authenticated;

-- Pasa los resultados a participaciones. Solo un administrador, solo competencias oficiales con
-- todas sus categorías cerradas, y una sola vez (para repetir, primero se deshace).
create or replace function public.sincronizar_competencia(p_competencia uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c public.competencias;
  abiertas text;
  filas integer;
begin
  if not (select public.es_admin()) then
    raise exception 'Solo un administrador puede sincronizar';
  end if;
  select * into c from public.competencias where id = p_competencia for update;
  if c.id is null then
    raise exception 'La competencia no existe';
  end if;
  if c.simulacion then
    raise exception 'Una simulación no se puede sincronizar';
  end if;
  if c.sincronizado_en is not null then
    raise exception 'Esta competencia ya se sincronizó';
  end if;
  select string_agg(categoria, ', ' order by categoria) into abiertas
  from public.juzgamientos where competencia_id = p_competencia and fase <> 'cerrada';
  if abiertas is not null then
    raise exception 'Faltan categorías por cerrar: %', abiertas;
  end if;

  -- Como en el Excel histórico: la clase va en «juez» y el tipo de evento en «categoria_nombre».
  insert into public.participaciones (
    id, competencia_id, fecha, caballo_codigo, caballo_nombre, registro_tipo, sexo, fecha_nacimiento,
    padre, madre, expositor, criador, montador, juez, evento_codigo, lugar,
    categoria_nombre, asociacion, numero_competidor, puesto, puntos, puntos_propietario,
    puntos_criador, puntos_montador, campeon
  )
  select
    nextval('public.participaciones_en_vivo_id'), c.id, c.fecha, r.caballo_codigo, r.caballo_nombre,
    nullif(split_part(r.caballo_codigo, '-', 1), ''), e.sexo, e.nacimiento, e.padre, e.madre,
    r.propietario, r.criador, r.montador, r.categoria, r.evento_codigo, c.lugar,
    case when r.categoria ilike '%bellas%formas%' then 'BELLAS FORMAS' else 'FUNCIONAL ( MONTADOR )' end,
    e.asociacion, r.numero, r.puesto, r.puntos, r.puntos, r.puntos, r.puntos, false
  from public.resultados_competencia(p_competencia) r
  join public.juzgamiento_ejemplares e on e.id = r.ejemplar_id
  where r.asistio is not false;
  get diagnostics filas = row_count;

  update public.competencias
  set sincronizado_en = now(), sincronizado_por = auth.uid(), estado = 'finalizada'
  where id = p_competencia;
  return filas;
end;
$$;

-- Quita del ranking lo que se sincronizó, para corregir y volver a sincronizar.
create or replace function public.deshacer_sincronizacion(p_competencia uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  filas integer;
begin
  if not (select public.es_admin()) then
    raise exception 'Solo un administrador puede deshacer la sincronización';
  end if;
  delete from public.participaciones where competencia_id = p_competencia;
  get diagnostics filas = row_count;
  update public.competencias
  set sincronizado_en = null, sincronizado_por = null, estado = 'en_curso'
  where id = p_competencia;
  return filas;
end;
$$;

revoke execute on function public.sincronizar_competencia(uuid), public.deshacer_sincronizacion(uuid) from public, anon;
grant execute on function public.sincronizar_competencia(uuid), public.deshacer_sincronizacion(uuid) to authenticated;
