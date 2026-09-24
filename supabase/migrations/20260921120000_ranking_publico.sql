-- Ranking público: agregados de puntos sin datos de contacto.
-- Las vistas corren como dueño (security_invoker = false) para poder leer
-- participaciones/caballos/programa sin abrir esas tablas al rol anon.

create or replace function public.tipo_categoria(nombre text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when nombre ilike '%funcional%' then 'Funcional'
    when nombre ilike '%bellas%formas%' then 'Bellas formas'
    when nombre ilike '%cuerda%' then 'A la cuerda'
    when lower(trim(coalesce(nombre, ''))) = 'libre' then 'Libre'
    else null
  end
$$;

revoke all on function public.tipo_categoria(text) from public, anon;
grant execute on function public.tipo_categoria(text) to authenticated, anon;

-- nombrein del Excel histórico se importó en participaciones.juez (es la clase, no el juez).
-- O-000000 es un código comodín de muchos ejemplares distintos: se agrupa por nombre.
create or replace view public.resultados_publicos
with (security_invoker = false, security_barrier = true) as
select
  extract(year from p.fecha)::integer as anio,
  p.fecha,
  coalesce(nullif(trim(p.lugar), ''), 'Sin lugar') as lugar,
  public.tipo_categoria(p.categoria_nombre) as tipo,
  nullif(trim(p.juez), '') as clase,
  coalesce(
    case
      when p.caballo_codigo ~* '^O-0+$' then null
      else nullif(trim(p.caballo_codigo), '')
    end,
    nullif(trim(p.caballo_nombre), ''),
    p.caballo_codigo
  ) as caballo_id,
  coalesce(nullif(trim(p.caballo_nombre), ''), p.caballo_codigo, 'Sin nombre') as caballo_nombre,
  nullif(trim(p.expositor), '') as expositor,
  nullif(trim(p.criador), '') as criador,
  case when p.puesto is not null and p.puesto > 0 then p.puesto end as puesto,
  coalesce(p.puntos, 0) as puntos,
  p.campeon
from public.participaciones p
where p.fecha is not null
  and coalesce(nullif(trim(p.caballo_codigo), ''), p.caballo_nombre) is not null;

create or replace view public.ranking_general
with (security_invoker = false, security_barrier = true) as
select
  anio,
  caballo_id,
  max(caballo_nombre) as caballo_nombre,
  max(expositor) as expositor,
  max(criador) as criador,
  sum(puntos)::integer as puntos,
  count(*)::integer as salidas,
  count(*) filter (where campeon)::integer as campeonatos,
  min(puesto) as mejor_puesto,
  rank() over (
    partition by anio
    order by sum(puntos) desc, count(*) filter (where campeon) desc, min(puesto) asc nulls last
  )::integer as posicion
from public.resultados_publicos
group by anio, caballo_id
having sum(puntos) > 0;

create or replace view public.ranking_categoria
with (security_invoker = false, security_barrier = true) as
select
  anio,
  tipo,
  caballo_id,
  max(caballo_nombre) as caballo_nombre,
  max(expositor) as expositor,
  max(criador) as criador,
  sum(puntos)::integer as puntos,
  count(*)::integer as salidas,
  count(*) filter (where campeon)::integer as campeonatos,
  min(puesto) as mejor_puesto,
  rank() over (
    partition by anio, tipo
    order by sum(puntos) desc, count(*) filter (where campeon) desc, min(puesto) asc nulls last
  )::integer as posicion
from public.resultados_publicos
where tipo is not null
group by anio, tipo, caballo_id
having sum(puntos) > 0;

create or replace view public.ranking_clase
with (security_invoker = false, security_barrier = true) as
select
  anio,
  tipo,
  clase,
  caballo_id,
  max(caballo_nombre) as caballo_nombre,
  max(expositor) as expositor,
  max(criador) as criador,
  sum(puntos)::integer as puntos,
  count(*)::integer as salidas,
  count(*) filter (where campeon)::integer as campeonatos,
  min(puesto) as mejor_puesto,
  rank() over (
    partition by anio, tipo, clase
    order by sum(puntos) desc, count(*) filter (where campeon) desc, min(puesto) asc nulls last
  )::integer as posicion
from public.resultados_publicos
where tipo is not null
  and clase is not null
group by anio, tipo, clase, caballo_id
having sum(puntos) > 0;

create or replace view public.ranking_competencia
with (security_invoker = false, security_barrier = true) as
select
  anio,
  fecha,
  lugar,
  caballo_id,
  max(caballo_nombre) as caballo_nombre,
  max(expositor) as expositor,
  max(criador) as criador,
  sum(puntos)::integer as puntos,
  count(*)::integer as salidas,
  count(*) filter (where campeon)::integer as campeonatos,
  min(puesto) as mejor_puesto,
  bool_or(campeon) as campeon,
  rank() over (
    partition by anio, fecha, lugar
    order by sum(puntos) desc, min(puesto) asc nulls last, count(*) filter (where campeon) desc
  )::integer as posicion
from public.resultados_publicos
group by anio, fecha, lugar, caballo_id;

create or replace view public.catalogo_anios
with (security_invoker = false, security_barrier = true) as
select
  anio,
  count(*)::integer as resultados,
  count(*) filter (where puntos > 0)::integer as con_puntos,
  sum(puntos)::integer as puntos
from public.resultados_publicos
group by anio;

create or replace view public.catalogo_categorias
with (security_invoker = false, security_barrier = true) as
select
  anio,
  tipo,
  count(distinct caballo_id)::integer as caballos,
  sum(puntos)::integer as puntos
from public.resultados_publicos
where tipo is not null
group by anio, tipo;

create or replace view public.catalogo_clases
with (security_invoker = false, security_barrier = true) as
select
  anio,
  tipo,
  clase,
  count(distinct caballo_id)::integer as caballos,
  sum(puntos)::integer as puntos
from public.resultados_publicos
where tipo is not null
  and clase is not null
group by anio, tipo, clase;

create or replace view public.catalogo_competencias
with (security_invoker = false, security_barrier = true) as
select
  r.anio,
  r.fecha,
  r.lugar,
  max(pr.nombre) as nombre,
  max(pr.circuito) as circuito,
  max(pr.competencia) as competencia,
  max(pr.ciudad) as ciudad,
  count(*)::integer as resultados,
  count(distinct r.caballo_id)::integer as caballos,
  sum(r.puntos)::integer as puntos
from public.resultados_publicos r
left join public.programa pr on pr.fecha = r.fecha
group by r.anio, r.fecha, r.lugar;

create or replace view public.calendario_publico
with (security_invoker = false, security_barrier = true) as
select
  codigo,
  fecha,
  fecha_fin,
  nombre,
  circuito,
  competencia,
  ciudad,
  extract(year from fecha)::integer as anio
from public.programa
where fecha is not null;

create or replace view public.caballo_publico
with (security_invoker = false, security_barrier = true) as
select
  codigo,
  nombre,
  sexo,
  color,
  fecha_nacimiento,
  lugar_nacimiento,
  padre,
  madre,
  expositor,
  criador,
  categoria_nombre,
  padre_codigo,
  madre_codigo,
  senas,
  adn,
  microchip,
  raza,
  fecha_registro,
  ancestros
from public.caballos;

grant select on
  public.resultados_publicos,
  public.ranking_general,
  public.ranking_categoria,
  public.ranking_clase,
  public.ranking_competencia,
  public.catalogo_anios,
  public.catalogo_categorias,
  public.catalogo_clases,
  public.catalogo_competencias,
  public.calendario_publico,
  public.caballo_publico
to anon, authenticated;
