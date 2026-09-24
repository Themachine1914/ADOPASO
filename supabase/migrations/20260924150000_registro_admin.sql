-- Registro desde el módulo admin: tabla de asociaciones y genealogía automática de un caballo nuevo.

-- ---------------------------------------------------------------------------
-- Asociaciones (antes solo existían como texto repetido en cada caballo)
-- ---------------------------------------------------------------------------
create table public.asociaciones (
  codigo integer primary key,
  nombre text not null,
  abreviatura text,
  pais text
);

-- Semilla: por cada código, el nombre y la abreviatura más usados en el registro.
insert into public.asociaciones (codigo, nombre, abreviatura)
select distinct on (asociacion_codigo)
  asociacion_codigo,
  asociacion,
  nullif(trim(asociacion_abrev), '')
from (
  select asociacion_codigo, trim(asociacion) as asociacion, asociacion_abrev, count(*) as n
  from public.caballos
  where asociacion_codigo > 0 and nullif(trim(asociacion), '') is not null
  group by 1, 2, 3
) t
order by asociacion_codigo, n desc;

alter table public.asociaciones enable row level security;
create policy asociaciones_leer on public.asociaciones for select to authenticated
  using ((select public.es_usuario()));
create policy asociaciones_insertar on public.asociaciones for insert to authenticated
  with check ((select public.es_admin()));
create policy asociaciones_actualizar on public.asociaciones for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy asociaciones_borrar on public.asociaciones for delete to authenticated
  using ((select public.es_admin()));
grant select, insert, update, delete on public.asociaciones to authenticated;

