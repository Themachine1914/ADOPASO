-- Cada categoría se juzga por un solo camino. La primera anotación de verdad
-- (sacar a pista, asistencia, números, formato A, excusa, voto, fase) deja
-- modo_captura en 'manual' o 'en_vivo'. No vuelve a cambiar, ni al cerrar.
-- Numerar no lo fija: «Cerrar y numerar» sirve para los dos caminos.
-- p_manual llega en false desde los teléfonos y en true desde la captura manual.
-- El valor por defecto deja igual a quien no lo envía.

alter table public.juzgamientos
  add column if not exists modo_captura text,
  add column if not exists captura_iniciada_en timestamptz;

alter table public.juzgamientos
  drop constraint if exists juzgamientos_modo_captura_check;

alter table public.juzgamientos
  add constraint juzgamientos_modo_captura_check
  check (modo_captura is null or modo_captura in ('manual', 'en_vivo'));

comment on column public.juzgamientos.modo_captura is
  'manual: una persona captura toda la categoría. en_vivo: pre-pista, jueces y mesa. Nulo hasta la primera anotación.';

comment on column public.juzgamientos.captura_iniciada_en is
  'Cuándo quedó fijado modo_captura.';

-- Lo que ya se estaba juzgando queda en vivo, para que la captura manual no lo pise.
update public.juzgamientos j
set modo_captura = 'en_vivo',
    captura_iniciada_en = coalesce(j.captura_iniciada_en, now())
where j.modo_captura is null
  and (
    j.fase in ('formato_a', 'individual', 'votacion', 'cerrada')
    or exists (select 1 from public.juzgamiento_formato_a f where f.juzgamiento_id = j.id)
    or exists (select 1 from public.juzgamiento_votos v where v.juzgamiento_id = j.id)
    or exists (select 1 from public.juzgamiento_excusas_votos x where x.juzgamiento_id = j.id)
    or exists (
      select 1 from public.juzgamiento_ejemplares e
      where e.juzgamiento_id = j.id and e.asistio is not null
    )
  );

