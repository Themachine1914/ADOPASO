-- Cerrar la inscripción categoría por categoría y dejar que la pre-pista asigne los números.
--
-- * numerar_clase (interna): numera una categoría. Si está en inscripción, numera a todos por edad
--   (el más adulto lleva el 1) y la pasa a pre-pista. Si ya está en pre-pista, conserva los números
--   y a los que llegaron tarde les da los siguientes libres, también por edad.
-- * numerar_categoria (admin): cierra una sola categoría. La mesa técnica la ve enseguida.
-- * numerar_competencia (admin): cierra todas las abiertas, pero ya no renumera las que estaban en
--   pre-pista, para no borrar los números que haya puesto la pre-pista.
-- * acceso_asignar_numeros (pre-pista o mesa): con la categoría cerrada y sin juzgar (fase pre-pista),
--   esté o no en pista, recibe los números disponibles y los reparte por edad: el número menor al más adulto.

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

revoke execute on function public.numerar_clase(uuid) from public, anon, authenticated;

create or replace function public.numerar_categoria(p_clase uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  estado_comp text;
begin
  if not (select public.es_admin()) then
    raise exception 'Solo un administrador puede numerar';
  end if;
  select c.estado into estado_comp
  from public.juzgamientos j join public.competencias c on c.id = j.competencia_id
  where j.id = p_clase;
  if estado_comp = 'finalizada' then
    raise exception 'La competencia ya se finalizó';
  end if;
  perform public.numerar_clase(p_clase);
end;
$$;

revoke execute on function public.numerar_categoria(uuid) from public, anon;
grant execute on function public.numerar_categoria(uuid) to authenticated;

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
    select 1 from public.juzgamiento_ejemplares e join public.juzgamientos j on j.id = e.juzgamiento_id
    where j.competencia_id = p_competencia and e.numero is null and j.fase not in ('inscripcion', 'prepista')
  ) then
    raise exception 'Hay ejemplares sin número en una categoría que ya está en juzgamiento';
  end if;

  -- Las abiertas, y las de pre-pista con algún caballo sin número (inscrito tarde).
  for clase in
    select j.id from public.juzgamientos j
    where j.competencia_id = p_competencia
      and (j.fase = 'inscripcion'
        or (j.fase = 'prepista'
          and exists (select 1 from public.juzgamiento_ejemplares e where e.juzgamiento_id = j.id and e.numero is null)))
  loop
    perform public.numerar_clase(clase);
  end loop;

  update public.competencias set estado = 'en_curso' where id = p_competencia and estado = 'inscripcion';
end;
$$;

