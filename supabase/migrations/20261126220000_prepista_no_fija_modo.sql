-- La pre-pista sigue en su pantalla: números y asistencia no eligen el camino
-- y no quedan bloqueados si después la categoría se captura a mano.
-- El modo se fija al sacar a pista o al anotar formato A, quién pasa, excusas,
-- votación o el cierre. La mesa, en una categoría ya a mano, tampoco cambia
-- números ni asistencia.

comment on column public.juzgamientos.modo_captura is
  'manual: desde sacar a pista la anota una persona. en_vivo: jueces y mesa. Nulo mientras solo trabajó la pre-pista.';

-- Lo que quedó en vivo solo por la asistencia o los números, y todavía no salió
-- a pista, vuelve a estar libre para la captura manual.
update public.juzgamientos j
set modo_captura = null,
    captura_iniciada_en = null
where j.modo_captura = 'en_vivo'
  and j.fase in ('inscripcion', 'prepista')
  and not exists (select 1 from public.competencias c where c.clase_activa = j.id)
  and not exists (select 1 from public.juzgamiento_formato_a f where f.juzgamiento_id = j.id)
  and not exists (select 1 from public.juzgamiento_votos v where v.juzgamiento_id = j.id)
  and not exists (select 1 from public.juzgamiento_excusas_votos x where x.juzgamiento_id = j.id)
  and not exists (select 1 from public.juzgamiento_finalizados f where f.juzgamiento_id = j.id);

create or replace function public.acceso_asistencia(
  p_codigo text,
  p_ejemplar uuid,
  p_asistio boolean,
  p_manual boolean default false
)
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
  -- p_manual no se usa: confirmar no fija el modo. La mesa no pisa una captura a mano.
  if a.rol = 'mesa' and j.modo_captura = 'manual' then
    raise exception 'Esta categoría se está capturando a mano. Los puestos no pueden modificarla.';
  end if;
  update public.juzgamiento_ejemplares set asistio = p_asistio where id = p_ejemplar;
end;
$$;

create or replace function public.acceso_asignar_numeros(
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
  if a.rol = 'mesa' and j.modo_captura = 'manual' then
    raise exception 'Esta categoría se está capturando a mano. Los puestos no pueden modificarla.';
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

  update public.juzgamiento_ejemplares set numero = null where juzgamiento_id = j.id;
  with orden as (
    select e.id, row_number() over (order by e.nacimiento asc nulls last, e.nombre, e.id) as i
    from public.juzgamiento_ejemplares e
    where e.juzgamiento_id = j.id
  )
  update public.juzgamiento_ejemplares e set numero = numeros[orden.i] from orden where e.id = orden.id;
end;
$$;

create or replace function public.acceso_numero_ejemplar(
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
  if a.rol = 'mesa' and j.modo_captura = 'manual' then
    raise exception 'Esta categoría se está capturando a mano. Los puestos no pueden modificarla.';
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

  update public.juzgamiento_ejemplares set numero = null where id = e.id;
  if otro is not null then
    update public.juzgamiento_ejemplares set numero = e.numero where id = otro;
  end if;
  update public.juzgamiento_ejemplares set numero = p_numero where id = e.id;
end;
$$;

notify pgrst, 'reload schema';