-- Bloquea la fila y fija el modo, o rechaza el camino contrario.
create or replace function public.captura_reclamar(p_clase uuid, p_manual boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actual text;
begin
  select modo_captura into actual
  from public.juzgamientos
  where id = p_clase
  for update;

  if not found then
    raise exception 'La categoría no existe';
  end if;

  if actual is null then
    update public.juzgamientos
      set modo_captura = case when coalesce(p_manual, false) then 'manual' else 'en_vivo' end,
          captura_iniciada_en = now()
      where id = p_clase;
    return;
  end if;

  if actual = 'manual' and not coalesce(p_manual, false) then
    raise exception 'Esta categoría se está capturando a mano. Los puestos no pueden modificarla.';
  end if;

  if actual = 'en_vivo' and coalesce(p_manual, false) then
    raise exception 'Esta categoría ya se está juzgando en vivo. No se puede capturar a mano.';
  end if;
end;
$$;

revoke all on function public.captura_reclamar(uuid, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Las funciones de escritura ganan p_manual (default false) y reclaman el modo
-- justo antes de modificar. Hay que borrar la firma vieja: un parámetro nuevo
-- no entra con CREATE OR REPLACE.
-- ---------------------------------------------------------------------------

drop function if exists public.acceso_elegir_clase(text, uuid);

create function public.acceso_elegir_clase(p_codigo text, p_clase uuid, p_manual boolean default false)
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
    raise exception 'Solo la mesa técnica elige la categoría';
  end if;
  j := public.acceso_clase(a, p_clase);
  if j.fase = 'inscripcion' then
    raise exception 'La categoría % no se ha numerado', j.categoria;
  end if;
  if j.fase = 'cerrada' then
    raise exception 'La categoría % ya se finalizó', j.categoria;
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
  update public.competencias set clase_activa = j.id where id = a.competencia_id;
end;
$$;

revoke execute on function public.acceso_elegir_clase(text, uuid, boolean) from public;
grant execute on function public.acceso_elegir_clase(text, uuid, boolean) to anon, authenticated;

drop function if exists public.acceso_fase(text, uuid, text);

create function public.acceso_fase(p_codigo text, p_clase uuid, p_fase text, p_manual boolean default false)
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
  perform public.captura_reclamar(j.id, p_manual);
  if p_fase = 'individual' and not j.con_formato_a and j.fase = 'prepista' then
    update public.juzgamiento_ejemplares
      set escogido = (asistio is true and excusa is null)
      where juzgamiento_id = j.id;
  end if;
  update public.juzgamientos set fase = p_fase where id = j.id;
end;
$$;

revoke execute on function public.acceso_fase(text, uuid, text, boolean) from public;
grant execute on function public.acceso_fase(text, uuid, text, boolean) to anon, authenticated;

drop function if exists public.acceso_asistencia(text, uuid, boolean);

create function public.acceso_asistencia(p_codigo text, p_ejemplar uuid, p_asistio boolean, p_manual boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.competencia_accesos := public.acceso_validar(p_codigo);
  e public.juzgamiento_ejemplares;
  j public.juzgamientos;
begin
  if a.rol not in ('prepista', 'mesa') then
    raise exception 'Este código no marca asistencia';
  end if;
  select * into e from public.juzgamiento_ejemplares where id = p_ejemplar;
  j := public.acceso_clase_en_pista(a, e.juzgamiento_id);
  if j.fase not in ('prepista', 'formato_a') then
    raise exception 'La pre-pista de esta clase ya cerró';
  end if;
  perform public.captura_reclamar(j.id, p_manual);
  update public.juzgamiento_ejemplares set asistio = p_asistio where id = p_ejemplar;
end;
$$;

revoke execute on function public.acceso_asistencia(text, uuid, boolean, boolean) from public;
grant execute on function public.acceso_asistencia(text, uuid, boolean, boolean) to anon, authenticated;

drop function if exists public.acceso_formato_a(text, uuid, integer, boolean);

create function public.acceso_formato_a(
  p_codigo text,
  p_clase uuid,
  p_numero integer,
  p_marcado boolean,
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
  marcados integer;
begin
  if a.rol <> 'juez' then
    raise exception 'Solo un juez vota el formato A';
  end if;
  j := public.acceso_clase_en_pista(a, p_clase);
  if j.fase <> 'formato_a' then
    raise exception 'El formato A de esta clase no está abierto';
  end if;
  if public.juez_finalizo(j.id, a.juez_puesto, 'formato_a') then
    raise exception 'Ya finalizó su formato A en esta categoría';
  end if;
  perform public.captura_reclamar(j.id, p_manual);
  if not p_marcado then
    delete from public.juzgamiento_formato_a
    where juzgamiento_id = j.id and juez_puesto = a.juez_puesto and ejemplar_numero = p_numero;
    return;
  end if;
  if not exists (
    select 1 from public.juzgamiento_ejemplares
    where juzgamiento_id = j.id and numero = p_numero and asistio is not false and excusa is null
  ) then
    raise exception 'El número % no está en pista', p_numero;
  end if;
  perform 1 from public.juzgamientos where id = j.id for update;
  select count(*) into marcados from public.juzgamiento_formato_a
    where juzgamiento_id = j.id and juez_puesto = a.juez_puesto and ejemplar_numero <> p_numero;
  if marcados >= 6 then
    raise exception 'Máximo 6 ejemplares por juez en el formato A';
  end if;
  insert into public.juzgamiento_formato_a (juzgamiento_id, juez_puesto, ejemplar_numero)
  values (j.id, a.juez_puesto, p_numero) on conflict do nothing;
end;
$$;

revoke execute on function public.acceso_formato_a(text, uuid, integer, boolean, boolean) from public;
grant execute on function public.acceso_formato_a(text, uuid, integer, boolean, boolean) to anon, authenticated;

drop function if exists public.acceso_votar(text, uuid, text, integer);

create function public.acceso_votar(
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
  if p_lugar not in ('1', '2', '3', '4', '5') then
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

revoke execute on function public.acceso_votar(text, uuid, text, integer, boolean) from public;
grant execute on function public.acceso_votar(text, uuid, text, integer, boolean) to anon, authenticated;

drop function if exists public.acceso_finalizar_votacion(text, uuid);

create function public.acceso_finalizar_votacion(p_codigo text, p_clase uuid, p_manual boolean default false)
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
    select count(*) into votados from public.juzgamiento_votos
      where juzgamiento_id = j.id and juez_puesto = a.juez_puesto and lugar in ('1', '2', '3', '4', '5');
    if votados < least(5, en_final) then
      raise exception 'Faltan lugares por votar antes de finalizar';
    end if;
  else
    raise exception 'En esta fase no hay votación que finalizar';
  end if;
  perform public.captura_reclamar(j.id, p_manual);
  insert into public.juzgamiento_finalizados (juzgamiento_id, juez_puesto, fase)
  values (j.id, a.juez_puesto, j.fase) on conflict do nothing;
end;
$$;

revoke execute on function public.acceso_finalizar_votacion(text, uuid, boolean) from public;
grant execute on function public.acceso_finalizar_votacion(text, uuid, boolean) to anon, authenticated;

drop function if exists public.acceso_reabrir_votacion(text, uuid, integer);

create function public.acceso_reabrir_votacion(
  p_codigo text,
  p_clase uuid,
  p_juez integer,
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
    raise exception 'Solo la mesa técnica reabre una votación';
  end if;
  j := public.acceso_clase_en_pista(a, p_clase);
  perform public.captura_reclamar(j.id, p_manual);
  delete from public.juzgamiento_finalizados
  where juzgamiento_id = j.id and juez_puesto = p_juez
    and fase = case when j.fase = 'votacion' then 'votacion' else 'formato_a' end;
end;
$$;

revoke execute on function public.acceso_reabrir_votacion(text, uuid, integer, boolean) from public;
grant execute on function public.acceso_reabrir_votacion(text, uuid, integer, boolean) to anon, authenticated;

drop function if exists public.acceso_excusa_voto(text, uuid, integer, text);

create function public.acceso_excusa_voto(
  p_codigo text,
  p_clase uuid,
  p_numero integer,
  p_motivo text,
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
    raise exception 'Solo los jueces votan una excusa';
  end if;
  j := public.acceso_clase_en_pista(a, p_clase);
  if j.fase not in ('formato_a', 'individual', 'votacion') then
    raise exception 'En esta fase no se excusa';
  end if;
  if j.fase <> 'individual'
     and public.juez_finalizo(j.id, a.juez_puesto, case when j.fase = 'votacion' then 'votacion' else 'formato_a' end) then
    raise exception 'Ya finalizó su votación en esta fase';
  end if;
  if not exists (
    select 1 from public.juzgamiento_ejemplares
    where juzgamiento_id = j.id and numero = p_numero and asistio is not false
  ) then
    raise exception 'El número % no está en pista', p_numero;
  end if;
  if nullif(p_motivo, '') is not null
     and p_motivo not in ('indocilidad', 'fuera_modalidad', 'solicitud_exhibidor', 'sanitaria') then
    raise exception 'Motivo de excusa no válido';
  end if;
  perform public.captura_reclamar(j.id, p_manual);
  perform 1 from public.juzgamientos where id = j.id for update;
  if nullif(p_motivo, '') is null then
    delete from public.juzgamiento_excusas_votos
    where juzgamiento_id = j.id and juez_puesto = a.juez_puesto and ejemplar_numero = p_numero;
  else
    insert into public.juzgamiento_excusas_votos (juzgamiento_id, juez_puesto, ejemplar_numero, motivo)
    values (j.id, a.juez_puesto, p_numero, p_motivo)
    on conflict (juzgamiento_id, juez_puesto, ejemplar_numero)
    do update set motivo = excluded.motivo, votado_en = now();
  end if;
  perform public.recalcular_excusa(j.id, p_numero);
end;
$$;

revoke execute on function public.acceso_excusa_voto(text, uuid, integer, text, boolean) from public;
grant execute on function public.acceso_excusa_voto(text, uuid, integer, text, boolean) to anon, authenticated;

drop function if exists public.acceso_escoger(text, uuid, boolean);

create function public.acceso_escoger(p_codigo text, p_ejemplar uuid, p_escogido boolean, p_manual boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.competencia_accesos := public.acceso_validar(p_codigo);
  e public.juzgamiento_ejemplares;
  j public.juzgamientos;
begin
  if a.rol <> 'mesa' then
    raise exception 'Solo la mesa técnica escoge';
  end if;
  select * into e from public.juzgamiento_ejemplares where id = p_ejemplar;
  j := public.acceso_clase_en_pista(a, e.juzgamiento_id);
  if j.fase not in ('formato_a', 'individual') then
    raise exception 'Solo se escoge entre el formato A y el recorrido individual';
  end if;
  if p_escogido and (e.asistio is false or e.excusa is not null) then
    raise exception 'El número % no asistió o está excusado', e.numero;
  end if;
  perform public.captura_reclamar(j.id, p_manual);
  update public.juzgamiento_ejemplares set escogido = p_escogido where id = p_ejemplar;
end;
$$;

revoke execute on function public.acceso_escoger(text, uuid, boolean, boolean) from public;
grant execute on function public.acceso_escoger(text, uuid, boolean, boolean) to anon, authenticated;

drop function if exists public.acceso_asignar_numeros(text, uuid, integer[]);

create function public.acceso_asignar_numeros(
  p_codigo text,
  p_clase uuid,
  p_numeros integer[],
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
  cuantos integer;
  numeros integer[];
begin
  if a.rol not in ('prepista', 'mesa') then
    raise exception 'Solo la pre-pista o la mesa técnica asignan números';
  end if;
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

  perform public.captura_reclamar(j.id, p_manual);
  update public.juzgamiento_ejemplares set numero = null where juzgamiento_id = j.id;
  with orden as (
    select e.id, row_number() over (order by e.nacimiento asc nulls last, e.nombre, e.id) as i
    from public.juzgamiento_ejemplares e
    where e.juzgamiento_id = j.id
  )
  update public.juzgamiento_ejemplares e set numero = numeros[orden.i] from orden where e.id = orden.id;
end;
$$;

revoke execute on function public.acceso_asignar_numeros(text, uuid, integer[], boolean) from public;
grant execute on function public.acceso_asignar_numeros(text, uuid, integer[], boolean) to anon, authenticated;

drop function if exists public.acceso_lleva_formato_a(text, uuid, boolean);

create function public.acceso_lleva_formato_a(
  p_codigo text,
  p_clase uuid,
  p_lleva boolean,
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

  perform public.captura_reclamar(j.id, p_manual);
  update public.juzgamientos set con_formato_a = p_lleva where id = j.id;
  if p_lleva and j.fase = 'individual' then
    update public.juzgamiento_ejemplares set escogido = false where juzgamiento_id = j.id;
    delete from public.juzgamiento_finalizados where juzgamiento_id = j.id;
    update public.juzgamientos set fase = 'formato_a' where id = j.id;
  elsif not p_lleva and j.fase = 'formato_a' then
    delete from public.juzgamiento_finalizados where juzgamiento_id = j.id;
    update public.juzgamientos set fase = 'prepista' where id = j.id;
  end if;
end;
$$;

revoke execute on function public.acceso_lleva_formato_a(text, uuid, boolean, boolean) from public;
grant execute on function public.acceso_lleva_formato_a(text, uuid, boolean, boolean) to anon, authenticated;

drop function if exists public.acceso_numero_ejemplar(text, uuid, uuid, integer);

create function public.acceso_numero_ejemplar(
  p_codigo text,
  p_clase uuid,
  p_ejemplar uuid,
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
  e public.juzgamiento_ejemplares;
  otro uuid;
begin
  if a.rol not in ('prepista', 'mesa') then
    raise exception 'Solo la pre-pista o la mesa técnica asignan números';
  end if;
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
  if p_numero is null or p_numero <= 0 or p_numero > 9999 then
    raise exception 'El número tiene que estar entre 1 y 9999';
  end if;

  select * into e from public.juzgamiento_ejemplares where id = p_ejemplar and juzgamiento_id = j.id;
  if e.id is null then
    raise exception 'El ejemplar no es de esta categoría';
  end if;
  if e.numero = p_numero then
    return;
  end if;

  select id into otro from public.juzgamiento_ejemplares
    where juzgamiento_id = j.id and numero = p_numero and id <> e.id;

  perform public.captura_reclamar(j.id, p_manual);
  update public.juzgamiento_ejemplares set numero = null where id = e.id;
  if otro is not null then
    update public.juzgamiento_ejemplares set numero = e.numero where id = otro;
  end if;
  update public.juzgamiento_ejemplares set numero = p_numero where id = e.id;
end;
$$;

revoke execute on function public.acceso_numero_ejemplar(text, uuid, uuid, integer, boolean) from public;
grant execute on function public.acceso_numero_ejemplar(text, uuid, uuid, integer, boolean) to anon, authenticated;

-- El estado de la pista cuenta el modo, para que la pantalla lo muestre sin escribir.
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
              'adn', cab.adn, 'microchip', cab.microchip)
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

notify pgrst, 'reload schema';
