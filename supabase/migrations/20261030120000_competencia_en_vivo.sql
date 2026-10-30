-- Competencia en vivo: inscripción, numeración por edad, pre-pista, formato A, votación final y mesa técnica.
-- Cada clase de la competencia es un juzgamiento (formulario, libretas F-2 y hoja de cómputo de siempre).
-- Jueces, pre-pista y mesa técnica entran con un código por competencia, sin cuenta: todo lo que hacen
-- pasa por funciones que validan el código. Las tablas siguen siendo solo del administrador.

-- ---------------------------------------------------------------------------
-- Competencias
-- ---------------------------------------------------------------------------
create table public.competencias (
  id uuid primary key default gen_random_uuid(),
  programa_codigo integer,
  nombre text not null,
  fecha date not null,
  lugar text,
  estado text not null default 'inscripcion' check (estado in ('inscripcion', 'en_curso', 'finalizada')),
  -- Competencia de práctica para probar pasos y accesos con los clientes. No es oficial.
  simulacion boolean not null default false,
  creado_en timestamptz not null default now()
);

alter table public.juzgamientos
  add column competencia_id uuid references public.competencias (id) on delete cascade,
  add column evento_codigo integer,
  add column orden integer,
  -- inscripcion → prepista → formato_a → individual → votacion → cerrada
  add column fase text not null default 'votacion'
    check (fase in ('inscripcion', 'prepista', 'formato_a', 'individual', 'votacion', 'cerrada'));

create unique index on public.juzgamientos (competencia_id, evento_codigo) where competencia_id is not null;

-- El número se asigna al cerrar la inscripción; antes queda vacío.
alter table public.juzgamiento_ejemplares
  alter column numero drop not null,
  add column caballo_codigo text,
  add column pagado boolean not null default false,
  add column asistio boolean,
  add column excusa text check (excusa in ('indocilidad', 'fuera_modalidad', 'solicitud_exhibidor', 'sanitaria')),
  add column excusa_fase text check (excusa_fase in ('formato_a', 'final'));

create unique index on public.juzgamiento_ejemplares (juzgamiento_id, caballo_codigo) where caballo_codigo is not null;

-- Caballos que cada juez marca en el formato A para el recorrido individual.
create table public.juzgamiento_formato_a (
  juzgamiento_id uuid not null references public.juzgamientos (id) on delete cascade,
  juez_puesto integer not null check (juez_puesto between 1 and 5),
  ejemplar_numero integer not null check (ejemplar_numero > 0),
  primary key (juzgamiento_id, juez_puesto, ejemplar_numero)
);

-- Códigos de acceso. Un juez vota en todas las clases de la competencia con su puesto.
create table public.competencia_accesos (
  codigo text primary key,
  competencia_id uuid not null references public.competencias (id) on delete cascade,
  rol text not null check (rol in ('juez', 'prepista', 'mesa')),
  juez_puesto integer check (juez_puesto between 1 and 5),
  juez_codigo integer,
  nombre text,
  creado_en timestamptz not null default now(),
  check ((rol = 'juez') = (juez_puesto is not null))
);

create unique index on public.competencia_accesos (competencia_id, juez_puesto) where rol = 'juez';
create index on public.competencia_accesos (competencia_id);
create index on public.juzgamientos (competencia_id);

alter table public.competencias enable row level security;
alter table public.juzgamiento_formato_a enable row level security;
alter table public.competencia_accesos enable row level security;

create policy competencias_admin on public.competencias
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create policy juzgamiento_formato_a_admin on public.juzgamiento_formato_a
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create policy competencia_accesos_admin on public.competencia_accesos
  for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

grant select, insert, update, delete on
  public.competencias, public.juzgamiento_formato_a, public.competencia_accesos
to authenticated;
revoke all on public.competencias, public.juzgamiento_formato_a, public.competencia_accesos from anon;

-- ---------------------------------------------------------------------------
-- Jueces: el código de juez también lo sienta en cada clase de la competencia
-- ---------------------------------------------------------------------------
create or replace function public.sentar_jueces()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'competencia_accesos' then
    if new.rol = 'juez' then
      insert into public.juzgamiento_jueces (juzgamiento_id, puesto, juez_codigo, nombre)
      select j.id, new.juez_puesto, new.juez_codigo, coalesce(new.nombre, 'Juez ' || new.juez_puesto)
      from public.juzgamientos j
      where j.competencia_id = new.competencia_id
      on conflict (juzgamiento_id, puesto) do nothing;
    end if;
  elsif new.competencia_id is not null then
    insert into public.juzgamiento_jueces (juzgamiento_id, puesto, juez_codigo, nombre)
    select new.id, a.juez_puesto, a.juez_codigo, coalesce(a.nombre, 'Juez ' || a.juez_puesto)
    from public.competencia_accesos a
    where a.competencia_id = new.competencia_id and a.rol = 'juez'
    on conflict (juzgamiento_id, puesto) do nothing;
  end if;
  return new;
