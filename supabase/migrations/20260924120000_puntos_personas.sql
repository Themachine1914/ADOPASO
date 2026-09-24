-- Puntuación de personas: montadores, jinetes/amazonas, criadores y propietarios.
-- Los códigos de persona del Excel no son confiables (el 0 lo usan cientos de montadores
-- distintos y un mismo código aparece con varios nombres), así que se agrupa por nombre.
-- Las clases de jinetes y amazonas se reconocen por el nombre de la clase (participaciones.juez).

create or replace function public.clase_jinete(nombre text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when coalesce(nombre, '') ~* '^\s*(jinete|amazona)' then
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(upper(trim(regexp_replace(nombre, '\s+', ' ', 'g'))),
              '^JINETES ', 'JINETE '),
            'AFICONA?D', 'AFICIONAD', 'g'),
          'JUVENILES', 'JUVENIL'),
        '(JUVENIL|AFICIONADAS) (\d)', '\1 DE \2')
  end
$$;

revoke all on function public.clase_jinete(text) from public, anon;
grant execute on function public.clase_jinete(text) to authenticated, anon;

create or replace view public.puntos_personas
with (security_invoker = false, security_barrier = true) as
with base as (
  select
    extract(year from p.fecha)::integer as anio,
    p.fecha,
    coalesce(nullif(trim(p.lugar), ''), 'Sin lugar') as lugar,
    public.clase_jinete(p.juez) as clase_jinete,
    case when p.puesto is not null and p.puesto > 0 then p.puesto end as puesto,
    coalesce(p.campeon, false) as campeon,
    coalesce(nullif(trim(p.caballo_codigo), ''), nullif(trim(p.caballo_nombre), '')) as caballo,
    p.montador,
    p.criador,
    p.expositor,
    p.puntos,
    p.puntos_montador,
    p.puntos_criador,
    p.puntos_propietario
  from public.participaciones p
  where p.fecha is not null
),
filas as (
  select anio, fecha, lugar, 'montador'::text as rol, ''::text as categoria, montador as persona,
         coalesce(puntos_montador, 0) as puntos, puesto, campeon, caballo
  from base where clase_jinete is null
  union all
  select anio, fecha, lugar, 'jinete', clase_jinete, montador,
         coalesce(puntos_montador, puntos, 0), puesto, campeon, caballo
  from base where clase_jinete is not null
  union all
  select anio, fecha, lugar, 'criador', '', criador,
         coalesce(puntos_criador, 0), puesto, campeon, caballo
  from base where clase_jinete is null
  union all
  select anio, fecha, lugar, 'propietario', '', expositor,
         coalesce(puntos_propietario, 0), puesto, campeon, caballo
  from base where clase_jinete is null
)
select
  anio,
  fecha,
  lugar,
  rol,
  categoria,
  upper(regexp_replace(trim(persona), '\s+', ' ', 'g')) as persona,
  puntos,
  puesto,
  campeon,
  caballo
from filas
where nullif(trim(persona), '') is not null
  and upper(trim(persona)) not in ('NO EXISTE', 'ES INTRUSO');

-- Ranking anual por rol (y por clase en jinetes/amazonas).
create or replace view public.ranking_personas
with (security_invoker = false, security_barrier = true) as
select
  anio,
  rol,
  categoria,
  persona,
  sum(puntos)::integer as puntos,
  count(*)::integer as salidas,
  count(distinct caballo)::integer as caballos,
  count(*) filter (where puesto = 1)::integer as primeros,
  count(*) filter (where campeon)::integer as campeonatos,
  count(distinct fecha)::integer as competencias,
  rank() over (
    partition by anio, rol, categoria
    order by sum(puntos) desc, count(*) filter (where puesto = 1) desc
  )::integer as posicion
from public.puntos_personas
group by anio, rol, categoria, persona
having sum(puntos) > 0;

-- Ranking por competencia (fecha + lugar).
create or replace view public.ranking_personas_competencia
with (security_invoker = false, security_barrier = true) as
select
  anio,
  fecha,
  lugar,
  rol,
  categoria,
  persona,
  sum(puntos)::integer as puntos,
  count(*)::integer as salidas,
  count(distinct caballo)::integer as caballos,
  count(*) filter (where puesto = 1)::integer as primeros,
  count(*) filter (where campeon)::integer as campeonatos,
  1::integer as competencias,
  rank() over (
    partition by anio, fecha, lugar, rol, categoria
    order by sum(puntos) desc, count(*) filter (where puesto = 1) desc
  )::integer as posicion
from public.puntos_personas
group by anio, fecha, lugar, rol, categoria, persona
having sum(puntos) > 0;

-- Clases de jinetes/amazonas con puntos en el año (para el selector).
create or replace view public.catalogo_clases_jinetes
with (security_invoker = false, security_barrier = true) as
select
  anio,
  categoria as clase,
  count(distinct persona)::integer as personas,
  sum(puntos)::integer as puntos
from public.puntos_personas
where rol = 'jinete'
group by anio, categoria;

-- Detalle de una persona: sus puntos competencia por competencia.
create or replace view public.historial_personas
with (security_invoker = false, security_barrier = true) as
select
  anio,
  fecha,
  lugar,
  rol,
  categoria,
  persona,
  sum(puntos)::integer as puntos,
  count(*)::integer as salidas,
  count(*) filter (where puesto = 1)::integer as primeros,
  count(*) filter (where campeon)::integer as campeonatos
from public.puntos_personas
group by anio, fecha, lugar, rol, categoria, persona;

revoke all on public.puntos_personas from anon, authenticated;

grant select on
  public.ranking_personas,
  public.ranking_personas_competencia,
  public.catalogo_clases_jinetes,
  public.historial_personas
to anon, authenticated;
