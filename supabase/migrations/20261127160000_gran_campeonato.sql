-- Gran campeonato de la competencia en vivo.
-- Al cerrar una categoría adulta, el 1.º y el 2.º pasan al gran campeonato de su
-- modalidad y sexo. No hay pre-pista ni Formato A: la mesa abre la votación
-- (en vivo o a mano) y cada juez elige gran campeón, reservado y cuatro finalistas.
-- El de una competencia ya pasada, solo con resultados, queda para después.

alter table public.juzgamientos
  add column if not exists es_gran_campeonato boolean not null default false,
  add column if not exists gran_clave text;

comment on column public.juzgamientos.es_gran_campeonato is
  'Clase armada con el 1.º y el 2.º de los grupos adultos. No se inscribe ni se numera como las demás.';
comment on column public.juzgamientos.gran_clave is
  'Modalidad y sexo, por ejemplo paso_fino|H. Una sola por competencia.';

create unique index if not exists juzgamientos_gran_clave_unica
  on public.juzgamientos (competencia_id, gran_clave)
  where gran_clave is not null;

alter table public.juzgamiento_ejemplares
  add column if not exists origen_clase uuid references public.juzgamientos (id) on delete cascade,
  add column if not exists origen_puesto integer,
  add column if not exists origen_categoria text;

create index if not exists juzgamiento_ejemplares_origen_clase_idx
  on public.juzgamiento_ejemplares (origen_clase);

comment on column public.juzgamiento_ejemplares.origen_clase is
  'Categoría de la que salió este clasificado. Si esa categoría se reabre, sale de la lista mientras el gran campeonato no haya empezado.';