end;
$$;

create trigger sentar_jueces_acceso after insert on public.competencia_accesos
  for each row execute function public.sentar_jueces();
create trigger sentar_jueces_clase after insert on public.juzgamientos
  for each row execute function public.sentar_jueces();

-- Al borrar un código de juez, sale de las clases con sus votos.
create or replace function public.levantar_juez()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.rol = 'juez' then
    delete from public.juzgamiento_votos v using public.juzgamientos j
      where v.juzgamiento_id = j.id and j.competencia_id = old.competencia_id and v.juez_puesto = old.juez_puesto;
    delete from public.juzgamiento_formato_a f using public.juzgamientos j
      where f.juzgamiento_id = j.id and j.competencia_id = old.competencia_id and f.juez_puesto = old.juez_puesto;
    delete from public.juzgamiento_jueces x using public.juzgamientos j
      where x.juzgamiento_id = j.id and j.competencia_id = old.competencia_id and x.puesto = old.juez_puesto;
  end if;
  return old;
end;
$$;

create trigger levantar_juez after delete on public.competencia_accesos
  for each row execute function public.levantar_juez();

revoke execute on function public.sentar_jueces(), public.levantar_juez() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Numeración: el más adulto lleva el número más bajo y el más joven el más alto
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
  if exists (
    select 1 from public.juzgamiento_votos v join public.juzgamientos j on j.id = v.juzgamiento_id
    where j.competencia_id = p_competencia
  ) or exists (
    select 1 from public.juzgamiento_formato_a f join public.juzgamientos j on j.id = f.juzgamiento_id
    where j.competencia_id = p_competencia
  ) then
    raise exception 'Ya hay votos de los jueces: no se puede volver a numerar';
  end if;

  update public.juzgamiento_ejemplares e set numero = null
    from public.juzgamientos j
    where e.juzgamiento_id = j.id and j.competencia_id = p_competencia;

  with orden as (
    select e.id,
      row_number() over (partition by e.juzgamiento_id order by e.nacimiento asc nulls last, e.nombre) as n
    from public.juzgamiento_ejemplares e
    join public.juzgamientos j on j.id = e.juzgamiento_id
    where j.competencia_id = p_competencia
  )
  update public.juzgamiento_ejemplares e set numero = orden.n from orden where e.id = orden.id;

  update public.juzgamientos set fase = 'prepista'
    where competencia_id = p_competencia and fase = 'inscripcion';
  update public.competencias set estado = 'en_curso' where id = p_competencia;
end;
$$;

revoke execute on function public.numerar_competencia(uuid) from public, anon;
grant execute on function public.numerar_competencia(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Acceso por código (jueces, pre-pista, mesa técnica)
-- ---------------------------------------------------------------------------
create or replace function public.acceso_validar(p_codigo text)
returns public.competencia_accesos
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  a public.competencia_accesos;
begin
  select x.* into a
  from public.competencia_accesos x
  join public.competencias c on c.id = x.competencia_id
  where x.codigo = upper(trim(p_codigo)) and c.estado <> 'finalizada';
  if a.codigo is null then
    raise exception 'Código no válido o competencia finalizada';
  end if;
  return a;
end;
$$;

revoke execute on function public.acceso_validar(text) from public, anon, authenticated;

-- Clase de la competencia del código, o error.
create or replace function public.acceso_clase(a public.competencia_accesos, p_clase uuid)
returns public.juzgamientos
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  j public.juzgamientos;
begin
  select * into j from public.juzgamientos where id = p_clase and competencia_id = a.competencia_id;
  if j.id is null then
    raise exception 'La clase no es de esta competencia';
  end if;
  return j;
end;
$$;

revoke execute on function public.acceso_clase(public.competencia_accesos, uuid) from public, anon, authenticated;

-- Todo lo que el puesto puede ver. Los jueces solo ven números, nunca nombres ni propietarios.
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
        ), '[]'::jsonb)
      ) order by j.orden nulls last, j.categoria)
      from public.juzgamientos j where j.competencia_id = c.id
    ), '[]'::jsonb)
  );
end;
$$;

-- Pre-pista (o mesa técnica): asistió o no asistió.
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
  j := public.acceso_clase(a, e.juzgamiento_id);
  if j.fase not in ('prepista', 'formato_a') then
    raise exception 'La pre-pista de esta clase ya cerró';
  end if;
  update public.juzgamiento_ejemplares set asistio = p_asistio where id = p_ejemplar;
