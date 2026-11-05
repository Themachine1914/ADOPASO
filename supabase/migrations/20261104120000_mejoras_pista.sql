-- Mejoras de pista (notas del 4 de noviembre de 2026):
-- · Una sola categoría en pista: la mesa técnica la elige y nadie la cambia hasta finalizarla.
-- · Formato A: máximo 6 ejemplares por juez.
-- · Cada juez finaliza su formato A y su votación final; después ya no puede cambiarlos.
-- · Las excusas las votan los jueces: queda excusado con la mayoría (2 de 3, 3 de 5).
-- · Una categoría que se queda sin ejemplares se borra sola (no sale vacía en pista).

-- ---------------------------------------------------------------------------
-- Categoría en pista
-- ---------------------------------------------------------------------------
alter table public.competencias
  add column clase_activa uuid references public.juzgamientos (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Juez que finalizó su formato A o su votación final
-- ---------------------------------------------------------------------------
create table public.juzgamiento_finalizados (
  juzgamiento_id uuid not null references public.juzgamientos (id) on delete cascade,
  juez_puesto integer not null check (juez_puesto between 1 and 5),
  fase text not null check (fase in ('formato_a', 'votacion')),
  finalizado_en timestamptz not null default now(),
  primary key (juzgamiento_id, juez_puesto, fase)
);

-- Voto de un juez para excusar un ejemplar, con su motivo.
create table public.juzgamiento_excusas_votos (
  juzgamiento_id uuid not null references public.juzgamientos (id) on delete cascade,
  juez_puesto integer not null check (juez_puesto between 1 and 5),
  ejemplar_numero integer not null check (ejemplar_numero > 0),
  motivo text not null check (motivo in ('indocilidad', 'fuera_modalidad', 'solicitud_exhibidor', 'sanitaria')),
  votado_en timestamptz not null default now(),
  primary key (juzgamiento_id, juez_puesto, ejemplar_numero)
);

alter table public.juzgamiento_finalizados enable row level security;
alter table public.juzgamiento_excusas_votos enable row level security;

create policy juzgamiento_finalizados_admin on public.juzgamiento_finalizados
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create policy juzgamiento_excusas_votos_admin on public.juzgamiento_excusas_votos
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

grant select, insert, update, delete on public.juzgamiento_finalizados, public.juzgamiento_excusas_votos to authenticated;
revoke all on public.juzgamiento_finalizados, public.juzgamiento_excusas_votos from anon;

-- ---------------------------------------------------------------------------
-- Excusa por mayoría de los jueces sentados en la clase
-- ---------------------------------------------------------------------------
create or replace function public.recalcular_excusa(p_clase uuid, p_numero integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.juzgamientos;
  jueces integer;
  a_favor integer;
  motivo_ganador text;
  e public.juzgamiento_ejemplares;
begin
  select * into j from public.juzgamientos where id = p_clase;
  select * into e from public.juzgamiento_ejemplares where juzgamiento_id = p_clase and numero = p_numero;
  if j.id is null or e.id is null then
    return;
  end if;
  select count(*) into jueces from public.juzgamiento_jueces where juzgamiento_id = p_clase;
  select count(*) into a_favor from public.juzgamiento_excusas_votos
    where juzgamiento_id = p_clase and ejemplar_numero = p_numero;

  -- Mayoría: más de la mitad de los jueces sentados (2 de 3, 3 de 5).
  if jueces > 0 and a_favor >= jueces / 2 + 1 then
    -- Motivo: el que más jueces escogieron; si empatan, el que se votó primero.
    select v.motivo into motivo_ganador
    from public.juzgamiento_excusas_votos v
    where v.juzgamiento_id = p_clase and v.ejemplar_numero = p_numero
    group by v.motivo
    order by count(*) desc, min(v.votado_en)
    limit 1;

    update public.juzgamiento_ejemplares
    set excusa = motivo_ganador,
        excusa_fase = coalesce(e.excusa_fase, case when j.fase = 'formato_a' then 'formato_a' else 'final' end),
        escogido = false
    where id = e.id;
    -- Los jueces que ya habían finalizado con ese número votado tienen que volver a votar ese lugar.
    delete from public.juzgamiento_finalizados f
    where f.juzgamiento_id = p_clase and f.fase = 'votacion'
      and exists (
        select 1 from public.juzgamiento_votos v
        where v.juzgamiento_id = p_clase and v.juez_puesto = f.juez_puesto and v.ejemplar_numero = p_numero
      );
    -- Un ejemplar excusado sale del formato A y de la votación final.
    delete from public.juzgamiento_formato_a where juzgamiento_id = p_clase and ejemplar_numero = p_numero;
    delete from public.juzgamiento_votos where juzgamiento_id = p_clase and ejemplar_numero = p_numero;
  elsif e.excusa is not null then
    update public.juzgamiento_ejemplares set excusa = null, excusa_fase = null where id = e.id;
  end if;
end;
$$;

revoke execute on function public.recalcular_excusa(uuid, integer) from public, anon, authenticated;

-- Al borrar un código de juez, sale también con sus excusas y sus finalizaciones.
create or replace function public.levantar_juez()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pendiente record;
begin
  if old.rol = 'juez' then
    delete from public.juzgamiento_votos v using public.juzgamientos j
      where v.juzgamiento_id = j.id and j.competencia_id = old.competencia_id and v.juez_puesto = old.juez_puesto;
    delete from public.juzgamiento_formato_a f using public.juzgamientos j
      where f.juzgamiento_id = j.id and j.competencia_id = old.competencia_id and f.juez_puesto = old.juez_puesto;
    delete from public.juzgamiento_finalizados f using public.juzgamientos j
      where f.juzgamiento_id = j.id and j.competencia_id = old.competencia_id and f.juez_puesto = old.juez_puesto;
    delete from public.juzgamiento_excusas_votos x using public.juzgamientos j
      where x.juzgamiento_id = j.id and j.competencia_id = old.competencia_id and x.juez_puesto = old.juez_puesto;
    delete from public.juzgamiento_jueces x using public.juzgamientos j
      where x.juzgamiento_id = j.id and j.competencia_id = old.competencia_id and x.puesto = old.juez_puesto;
    -- Con un juez menos cambia la mayoría: se revisan las excusas votadas.
    for pendiente in
      select distinct x.juzgamiento_id, x.ejemplar_numero
      from public.juzgamiento_excusas_votos x
      join public.juzgamientos j on j.id = x.juzgamiento_id
      where j.competencia_id = old.competencia_id
    loop
      perform public.recalcular_excusa(pendiente.juzgamiento_id, pendiente.ejemplar_numero);
    end loop;
  end if;
  return old;
end;
$$;

-- ---------------------------------------------------------------------------
-- Categoría sin ejemplares: se borra si no tiene votos
-- ---------------------------------------------------------------------------
create or replace function public.borrar_clase_vacia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.juzgamientos j
  where j.id = old.juzgamiento_id
    and j.competencia_id is not null
    and not exists (select 1 from public.juzgamiento_ejemplares e where e.juzgamiento_id = j.id)
    and not exists (select 1 from public.juzgamiento_votos v where v.juzgamiento_id = j.id)
    and not exists (select 1 from public.juzgamiento_formato_a f where f.juzgamiento_id = j.id);
  return null;
end;
$$;

revoke execute on function public.borrar_clase_vacia() from public, anon, authenticated;

create trigger borrar_clase_vacia_al_quitar after delete on public.juzgamiento_ejemplares
  for each row execute function public.borrar_clase_vacia();
-- Cambiar a un caballo de categoría también puede dejar la anterior vacía.
create trigger borrar_clase_vacia_al_mover after update of juzgamiento_id on public.juzgamiento_ejemplares
  for each row when (old.juzgamiento_id is distinct from new.juzgamiento_id)
  execute function public.borrar_clase_vacia();

-- No se inscribe ni se mueve un caballo a una categoría que ya está en juzgamiento o finalizada:
-- quedaría sin número y trabaría la numeración de toda la competencia.
create or replace function public.inscribir_solo_antes_de_juzgar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.juzgamientos;
begin
  select * into j from public.juzgamientos where id = new.juzgamiento_id;
  if j.competencia_id is not null and j.fase not in ('inscripcion', 'prepista') then
    raise exception 'La categoría % ya está en juzgamiento; no se le pueden agregar caballos', j.categoria;
  end if;
  return new;
end;
$$;

revoke execute on function public.inscribir_solo_antes_de_juzgar() from public, anon, authenticated;

create trigger inscribir_solo_antes_de_juzgar before insert on public.juzgamiento_ejemplares
  for each row execute function public.inscribir_solo_antes_de_juzgar();
create trigger mover_solo_antes_de_juzgar before update of juzgamiento_id on public.juzgamiento_ejemplares
  for each row when (old.juzgamiento_id is distinct from new.juzgamiento_id)
  execute function public.inscribir_solo_antes_de_juzgar();

-- Las categorías que ya quedaron vacías (por ejemplo, tras borrar una inscripción equivocada).
delete from public.juzgamientos j
where j.competencia_id is not null
  and not exists (select 1 from public.juzgamiento_ejemplares e where e.juzgamiento_id = j.id)
  and not exists (select 1 from public.juzgamiento_votos v where v.juzgamiento_id = j.id)
  and not exists (select 1 from public.juzgamiento_formato_a f where f.juzgamiento_id = j.id);

-- ---------------------------------------------------------------------------
-- Acceso: la clase tiene que ser la que está en pista
-- ---------------------------------------------------------------------------
create or replace function public.acceso_clase_en_pista(a public.competencia_accesos, p_clase uuid)
returns public.juzgamientos
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  j public.juzgamientos := public.acceso_clase(a, p_clase);
  activa uuid;
begin
  select clase_activa into activa from public.competencias where id = a.competencia_id;
  if activa is distinct from j.id then
    raise exception 'La categoría % no está en pista. La mesa técnica elige la categoría.', j.categoria;
  end if;
  return j;
end;
$$;

revoke execute on function public.acceso_clase_en_pista(public.competencia_accesos, uuid) from public, anon, authenticated;

create or replace function public.juez_finalizo(p_clase uuid, p_juez integer, p_fase text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.juzgamiento_finalizados
    where juzgamiento_id = p_clase and juez_puesto = p_juez and fase = p_fase
  )
$$;

revoke execute on function public.juez_finalizo(uuid, integer, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Estado para cada puesto (agrega categoría en pista, finalizados y excusas)
-- ---------------------------------------------------------------------------
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
-- Mesa técnica: elige la categoría que sale a pista
-- ---------------------------------------------------------------------------
create or replace function public.acceso_elegir_clase(p_codigo text, p_clase uuid)
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
  -- Bloquea la competencia para que dos mesas no elijan a la vez.
  select x.* into actual
  from public.competencias c
  left join public.juzgamientos x on x.id = c.clase_activa
  where c.id = a.competencia_id
  for update of c;
  if actual.id is not null and actual.id <> j.id and actual.fase <> 'cerrada' then
    raise exception 'Primero finalice la categoría %', actual.categoria;
  end if;
  update public.competencias set clase_activa = j.id where id = a.competencia_id;
end;
$$;

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
  update public.juzgamientos set fase = p_fase where id = j.id;
end;
$$;

-- Pre-pista (o mesa técnica): participante confirmado o no asistió.
create or replace function public.acceso_asistencia(p_codigo text, p_ejemplar uuid, p_asistio boolean)
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
  update public.juzgamiento_ejemplares set asistio = p_asistio where id = p_ejemplar;
end;
$$;

-- Juez: marca o desmarca un número en su formato A (máximo 6).
create or replace function public.acceso_formato_a(p_codigo text, p_clase uuid, p_numero integer, p_marcado boolean)
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
  -- Un toque rápido doble no puede pasar del máximo: se cuenta con la clase bloqueada.
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

-- Juez: lugar 1 a 5 en la votación final. Número vacío borra el lugar.
create or replace function public.acceso_votar(p_codigo text, p_clase uuid, p_lugar text, p_numero integer)
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

-- Juez: «Finalizar votación» del formato A o de la votación final.
create or replace function public.acceso_finalizar_votacion(p_codigo text, p_clase uuid)
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
  insert into public.juzgamiento_finalizados (juzgamiento_id, juez_puesto, fase)
  values (j.id, a.juez_puesto, j.fase) on conflict do nothing;
end;
$$;

-- Mesa técnica: le devuelve a un juez su votación para que la corrija.
create or replace function public.acceso_reabrir_votacion(p_codigo text, p_clase uuid, p_juez integer)
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
  delete from public.juzgamiento_finalizados
  where juzgamiento_id = j.id and juez_puesto = p_juez
    and fase = case when j.fase = 'votacion' then 'votacion' else 'formato_a' end;
end;
$$;

-- Juez: vota excusar un ejemplar (motivo vacío retira su voto).
create or replace function public.acceso_excusa_voto(p_codigo text, p_clase uuid, p_numero integer, p_motivo text)
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
  -- En el recorrido individual se puede excusar aunque el formato A ya esté finalizado.
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
  perform 1 from public.juzgamientos where id = j.id for update;
  if nullif(p_motivo, '') is null then
    delete from public.juzgamiento_excusas_votos
    where juzgamiento_id = j.id and juez_puesto = a.juez_puesto and ejemplar_numero = p_numero;
  else
    if p_motivo not in ('indocilidad', 'fuera_modalidad', 'solicitud_exhibidor', 'sanitaria') then
      raise exception 'Motivo de excusa no válido';
    end if;
    insert into public.juzgamiento_excusas_votos (juzgamiento_id, juez_puesto, ejemplar_numero, motivo)
    values (j.id, a.juez_puesto, p_numero, p_motivo)
    on conflict (juzgamiento_id, juez_puesto, ejemplar_numero)
    do update set motivo = excluded.motivo, votado_en = now();
  end if;
  perform public.recalcular_excusa(j.id, p_numero);
end;
$$;

-- Mesa técnica: pasa o no al recorrido individual.
create or replace function public.acceso_escoger(p_codigo text, p_ejemplar uuid, p_escogido boolean)
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
  update public.juzgamiento_ejemplares set escogido = p_escogido where id = p_ejemplar;
end;
$$;

-- La excusa ya no la pone la mesa técnica: la deciden los jueces por mayoría.
create or replace function public.acceso_excusar(p_codigo text, p_ejemplar uuid, p_excusa text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Las excusas las votan los jueces; queda excusado con la mayoría';
end;
$$;

revoke execute on function
  public.acceso_estado(text),
  public.acceso_elegir_clase(text, uuid),
  public.acceso_fase(text, uuid, text),
  public.acceso_asistencia(text, uuid, boolean),
  public.acceso_formato_a(text, uuid, integer, boolean),
  public.acceso_votar(text, uuid, text, integer),
  public.acceso_finalizar_votacion(text, uuid),
  public.acceso_reabrir_votacion(text, uuid, integer),
  public.acceso_excusa_voto(text, uuid, integer, text),
  public.acceso_escoger(text, uuid, boolean),
  public.acceso_excusar(text, uuid, text)
from public;

grant execute on function
  public.acceso_estado(text),
  public.acceso_elegir_clase(text, uuid),
  public.acceso_fase(text, uuid, text),
  public.acceso_asistencia(text, uuid, boolean),
  public.acceso_formato_a(text, uuid, integer, boolean),
  public.acceso_votar(text, uuid, text, integer),
  public.acceso_finalizar_votacion(text, uuid),
  public.acceso_reabrir_votacion(text, uuid, integer),
  public.acceso_excusa_voto(text, uuid, integer, text),
  public.acceso_escoger(text, uuid, boolean),
  public.acceso_excusar(text, uuid, text)
to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Numerar: si ya hay votos en otra categoría, numera solo las que no tienen número
-- (un caballo inscrito o cambiado de categoría a última hora).
-- ---------------------------------------------------------------------------
create or replace function public.numerar_competencia(p_competencia uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select public.es_admin()) then
    raise exception 'Solo un administrador puede numerar';
  end if;

  -- Una categoría con votos o que ya pasó la pre-pista conserva sus números.
  update public.juzgamiento_ejemplares e set numero = null
    from public.juzgamientos j
    where e.juzgamiento_id = j.id and j.competencia_id = p_competencia
      and j.fase in ('inscripcion', 'prepista')
      and not exists (select 1 from public.juzgamiento_votos v where v.juzgamiento_id = j.id)
      and not exists (select 1 from public.juzgamiento_formato_a f where f.juzgamiento_id = j.id);

  if exists (
    select 1 from public.juzgamiento_ejemplares e join public.juzgamientos j on j.id = e.juzgamiento_id
    where j.competencia_id = p_competencia and e.numero is null and j.fase not in ('inscripcion', 'prepista')
  ) then
    raise exception 'Hay ejemplares sin número en una categoría que ya está en juzgamiento';
  end if;

  with orden as (
    select e.id,
      row_number() over (partition by e.juzgamiento_id order by e.nacimiento asc nulls last, e.nombre) as n
    from public.juzgamiento_ejemplares e
    join public.juzgamientos j on j.id = e.juzgamiento_id
    where j.competencia_id = p_competencia
      and not exists (
        select 1 from public.juzgamiento_ejemplares x where x.juzgamiento_id = e.juzgamiento_id and x.numero is not null
      )
  )
  update public.juzgamiento_ejemplares e set numero = orden.n from orden where e.id = orden.id;

  update public.juzgamientos set fase = 'prepista'
    where competencia_id = p_competencia and fase = 'inscripcion';
  update public.competencias set estado = 'en_curso' where id = p_competencia;
end;
$$;