-- Modalidad de un nombre de categoría del catálogo. Trocha y galope va antes que trocha.
create or replace function public.modalidad_de_nombre(p_nombre text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when p_nombre ilike '%bellas%' then 'bellas_formas'
    when p_nombre ilike '%perform%' then 'performance'
    when p_nombre ilike '%placer%' or p_nombre ilike '%pleasure%' then 'placer'
    when p_nombre ilike '%trocha%galope%' then 'trocha_galope'
    when p_nombre ilike '%trote%' or p_nombre ilike '%tropte%' then 'trote_galope'
    when p_nombre ilike '%trocha%' then 'trocha_pura'
    when p_nombre ilike '%paso%' or p_nombre ilike '%fino%' then 'paso_fino'
    else null
  end
$$;

revoke all on function public.modalidad_de_nombre(text) from public;
grant execute on function public.modalidad_de_nombre(text) to anon, authenticated;

create or replace function public.puntos_gran_campeonato(p_puesto integer)
returns integer
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case p_puesto
    when 1 then 40
    when 2 then 30
    when 3 then 20
    when 4 then 15
    when 5 then 10
    when 6 then 5
    else 0
  end
$$;

revoke all on function public.puntos_gran_campeonato(integer) from public;
grant execute on function public.puntos_gran_campeonato(integer) to anon, authenticated;

-- Quita del gran campeonato a quien salió de esta categoría, si todavía no se vota.
create or replace function public.retirar_clasificados(p_clase uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.juzgamiento_ejemplares e
  using public.juzgamientos g
  where e.origen_clase = p_clase
    and e.juzgamiento_id = g.id
    and g.es_gran_campeonato
    and g.fase = 'inscripcion'
    and not exists (
      select 1 from public.juzgamiento_votos v where v.juzgamiento_id = g.id
    );
end;
$$;

revoke all on function public.retirar_clasificados(uuid) from public, anon, authenticated;

-- Pasa el 1.º y el 2.º de una categoría cerrada a su gran campeonato.
create or replace function public.alimentar_gran_campeonato(p_clase uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.juzgamientos;
  ev public.eventos;
  v_modalidad text;
  v_sexo text;
  v_clave text;
  v_nombre text;
  v_evento integer;
  v_comp public.competencias;
  v_gran uuid;
  v_base integer;
  r record;
begin
  select * into j from public.juzgamientos where id = p_clase;
  if j.id is null or j.competencia_id is null or j.es_gran_campeonato or j.fase <> 'cerrada' then
    return;
  end if;
  if j.evento_codigo is null then
    return;
  end if;

  select * into ev from public.eventos where codigo = j.evento_codigo;
  if ev.codigo is null then
    return;
  end if;
  if upper(coalesce(ev.campeon, '')) = 'X'
     or upper(coalesce(ev.jinete, '')) = 'X'
     or upper(coalesce(ev.tipo, '')) <> 'M' then
    return;
  end if;
  if ev.nombre ilike '%dueñ%' or ev.nombre ilike '%duen%' or ev.nombre ilike '%lote%'
     or ev.nombre ilike '%cria%' or ev.nombre ilike '%cría%'
     or ev.nombre ilike '%jinete%' or ev.nombre ilike '%amazona%' or ev.nombre ilike '%castrad%' then
    return;
  end if;

  v_modalidad := public.modalidad_de_nombre(ev.nombre);
  v_sexo := upper(coalesce(ev.sexo, ''));
  if v_modalidad is null or v_sexo not in ('H', 'M') then
    return;
  end if;
  -- 31 a 35 y 36 a 48 no van. Bellas formas y performance usan el grupo que ya tienen,
  -- aunque empiece antes de los 49 meses.
  if coalesce(ev.tiempo_hasta, 0) <= 48 then
    return;
  end if;
  if coalesce(ev.tiempo_desde, 0) < 49 and v_modalidad not in ('bellas_formas', 'performance') then
    return;
  end if;

  v_clave := v_modalidad || '|' || v_sexo;

  select e.codigo, e.nombre into v_evento, v_nombre
  from public.eventos e
  where upper(coalesce(e.campeon, '')) = 'X'
    and e.nombre ilike 'GRAN CAMPEON%'
    and e.nombre not ilike '%RESERV%'
    and upper(coalesce(e.sexo, '')) = v_sexo
    and public.modalidad_de_nombre(e.nombre) = v_modalidad
  order by e.codigo
  limit 1;

  if v_nombre is null then
    v_nombre := 'Gran campeonato '
      || case v_sexo when 'H' then 'yeguas ' else 'caballos ' end
      || case v_modalidad
           when 'paso_fino' then 'paso fino'
           when 'performance' then 'performance'
           when 'placer' then 'placer'
           when 'bellas_formas' then 'bellas formas'
           when 'trocha_pura' then 'trocha pura'
           when 'trocha_galope' then 'trocha y galope'
           when 'trote_galope' then 'trote y galope'
           else v_modalidad
         end;
  end if;

  select * into v_comp from public.competencias where id = j.competencia_id;

  select id into v_gran
  from public.juzgamientos
  where competencia_id = j.competencia_id and gran_clave = v_clave;

  if v_gran is null then
    insert into public.juzgamientos (
      competencia_id, evento_codigo, orden, evento, fecha, lugar, categoria, codigo,
      fase, con_formato_a, es_gran_campeonato, gran_clave
    ) values (
      j.competencia_id, v_evento, 10000, v_comp.nombre, v_comp.fecha, v_comp.lugar,
      v_nombre, coalesce(v_evento::text, v_clave),
      'inscripcion', false, true, v_clave
    )
    returning id into v_gran;
  end if;

  -- Ya se abrió la votación: la lista queda como estaba.
  if exists (
    select 1 from public.juzgamientos g
    where g.id = v_gran and (g.fase <> 'inscripcion' or exists (
      select 1 from public.juzgamiento_votos v where v.juzgamiento_id = g.id
    ))
  ) then
    return;
  end if;

  delete from public.juzgamiento_ejemplares
  where juzgamiento_id = v_gran and origen_clase = p_clase;

  select coalesce(max(numero), 0) into v_base
  from public.juzgamiento_ejemplares
  where juzgamiento_id = v_gran;

  for r in
    with jueces as (
      select count(*)::integer as n from public.juzgamiento_jueces where juzgamiento_id = p_clase
    ),
    sumas as (
      select v.ejemplar_numero,
        count(*)::integer as lugares,
        sum(v.lugar::integer) + 6 * ((select n from jueces) - count(*)) as total,
        count(*) filter (where v.lugar = '1') as l1,
        count(*) filter (where v.lugar = '2') as l2,
        count(*) filter (where v.lugar = '3') as l3,
        count(*) filter (where v.lugar = '4') as l4,
        count(*) filter (where v.lugar = '5') as l5
      from public.juzgamiento_votos v
      where v.juzgamiento_id = p_clase and v.lugar in ('1', '2', '3', '4', '5')
      group by v.ejemplar_numero
    ),
    ordenados as (
      select e.*,
        row_number() over (
          order by s.total, s.l1 desc, s.l2 desc, s.l3 desc, s.l4 desc, s.l5 desc, e.numero
        )::integer as puesto_final
      from public.juzgamiento_ejemplares e
      join sumas s on s.ejemplar_numero = e.numero
      cross join jueces ju
      where e.juzgamiento_id = p_clase
        and e.escogido
        and e.excusa is null
        and e.asistio is not false
        and s.lugares > 0
        and ju.n > 0
    )
    select * from ordenados where puesto_final <= 2 order by puesto_final
  loop
    if r.caballo_codigo is not null and exists (
      select 1 from public.juzgamiento_ejemplares
      where juzgamiento_id = v_gran and caballo_codigo = r.caballo_codigo
    ) then
      continue;
    end if;
    v_base := v_base + 1;
    insert into public.juzgamiento_ejemplares (
      juzgamiento_id, numero, registro, asociacion, nombre, sexo, nacimiento,
      padre, madre, criador, propietario, montador, escogido, caballo_codigo, pagado,
      origen_clase, origen_puesto, origen_categoria
    ) values (
      v_gran, v_base, r.registro, r.asociacion, r.nombre, r.sexo, r.nacimiento,
      r.padre, r.madre, r.criador, r.propietario, r.montador, false, r.caballo_codigo, coalesce(r.pagado, false),
      p_clase, r.puesto_final, j.categoria
    );
  end loop;
end;
$$;

revoke all on function public.alimentar_gran_campeonato(uuid) from public, anon, authenticated;

-- Cerrar todas las categorías no debe numerar ni pasar a pre-pista un gran campeonato.
create or replace function public.numerar_clase(p_clase uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.juzgamientos;
  base integer;
begin
  select * into j from public.juzgamientos where id = p_clase for update;
  if j.id is null or j.competencia_id is null then
    raise exception 'La categoría no existe';
  end if;
  if j.es_gran_campeonato then
    return;
  end if;
  if j.fase not in ('inscripcion', 'prepista') then
    raise exception 'La categoría % ya está en juzgamiento; sus números no cambian', j.categoria;
  end if;

  if j.fase = 'inscripcion' then
    update public.juzgamiento_ejemplares set numero = null where juzgamiento_id = j.id;
    base := 0;
  else
    select coalesce(max(numero), 0) into base from public.juzgamiento_ejemplares where juzgamiento_id = j.id;
  end if;

  with orden as (
    select e.id, base + row_number() over (order by e.nacimiento asc nulls last, e.nombre, e.id) as n
    from public.juzgamiento_ejemplares e
    where e.juzgamiento_id = j.id and e.numero is null
  )
  update public.juzgamiento_ejemplares e set numero = orden.n from orden where e.id = orden.id;

  update public.juzgamientos set fase = 'prepista' where id = j.id and fase = 'inscripcion';
  update public.competencias set estado = 'en_curso' where id = j.competencia_id and estado = 'inscripcion';
end;
$$;

revoke all on function public.numerar_clase(uuid) from public, anon, authenticated;

create or replace function public.numerar_competencia(p_competencia uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clase uuid;
begin
  if not (select public.es_admin()) then
    raise exception 'Solo un administrador puede numerar';
  end if;

  if exists (
    select 1 from public.juzgamiento_ejemplares e
    join public.juzgamientos j on j.id = e.juzgamiento_id
    where j.competencia_id = p_competencia
      and not j.es_gran_campeonato
      and e.numero is null
      and j.fase not in ('inscripcion', 'prepista')
  ) then
    raise exception 'Hay ejemplares sin número en una categoría que ya está en juzgamiento';
  end if;

  for clase in
    select j.id from public.juzgamientos j
    where j.competencia_id = p_competencia
      and not j.es_gran_campeonato
      and (j.fase = 'inscripcion'
        or (j.fase = 'prepista'
          and exists (
            select 1 from public.juzgamiento_ejemplares e
            where e.juzgamiento_id = j.id and e.numero is null
          )))
  loop
    perform public.numerar_clase(clase);
  end loop;

  update public.competencias set estado = 'en_curso' where id = p_competencia and estado = 'inscripcion';
end;
$$;

revoke all on function public.numerar_competencia(uuid) from public, anon;
grant execute on function public.numerar_competencia(uuid) to authenticated;

-- Al cerrar, entran los clasificados. Al reabrir, salen si el gran campeonato no empezó.
create or replace function public.acceso_fase(
  p_codigo text,
  p_clase uuid,
  p_fase text,
  p_manual boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.competencia_accesos := public.acceso_validar(p_codigo);
  j public.juzgamientos;
begin
  if a.rol <> 'mesa' then
    raise exception 'Solo la mesa técnica cambia la fase';
  end if;
  j := public.acceso_clase_en_pista(a, p_clase);
  if j.fase = 'inscripcion' then
    raise exception 'La inscripción no se ha cerrado';
  end if;
  if p_fase not in ('prepista', 'formato_a', 'individual', 'votacion', 'cerrada') then
    raise exception 'Fase no válida';
  end if;
  if j.es_gran_campeonato and p_fase in ('prepista', 'formato_a') then
    raise exception 'El gran campeonato no tiene pre-pista ni Formato A';
  end if;
  if p_fase = 'formato_a' and not j.con_formato_a then
    raise exception 'Esta categoría no lleva Formato A. Use «Habilitar Formato A» si se eligió mal.';
  end if;
  perform public.captura_reclamar(j.id, p_manual);
  if p_fase = 'individual' and not j.con_formato_a and j.fase = 'prepista' then
    update public.juzgamiento_ejemplares
      set escogido = (asistio is true and excusa is null)
      where juzgamiento_id = j.id;
  end if;
  if p_fase = 'cerrada' and not j.es_gran_campeonato then
    update public.juzgamientos set fase = p_fase where id = j.id;
    perform public.alimentar_gran_campeonato(j.id);
  elsif j.fase = 'cerrada' and not j.es_gran_campeonato then
    perform public.retirar_clasificados(j.id);
    update public.juzgamientos set fase = p_fase where id = j.id;
  else
    update public.juzgamientos set fase = p_fase where id = j.id;
  end if;
end;
$$;

revoke all on function public.acceso_fase(text, uuid, text, boolean) from public;
grant execute on function public.acceso_fase(text, uuid, text, boolean) to anon, authenticated;

-- La mesa saca el gran campeonato a pista. Los clasificados pasan directo al recorrido.
create or replace function public.acceso_abrir_gran_campeonato(
  p_codigo text,
  p_clase uuid,
  p_manual boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.competencia_accesos := public.acceso_validar(p_codigo);
  j public.juzgamientos;
  actual public.juzgamientos;
begin
  if a.rol <> 'mesa' then
    raise exception 'Solo la mesa técnica abre el gran campeonato';
  end if;
  j := public.acceso_clase(a, p_clase);
  if not j.es_gran_campeonato then
    raise exception 'Esta categoría no es un gran campeonato';
  end if;
  if j.fase = 'cerrada' then
    raise exception 'Este gran campeonato ya se finalizó';
  end if;
  if not exists (
    select 1 from public.juzgamiento_ejemplares where juzgamiento_id = j.id and numero is not null
  ) then
    raise exception 'Todavía no hay clasificados en este gran campeonato';
  end if;

  select x.* into actual
  from public.competencias c
  left join public.juzgamientos x on x.id = c.clase_activa
  where c.id = a.competencia_id
  for update of c;
  if actual.id is not null and actual.id <> j.id and actual.fase <> 'cerrada' then
    raise exception 'Primero finalice la categoría %', actual.categoria;
  end if;

  perform public.captura_reclamar(j.id, p_manual);
  if j.fase = 'inscripcion' then
    update public.juzgamiento_ejemplares
      set asistio = true, escogido = true
      where juzgamiento_id = j.id and numero is not null and excusa is null;
    update public.juzgamientos
      set fase = 'individual', con_formato_a = false
      where id = j.id;
  end if;
  update public.competencias set clase_activa = j.id, estado = 'en_curso'
  where id = a.competencia_id and estado <> 'finalizada';
end;
$$;

revoke all on function public.acceso_abrir_gran_campeonato(text, uuid, boolean) from public;
grant execute on function public.acceso_abrir_gran_campeonato(text, uuid, boolean) to anon, authenticated;

create or replace function public.acceso_votar(
  p_codigo text,
  p_clase uuid,
  p_lugar text,
  p_numero integer,
  p_manual boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.competencia_accesos := public.acceso_validar(p_codigo);
  j public.juzgamientos;
begin
  if a.rol <> 'juez' then
    raise exception 'Solo un juez vota';
  end if;
  j := public.acceso_clase_en_pista(a, p_clase);
  if j.fase <> 'votacion' then
    raise exception 'La votación final de esta clase no está abierta';
  end if;
  if public.juez_finalizo(j.id, a.juez_puesto, 'votacion') then
    raise exception 'Ya finalizó su votación final en esta categoría';
  end if;
  if j.es_gran_campeonato then
    if p_lugar not in ('GC', 'GCR', '1', '2', '3', '4') then
      raise exception 'Lugar no válido';
    end if;
  elsif p_lugar not in ('1', '2', '3', '4', '5') then
    raise exception 'Lugar no válido';
  end if;
  perform public.captura_reclamar(j.id, p_manual);
  if p_numero is null then
    delete from public.juzgamiento_votos
    where juzgamiento_id = j.id and juez_puesto = a.juez_puesto and lugar = p_lugar;
    return;
  end if;
  if not exists (
    select 1 from public.juzgamiento_ejemplares
    where juzgamiento_id = j.id and numero = p_numero and escogido and excusa is null and asistio is not false
  ) then
    raise exception 'El número % no está en el recorrido individual', p_numero;
  end if;
  delete from public.juzgamiento_votos
  where juzgamiento_id = j.id and juez_puesto = a.juez_puesto and ejemplar_numero = p_numero and lugar <> p_lugar;
  insert into public.juzgamiento_votos (juzgamiento_id, juez_puesto, lugar, ejemplar_numero)
  values (j.id, a.juez_puesto, p_lugar, p_numero)
  on conflict (juzgamiento_id, juez_puesto, lugar) do update set ejemplar_numero = excluded.ejemplar_numero;
end;
$$;

revoke all on function public.acceso_votar(text, uuid, text, integer, boolean) from public;
grant execute on function public.acceso_votar(text, uuid, text, integer, boolean) to anon, authenticated;

create or replace function public.acceso_finalizar_votacion(
  p_codigo text,
  p_clase uuid,
  p_manual boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.competencia_accesos := public.acceso_validar(p_codigo);
  j public.juzgamientos;
  en_final integer;
  votados integer;
begin
  if a.rol <> 'juez' then
    raise exception 'Solo un juez finaliza su votación';
  end if;
  j := public.acceso_clase_en_pista(a, p_clase);
  if j.fase = 'formato_a' then
    if not exists (
      select 1 from public.juzgamiento_formato_a where juzgamiento_id = j.id and juez_puesto = a.juez_puesto
    ) and exists (
      select 1 from public.juzgamiento_ejemplares
      where juzgamiento_id = j.id and numero is not null and asistio is not false and excusa is null
    ) then
      raise exception 'Marque al menos un ejemplar antes de finalizar';
    end if;
  elsif j.fase = 'votacion' then
    select count(*) into en_final from public.juzgamiento_ejemplares
      where juzgamiento_id = j.id and escogido and excusa is null and asistio is not false;
    if j.es_gran_campeonato then
      select count(*) into votados from public.juzgamiento_votos
        where juzgamiento_id = j.id and juez_puesto = a.juez_puesto
          and lugar in ('GC', 'GCR', '1', '2', '3', '4');
      if votados < least(6, en_final) then
        raise exception 'Faltan lugares por votar antes de finalizar';
      end if;
    else
      select count(*) into votados from public.juzgamiento_votos
        where juzgamiento_id = j.id and juez_puesto = a.juez_puesto and lugar in ('1', '2', '3', '4', '5');
      if votados < least(5, en_final) then
        raise exception 'Faltan lugares por votar antes de finalizar';
      end if;
    end if;
  else
    raise exception 'En esta fase no hay votación que finalizar';
  end if;
  perform public.captura_reclamar(j.id, p_manual);
  insert into public.juzgamiento_finalizados (juzgamiento_id, juez_puesto, fase)
  values (j.id, a.juez_puesto, j.fase) on conflict do nothing;
end;
$$;

revoke all on function public.acceso_finalizar_votacion(text, uuid, boolean) from public;
grant execute on function public.acceso_finalizar_votacion(text, uuid, boolean) to anon, authenticated;

-- El estado incluye el gran campeonato y de qué categoría vino cada clasificado.
create or replace function public.acceso_estado(p_codigo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  a public.competencia_accesos := public.acceso_validar(p_codigo);
  c public.competencias;
  es_juez boolean := a.rol = 'juez';
begin
  select * into c from public.competencias where id = a.competencia_id;
  return jsonb_build_object(
    'rol', a.rol,
    'juezPuesto', a.juez_puesto,
    'nombre', a.nombre,
    'competencia', jsonb_build_object('id', c.id, 'nombre', c.nombre, 'fecha', c.fecha, 'lugar', c.lugar, 'estado', c.estado,
      'simulacion', c.simulacion, 'etiquetaJueces', c.etiqueta_jueces),
    'claseActiva', c.clase_activa,
    'jueces', coalesce((
      select jsonb_agg(jsonb_build_object('puesto', x.juez_puesto, 'nombre', x.nombre) order by x.juez_puesto)
      from public.competencia_accesos x where x.competencia_id = c.id and x.rol = 'juez'
    ), '[]'::jsonb),
    'clases', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', j.id,
        'categoria', j.categoria,
        'orden', j.orden,
        'fase', j.fase,
        'conFormatoA', j.con_formato_a,
        'modoCaptura', j.modo_captura,
        'esGranCampeonato', j.es_gran_campeonato,
        'ejemplares', coalesce((
          select jsonb_agg(
            case when es_juez then jsonb_build_object(
              'numero', e.numero, 'asistio', e.asistio, 'escogido', e.escogido, 'excusa', e.excusa)
            else jsonb_build_object(
              'id', e.id, 'numero', e.numero, 'nombre', e.nombre, 'sexo', e.sexo, 'nacimiento', e.nacimiento,
              'propietario', e.propietario, 'montador', e.montador, 'pagado', e.pagado, 'asistio', e.asistio,
              'escogido', e.escogido, 'excusa', e.excusa, 'excusaFase', e.excusa_fase,
              'registro', coalesce(e.registro, e.caballo_codigo),
              'asociacion', coalesce(cab.asociacion_abrev, e.asociacion),
              'padre', coalesce(e.padre, cab.padre), 'madre', coalesce(e.madre, cab.madre),
              'abueloMaterno', cab.ancestros -> 'compabuelo' ->> 'nombre',
              'criador', coalesce(e.criador, cab.criador),
              'adn', cab.adn, 'microchip', cab.microchip,
              'origen', e.origen_categoria, 'origenPuesto', e.origen_puesto)
            end
            order by e.numero nulls last, e.nombre)
          from public.juzgamiento_ejemplares e
          left join public.caballos cab on cab.codigo = e.caballo_codigo and not es_juez
          where e.juzgamiento_id = j.id and (not es_juez or e.numero is not null)
        ), '[]'::jsonb),
        'formatoA', coalesce((
          select jsonb_agg(jsonb_build_object('juezPuesto', f.juez_puesto, 'numero', f.ejemplar_numero))
          from public.juzgamiento_formato_a f
          where f.juzgamiento_id = j.id and a.rol <> 'prepista' and (not es_juez or f.juez_puesto = a.juez_puesto)
        ), '[]'::jsonb),
        'votos', coalesce((
          select jsonb_agg(jsonb_build_object('juezPuesto', v.juez_puesto, 'lugar', v.lugar, 'numero', v.ejemplar_numero))
          from public.juzgamiento_votos v
          where v.juzgamiento_id = j.id and a.rol <> 'prepista' and (not es_juez or v.juez_puesto = a.juez_puesto)
        ), '[]'::jsonb),
        'excusasVotos', coalesce((
          select jsonb_agg(jsonb_build_object('juezPuesto', x.juez_puesto, 'numero', x.ejemplar_numero, 'motivo', x.motivo))
          from public.juzgamiento_excusas_votos x
          where x.juzgamiento_id = j.id and a.rol <> 'prepista' and (not es_juez or x.juez_puesto = a.juez_puesto)
        ), '[]'::jsonb),
        'finalizados', coalesce((
          select jsonb_agg(jsonb_build_object('juezPuesto', f.juez_puesto, 'fase', f.fase))
          from public.juzgamiento_finalizados f
          where f.juzgamiento_id = j.id and a.rol <> 'prepista' and (not es_juez or f.juez_puesto = a.juez_puesto)
        ), '[]'::jsonb)
      ) order by j.orden nulls last, j.categoria)
      from public.juzgamientos j
      where j.competencia_id = c.id
        and exists (select 1 from public.juzgamiento_ejemplares e where e.juzgamiento_id = j.id)
    ), '[]'::jsonb)
  );
end;
$$;

-- La hoja de cómputo distingue el gran campeonato: sus lugares valen 1 a 6 y quien no fue votado cuenta 7.
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
  rangos as (
    select v.juzgamiento_id, v.ejemplar_numero,
      case
        when j.es_gran_campeonato and v.lugar = 'GC' then 1
        when j.es_gran_campeonato and v.lugar = 'GCR' then 2
        when j.es_gran_campeonato and v.lugar = '1' then 3
        when j.es_gran_campeonato and v.lugar = '2' then 4
        when j.es_gran_campeonato and v.lugar = '3' then 5
        when j.es_gran_campeonato and v.lugar = '4' then 6
        when not j.es_gran_campeonato and v.lugar in ('1', '2', '3', '4', '5') then v.lugar::integer
      end as rango
    from public.juzgamiento_votos v
    join public.juzgamientos j on j.id = v.juzgamiento_id
    where j.competencia_id = p_competencia
  ),
  sumas as (
    select juzgamiento_id, ejemplar_numero,
      count(*) filter (where rango is not null) as lugares,
      sum(rango) filter (where rango is not null) as total,
      count(*) filter (where rango = 1) as l1,
      count(*) filter (where rango = 2) as l2,
      count(*) filter (where rango = 3) as l3,
      count(*) filter (where rango = 4) as l4,
      count(*) filter (where rango = 5) as l5,
      count(*) filter (where rango = 6) as l6
    from rangos
    group by juzgamiento_id, ejemplar_numero
  ),
  base as (
    select j.id as clase_id, j.categoria, j.evento_codigo, j.fase, j.orden, j.es_gran_campeonato,
      e.id as ejemplar_id, e.numero, e.caballo_codigo, e.nombre, e.propietario, e.criador, e.montador,
      e.asistio, e.escogido, e.excusa,
      s.l1, s.l2, s.l3, s.l4, s.l5, s.l6,
      (s.total + (case when j.es_gran_campeonato then 7 else 6 end) * (coalesce(ju.n, 0) - s.lugares)) as total_final,
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
          order by b.total_final, b.l1 desc, b.l2 desc, b.l3 desc, b.l4 desc, b.l5 desc, b.l6 desc, b.numero
        )::integer
      end as puesto
    from base b
  )
  select clase_id, categoria, evento_codigo, fase, ejemplar_id, numero, caballo_codigo, nombre,
    propietario, criador, montador, asistio, escogido, excusa,
    case when completo then total_final::integer end,
    puesto,
    case when es_gran_campeonato then public.puntos_gran_campeonato(puesto) else public.puntos_por_puesto(puesto) end
  from ordenados
  order by orden nulls last, categoria, puesto nulls last, numero nulls last;
$$;

revoke all on function public.resultados_competencia(uuid) from public, anon;
grant execute on function public.resultados_competencia(uuid) to authenticated;

-- Un gran campeonato que nadie abrió no traba la sincronización. El ganador queda como campeón.
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
  from public.juzgamientos
  where competencia_id = p_competencia
    and fase <> 'cerrada'
    and not (es_gran_campeonato and fase = 'inscripcion');
  if abiertas is not null then
    raise exception 'Faltan categorías por cerrar: %', abiertas;
  end if;

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
    e.asociacion, r.numero, r.puesto, r.puntos, r.puntos, r.puntos, r.puntos,
    exists (
      select 1 from public.juzgamientos g
      where g.id = r.clase_id and g.es_gran_campeonato and r.puesto = 1
    )
  from public.resultados_competencia(p_competencia) r
  join public.juzgamiento_ejemplares e on e.id = r.ejemplar_id
  where r.asistio is not false
    and not exists (
      select 1 from public.juzgamientos g
      where g.id = r.clase_id and g.es_gran_campeonato and g.fase <> 'cerrada'
    );
  get diagnostics filas = row_count;

  update public.competencias
  set sincronizado_en = now(), sincronizado_por = auth.uid(), estado = 'finalizada'
  where id = p_competencia;
  return filas;
end;
$$;

revoke all on function public.sincronizar_competencia(uuid) from public, anon;
grant execute on function public.sincronizar_competencia(uuid) to authenticated;

notify pgrst, 'reload schema';