end;
$$;

-- Juez: marca o desmarca un número en su formato A.
create or replace function public.acceso_formato_a(p_codigo text, p_clase uuid, p_numero integer, p_marcado boolean)
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
    raise exception 'Solo un juez vota el formato A';
  end if;
  j := public.acceso_clase(a, p_clase);
  if j.fase <> 'formato_a' then
    raise exception 'El formato A de esta clase no está abierto';
  end if;
  if not exists (
    select 1 from public.juzgamiento_ejemplares
    where juzgamiento_id = j.id and numero = p_numero and asistio is not false and excusa is null
  ) then
    raise exception 'El número % no está en pista', p_numero;
  end if;
  if p_marcado then
    insert into public.juzgamiento_formato_a (juzgamiento_id, juez_puesto, ejemplar_numero)
    values (j.id, a.juez_puesto, p_numero) on conflict do nothing;
  else
    delete from public.juzgamiento_formato_a
    where juzgamiento_id = j.id and juez_puesto = a.juez_puesto and ejemplar_numero = p_numero;
  end if;
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
  j := public.acceso_clase(a, p_clase);
  if j.fase <> 'votacion' then
    raise exception 'La votación final de esta clase no está abierta';
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
  -- Un mismo número no puede tener dos lugares en la libreta del juez.
  delete from public.juzgamiento_votos
  where juzgamiento_id = j.id and juez_puesto = a.juez_puesto and ejemplar_numero = p_numero and lugar <> p_lugar;
  insert into public.juzgamiento_votos (juzgamiento_id, juez_puesto, lugar, ejemplar_numero)
  values (j.id, a.juez_puesto, p_lugar, p_numero)
  on conflict (juzgamiento_id, juez_puesto, lugar) do update set ejemplar_numero = excluded.ejemplar_numero;
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
  j := public.acceso_clase(a, e.juzgamiento_id);
  if j.fase not in ('formato_a', 'individual') then
    raise exception 'Solo se escoge entre el formato A y el recorrido individual';
  end if;
  if p_escogido and (e.asistio is false or e.excusa is not null) then
    raise exception 'El número % no asistió o está excusado', e.numero;
  end if;
  update public.juzgamiento_ejemplares set escogido = p_escogido where id = p_ejemplar;
end;
$$;

-- Mesa técnica: excusa un ejemplar con su motivo (vacío quita la excusa).
create or replace function public.acceso_excusar(p_codigo text, p_ejemplar uuid, p_excusa text)
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
    raise exception 'Solo la mesa técnica excusa';
  end if;
  select * into e from public.juzgamiento_ejemplares where id = p_ejemplar;
  j := public.acceso_clase(a, e.juzgamiento_id);
  if j.fase not in ('formato_a', 'individual', 'votacion') then
    raise exception 'En esta fase no se excusa';
  end if;
  update public.juzgamiento_ejemplares
  set excusa = nullif(p_excusa, ''),
      excusa_fase = case when nullif(p_excusa, '') is null then null
                         when j.fase = 'formato_a' then 'formato_a' else 'final' end,
      escogido = case when nullif(p_excusa, '') is null then escogido else false end
  where id = p_ejemplar;
  if nullif(p_excusa, '') is not null and e.numero is not null then
    delete from public.juzgamiento_votos where juzgamiento_id = j.id and ejemplar_numero = e.numero;
  end if;
end;
$$;

-- Mesa técnica: abre la fase siguiente de la clase.
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
  j := public.acceso_clase(a, p_clase);
  if j.fase = 'inscripcion' then
    raise exception 'La inscripción no se ha cerrado';
  end if;
  if p_fase not in ('prepista', 'formato_a', 'individual', 'votacion', 'cerrada') then
    raise exception 'Fase no válida';
  end if;
  update public.juzgamientos set fase = p_fase where id = j.id;
end;
$$;

revoke execute on function
  public.acceso_estado(text),
  public.acceso_asistencia(text, uuid, boolean),
  public.acceso_formato_a(text, uuid, integer, boolean),
  public.acceso_votar(text, uuid, text, integer),
  public.acceso_escoger(text, uuid, boolean),
  public.acceso_excusar(text, uuid, text),
  public.acceso_fase(text, uuid, text)
from public;

grant execute on function
  public.acceso_estado(text),
  public.acceso_asistencia(text, uuid, boolean),
  public.acceso_formato_a(text, uuid, integer, boolean),
  public.acceso_votar(text, uuid, text, integer),
  public.acceso_escoger(text, uuid, boolean),
  public.acceso_excusar(text, uuid, text),
  public.acceso_fase(text, uuid, text)
to anon, authenticated;