create or replace function public.acceso_asignar_numeros(p_codigo text, p_clase uuid, p_numeros integer[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.competencia_accesos := public.acceso_validar(p_codigo);
  j public.juzgamientos;
  cuantos integer;
  numeros integer[];
begin
  if a.rol not in ('prepista', 'mesa') then
    raise exception 'Solo la pre-pista o la mesa técnica asignan números';
  end if;
  -- No hace falta que esté en pista: la pre-pista prepara la siguiente mientras se juzga otra.
  j := public.acceso_clase(a, p_clase);
  perform 1 from public.juzgamientos where id = j.id for update;
  select * into j from public.juzgamientos where id = j.id;
  if j.fase <> 'prepista' then
    raise exception 'Los números solo se asignan en la pre-pista';
  end if;
  if exists (select 1 from public.juzgamiento_formato_a where juzgamiento_id = j.id)
    or exists (select 1 from public.juzgamiento_votos where juzgamiento_id = j.id)
    or exists (select 1 from public.juzgamiento_excusas_votos where juzgamiento_id = j.id) then
    raise exception 'Los jueces ya marcaron números en esta categoría; no se pueden cambiar';
  end if;

  select array_agg(n order by n) into numeros from unnest(p_numeros) as n;
  select count(*) into cuantos from public.juzgamiento_ejemplares where juzgamiento_id = j.id;
  if coalesce(array_length(numeros, 1), 0) <> cuantos then
    raise exception 'Hacen falta % números, uno para cada ejemplar; llegaron %', cuantos, coalesce(array_length(numeros, 1), 0);
  end if;
  if exists (select 1 from unnest(numeros) as n where n is null or n <= 0) then
    raise exception 'Los números tienen que ser mayores que cero';
  end if;
  if (select count(distinct n) from unnest(numeros) as n) <> cuantos then
    raise exception 'Hay números repetidos';
  end if;

  -- Primero se vacían: (juzgamiento_id, numero) es único y los números nuevos pueden cruzarse con los viejos.
  update public.juzgamiento_ejemplares set numero = null where juzgamiento_id = j.id;
  with orden as (
    select e.id, row_number() over (order by e.nacimiento asc nulls last, e.nombre, e.id) as i
    from public.juzgamiento_ejemplares e
    where e.juzgamiento_id = j.id
  )
  update public.juzgamiento_ejemplares e set numero = numeros[orden.i] from orden where e.id = orden.id;
end;
$$;

revoke execute on function public.acceso_asignar_numeros(text, uuid, integer[]) from public;
grant execute on function public.acceso_asignar_numeros(text, uuid, integer[]) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Formato A opcional por categoría. La mesa técnica lo decide al sacarla a pista y lo puede
-- corregir mientras no haya marcas de Formato A ni votos. Sin Formato A, al abrir el recorrido
-- individual pasan todos los presentes que no estén excusados.
-- ---------------------------------------------------------------------------
alter table public.juzgamientos add column if not exists con_formato_a boolean not null default true;

create or replace function public.acceso_lleva_formato_a(p_codigo text, p_clase uuid, p_lleva boolean)
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
    raise exception 'Solo la mesa técnica decide si lleva Formato A';
  end if;
  j := public.acceso_clase_en_pista(a, p_clase);
  select * into j from public.juzgamientos where id = j.id for update;
  if p_lleva is null or j.con_formato_a = p_lleva then
    return;
  end if;
  if exists (select 1 from public.juzgamiento_votos where juzgamiento_id = j.id) or j.fase in ('votacion', 'cerrada') then
    raise exception 'La votación final ya empezó; no se puede cambiar el Formato A';
  end if;
  if not p_lleva and exists (select 1 from public.juzgamiento_formato_a where juzgamiento_id = j.id) then
    raise exception 'Los jueces ya marcaron en el Formato A; no se puede quitar';
  end if;

  update public.juzgamientos set con_formato_a = p_lleva where id = j.id;
  if p_lleva and j.fase = 'individual' then
    -- Se habilita tarde: vuelve al Formato A y los jueces escogen de nuevo.
    update public.juzgamiento_ejemplares set escogido = false where juzgamiento_id = j.id;
    delete from public.juzgamiento_finalizados where juzgamiento_id = j.id;
    update public.juzgamientos set fase = 'formato_a' where id = j.id;
  elsif not p_lleva and j.fase = 'formato_a' then
    delete from public.juzgamiento_finalizados where juzgamiento_id = j.id;
    update public.juzgamientos set fase = 'prepista' where id = j.id;
  end if;
end;
$$;

revoke execute on function public.acceso_lleva_formato_a(text, uuid, boolean) from public;
grant execute on function public.acceso_lleva_formato_a(text, uuid, boolean) to anon, authenticated;

-- Mesa técnica: abre la fase siguiente de la categoría en pista.
create or replace function public.acceso_fase(p_codigo text, p_clase uuid, p_fase text)
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
  if p_fase = 'formato_a' and not j.con_formato_a then
    raise exception 'Esta categoría no lleva Formato A. Use «Habilitar Formato A» si se eligió mal.';
  end if;
  if p_fase = 'individual' and not j.con_formato_a and j.fase = 'prepista' then
    -- Sin Formato A pasan todos los presentes que no estén excusados.
    update public.juzgamiento_ejemplares
      set escogido = (asistio is true and excusa is null)
      where juzgamiento_id = j.id;
  end if;
  update public.juzgamientos set fase = p_fase where id = j.id;
end;
$$;

-- Estado: agrega conFormatoA a cada categoría.
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
      'simulacion', c.simulacion),
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
        'ejemplares', coalesce((
          select jsonb_agg(
            case when es_juez then jsonb_build_object(
              'numero', e.numero, 'asistio', e.asistio, 'escogido', e.escogido, 'excusa', e.excusa)
            else jsonb_build_object(
              'id', e.id, 'numero', e.numero, 'nombre', e.nombre, 'sexo', e.sexo, 'nacimiento', e.nacimiento,
              'propietario', e.propietario, 'montador', e.montador, 'pagado', e.pagado, 'asistio', e.asistio,
              'escogido', e.escogido, 'excusa', e.excusa, 'excusaFase', e.excusa_fase)
            end
            order by e.numero nulls last, e.nombre)
          from public.juzgamiento_ejemplares e
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

-- ---------------------------------------------------------------------------

