-- Hoja de cómputo de la votación final según el reglamento 2019 (decidido el 21-nov-2026):
-- si un juez no puso al ejemplar entre sus lugares, cuenta como 6. Entran en el orden todos los de la
-- final con al menos un voto; gana la suma más baja; empate: más primeros, más segundos… y el número.
-- Debe coincidir con hojaDeComputo en src/lib/computo.ts.

-- Resultado de cada ejemplar, igual que la hoja de cómputo: suma de los lugares de cada juez,
-- gana la suma más baja; si empatan, más primeros, luego más segundos… y por último el número.
-- Reglamento 2019: donde un juez no lo votó cuenta como 6. Tiene puesto todo ejemplar en la final
-- con al menos un voto, así siempre salen los lugares del 1 al 5.
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
      s.l1, s.l2, s.l3, s.l4, s.l5,
      (s.total + 6 * (coalesce(ju.n, 0) - s.lugares)) as total_final,
      (e.escogido and e.excusa is null and e.asistio is not false
        and s.lugares is not null and s.lugares > 0 and ju.n > 0) as completo
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
          order by b.total_final, b.l1 desc, b.l2 desc, b.l3 desc, b.l4 desc, b.l5 desc, b.numero
        )::integer
      end as puesto
    from base b
  )
  select clase_id, categoria, evento_codigo, fase, ejemplar_id, numero, caballo_codigo, nombre,
    propietario, criador, montador, asistio, escogido, excusa,
    case when completo then total_final::integer end, puesto, public.puntos_por_puesto(puesto)
  from ordenados
  order by orden nulls last, categoria, puesto nulls last, numero nulls last;
$$;

revoke execute on function public.resultados_competencia(uuid) from public, anon;
grant execute on function public.resultados_competencia(uuid) to authenticated;