-- ---------------------------------------------------------------------------
-- Genealogía de un caballo a partir de su padre y su madre
-- ---------------------------------------------------------------------------
-- Completa nombres de padre/madre, arma abuelos y bisabuelos desde el registro de los padres
-- (igual que el libro: abuelos = padres de los padres, bisabuelos = abuelos de los padres)
-- y rehace sus filas en «descendencia». Corre con los permisos de quien llama: solo un admin
-- puede escribir en caballos y descendencia.
create or replace function public.registrar_genealogia(p_codigo text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  x public.caballos%rowtype;
  p public.caballos%rowtype;
  m public.caballos%rowtype;
  anc jsonb := '{}'::jsonb;
  sufijo text;
  fila record;
begin
  if not (select public.es_admin()) then
    raise exception 'Solo un administrador puede registrar genealogía';
  end if;

  select * into x from public.caballos where codigo = p_codigo;
  if not found then
    raise exception 'No existe el caballo %', p_codigo;
  end if;

  select * into p from public.caballos where codigo = nullif(trim(x.padre_codigo), '');
  select * into m from public.caballos where codigo = nullif(trim(x.madre_codigo), '');

  if p.codigo is not null then
    anc := anc
      || jsonb_build_object('copabuelo', jsonb_build_object('codigo', p.padre_codigo, 'nombre', p.padre))
      || jsonb_build_object('copabuela', jsonb_build_object('codigo', p.madre_codigo, 'nombre', p.madre))
      || jsonb_build_object('copapbiso', coalesce(p.ancestros -> 'copabuelo', 'null'::jsonb))
      || jsonb_build_object('copambisa', coalesce(p.ancestros -> 'copabuela', 'null'::jsonb))
      || jsonb_build_object('copmabiso', coalesce(p.ancestros -> 'compabuelo', 'null'::jsonb))
      || jsonb_build_object('copmabisa', coalesce(p.ancestros -> 'commabuela', 'null'::jsonb));
  end if;
  if m.codigo is not null then
    anc := anc
      || jsonb_build_object('compabuelo', jsonb_build_object('codigo', m.padre_codigo, 'nombre', m.padre))
      || jsonb_build_object('commabuela', jsonb_build_object('codigo', m.madre_codigo, 'nombre', m.madre))
      || jsonb_build_object('compabiso', coalesce(m.ancestros -> 'copabuelo', 'null'::jsonb))
      || jsonb_build_object('compabisa', coalesce(m.ancestros -> 'copabuela', 'null'::jsonb))
      || jsonb_build_object('commabiso', coalesce(m.ancestros -> 'compabuelo', 'null'::jsonb))
      || jsonb_build_object('commabisa', coalesce(m.ancestros -> 'commabuela', 'null'::jsonb));
  end if;
  -- Quita posiciones vacías
  anc := coalesce((
    select jsonb_object_agg(k, v) from jsonb_each(anc) as e(k, v)
    where jsonb_typeof(v) = 'object' and (nullif(v ->> 'codigo', '') is not null or nullif(v ->> 'nombre', '') is not null)
  ), '{}'::jsonb);

  update public.caballos
  set padre = coalesce(p.nombre, x.padre),
      madre = coalesce(m.nombre, x.madre),
      ancestros = case when anc = '{}'::jsonb then x.ancestros else anc end
  where codigo = x.codigo
  returning * into x;

  -- Descendencia: una fila por antepasado con código (hijo/a, nieto/a, biznieto/a)
  delete from public.descendencia where hijo_codigo = x.codigo;
  sufijo := case when x.sexo = 'H' then 'A' else 'O' end;
  for fila in
    select * from (values
      (x.padre_codigo, x.padre, 'M', 'HIJ'),
      (x.madre_codigo, x.madre, 'H', 'HIJ'),
      (x.ancestros -> 'copabuelo' ->> 'codigo', x.ancestros -> 'copabuelo' ->> 'nombre', 'M', 'NIET'),
      (x.ancestros -> 'copabuela' ->> 'codigo', x.ancestros -> 'copabuela' ->> 'nombre', 'H', 'NIET'),
      (x.ancestros -> 'compabuelo' ->> 'codigo', x.ancestros -> 'compabuelo' ->> 'nombre', 'M', 'NIET'),
      (x.ancestros -> 'commabuela' ->> 'codigo', x.ancestros -> 'commabuela' ->> 'nombre', 'H', 'NIET'),
      (x.ancestros -> 'copapbiso' ->> 'codigo', x.ancestros -> 'copapbiso' ->> 'nombre', 'M', 'BIZNIET'),
      (x.ancestros -> 'copambisa' ->> 'codigo', x.ancestros -> 'copambisa' ->> 'nombre', 'H', 'BIZNIET'),
      (x.ancestros -> 'copmabiso' ->> 'codigo', x.ancestros -> 'copmabiso' ->> 'nombre', 'M', 'BIZNIET'),
      (x.ancestros -> 'copmabisa' ->> 'codigo', x.ancestros -> 'copmabisa' ->> 'nombre', 'H', 'BIZNIET'),
      (x.ancestros -> 'compabiso' ->> 'codigo', x.ancestros -> 'compabiso' ->> 'nombre', 'M', 'BIZNIET'),
      (x.ancestros -> 'compabisa' ->> 'codigo', x.ancestros -> 'compabisa' ->> 'nombre', 'H', 'BIZNIET'),
      (x.ancestros -> 'commabiso' ->> 'codigo', x.ancestros -> 'commabiso' ->> 'nombre', 'M', 'BIZNIET'),
      (x.ancestros -> 'commabisa' ->> 'codigo', x.ancestros -> 'commabisa' ->> 'nombre', 'H', 'BIZNIET')
    ) as v(codigo, nombre, sexo, raiz)
    where nullif(trim(v.codigo), '') is not null
  loop
    insert into public.descendencia (codigo, nombre, sexo_padre, hijo_codigo, hijo_nombre, hijo_sexo, parentesco, registrado_en)
    values (fila.codigo, fila.nombre, fila.sexo, x.codigo, x.nombre, x.sexo, fila.raiz || sufijo, current_date);
  end loop;
end
$$;

revoke all on function public.registrar_genealogia(text) from public, anon;
grant execute on function public.registrar_genealogia(text) to authenticated;
