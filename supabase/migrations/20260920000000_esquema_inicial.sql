-- ADOPASO — esquema inicial de estadísticas (importadas de los .xls históricos 1998-2016)
--
-- Roles:
--   admin    → lee y modifica todo (incluye datos personales de socios, criadores, montadores y jueces)
--   consulta → solo lectura de caballos, genealogía, participaciones, eventos y calendario
-- Un usuario nuevo se crea como (consulta, activo = false): no ve nada hasta que un admin lo active.
--
-- PRIMER ADMIN (se hace una sola vez, en el SQL Editor de Supabase, después de crear su usuario):
--   update public.perfiles set rol = 'admin', activo = true where email = 'correo@ejemplo.com';

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Perfiles y roles
-- ---------------------------------------------------------------------------
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  nombre text,
  rol text not null default 'consulta' check (rol in ('admin', 'consulta')),
  activo boolean not null default false,
  creado_en timestamptz not null default now()
);

create function public.rol_actual()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select rol from public.perfiles where id = auth.uid() and activo
$$;

create function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.rol_actual() = 'admin', false)
$$;

create function public.es_usuario()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.rol_actual() is not null
$$;

create function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

revoke execute on function public.rol_actual(), public.es_admin(), public.es_usuario(), public.crear_perfil()
  from public, anon;
grant execute on function public.rol_actual(), public.es_admin(), public.es_usuario() to authenticated;

-- ---------------------------------------------------------------------------
-- Personas (contienen datos personales → solo admin)
-- El código original NO es único: hay personas distintas con el mismo código.
-- ---------------------------------------------------------------------------
create table public.socios (
  id bigint generated always as identity primary key,
  codigo integer not null,
  nombre text not null,
  tipo text,
  residencia text,
  oficina text,
  fax text,
  beeper text,
  secretaria text,
  celular text,
  email text,
  direccion text
);

create table public.criadores (
  id bigint generated always as identity primary key,
  codigo integer not null,
  nombre text not null,
  residencia text,
  oficina text,
  fax text,
  beeper text,
  secretaria text,
  celular text,
  email text,
  direccion text
);

create table public.montadores (
  id bigint generated always as identity primary key,
  codigo integer not null,
  nombre text not null,
  residencia text,
  oficina text,
  fax text,
  beeper text,
  secretaria text,
  celular text,
  email text,
  direccion text
);

create table public.jueces (
  id bigint generated always as identity primary key,
  codigo integer not null,
  nombre text not null,
  residencia text,
  oficina text,
  fax text,
  beeper text,
  secretaria text,
  celular text,
  email text,
  direccion text
);

-- ---------------------------------------------------------------------------
-- Competencias
-- ---------------------------------------------------------------------------
create table public.eventos (
  codigo integer primary key,
  nombre text not null,
  tiempo_desde integer,
  tiempo_hasta integer,
  tipo text,
  sexo text,
  fecha_inicio date,
  fecha_fin date,
  competidores integer,
  campeon text,
  participa text,
  puntos integer,
  tipo_pedigree integer,
  jinete text
);

create table public.programa (
  codigo integer primary key,
  fecha date,
  fecha_fin date,
  nombre text,
  circuito text,
  competencia text,
  ciudad text
);

-- ---------------------------------------------------------------------------
-- Caballos y genealogía (origen: pedegree.xls y padres.xls)
-- ---------------------------------------------------------------------------
create table public.caballos (
  codigo text primary key,
  registro_tipo text,
  categoria text,
  categoria_nombre text,
  fecha_registro date,
  fecha_nacimiento date,
  fecha_muerte date,
  nombre text not null,
  sexo text,
  color text,
  lugar_nacimiento text,
  senas text,
  sangre text,
  adn text,
  microchip text,
  codigo_asociacion text,
  padre_codigo text,
  padre text,
  madre_codigo text,
  madre text,
  -- Abuelos y bisabuelos tal como vienen del original: { campo_original: { codigo, nombre } }
  ancestros jsonb,
  expositor_codigo integer,
  expositor text,
  criador_codigo integer,
  criador text,
  pais text,
  raza text,
  asociacion_codigo integer,
  asociacion text,
  asociacion_abrev text,
  autorizado boolean,
  registrado_en date
);

create table public.descendencia (
  id bigint generated always as identity primary key,
  codigo text,
  nombre text,
  sexo_padre text,
  hijo_codigo text,
  hijo_nombre text,
  hijo_sexo text,
  parentesco text,
  registrado_en date
);

-- Un renglón por caballo, evento y día (origen: compete.xls). No usa llaves foráneas porque
-- el histórico tiene códigos huérfanos: se guardan el código y el nombre originales.
create table public.participaciones (
  id bigint primary key,
  fecha date not null,
  registro_tipo text,
  caballo_codigo text,
  caballo_nombre text,
  sexo text,
  fecha_nacimiento date,
  color text,
  padre text,
  madre text,
  expositor_codigo integer,
  expositor text,
  criador_codigo integer,
  criador text,
  asociado_codigo integer,
  asociado text,
  montador_codigo integer,
  montador text,
  juez_codigo integer,
  juez text,
  evento_codigo integer,
  lugar text,
  categoria_tipo integer,
  categoria_nombre text,
  tipo_pedigree integer,
  asignado integer,
  puesto integer,
  puntos integer,
  puntos_propietario integer,
  puntos_criador integer,
  puntos_montador integer,
  campeon boolean not null default false,
  campeones text,
  asociacion text,
  numero_competidor integer,
  hora text
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index on public.caballos using gin (nombre extensions.gin_trgm_ops);
create index on public.caballos (padre_codigo);
create index on public.caballos (madre_codigo);
create index on public.participaciones (caballo_codigo);
create index on public.participaciones (fecha);
create index on public.participaciones (evento_codigo);
create index on public.descendencia (codigo);
create index on public.descendencia (hijo_codigo);
create index on public.socios using gin (nombre extensions.gin_trgm_ops);
create index on public.socios (codigo);
create index on public.criadores (codigo);
create index on public.montadores (codigo);
create index on public.jueces (codigo);

-- ---------------------------------------------------------------------------
-- Seguridad a nivel de fila
-- ---------------------------------------------------------------------------
alter table public.perfiles enable row level security;

create policy perfiles_ver on public.perfiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.es_admin()));
create policy perfiles_editar on public.perfiles
  for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy perfiles_borrar on public.perfiles
  for delete to authenticated
  using ((select public.es_admin()));

do $$
declare
  t text;
begin
  -- Lectura para admin y consulta; escritura solo admin
  foreach t in array array['caballos', 'descendencia', 'participaciones', 'eventos', 'programa'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.es_usuario()))', t || '_leer', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.es_admin()))', t || '_insertar', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()))', t || '_actualizar', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.es_admin()))', t || '_borrar', t);
  end loop;

  -- Datos personales: todo solo admin
  foreach t in array array['socios', 'criadores', 'montadores', 'jueces'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using ((select public.es_admin())) with check ((select public.es_admin()))', t || '_admin', t);
  end loop;
end $$;

-- Sin sesión no se ve nada
revoke all on all tables in schema public from anon;
