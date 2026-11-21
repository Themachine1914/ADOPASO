-- Jueces: la competencia decide si los puestos se llaman 1, 2, 3 o A, B, C, y el administrador puede
-- cambiar a la persona sentada en un puesto. El puesto (y sus votos) no cambia: cambia quién lo ocupa.

alter table public.competencias
  add column if not exists etiqueta_jueces text not null default 'numero'
  check (etiqueta_jueces in ('numero', 'letra'));

create or replace function public.reasignar_juez(p_competencia uuid, p_puesto integer, p_juez_codigo integer, p_nombre text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.es_admin()) then
    raise exception 'Solo un administrador cambia los jueces';
  end if;
  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'Falta el nombre del juez';
  end if;
  if exists (
    select 1 from public.competencia_accesos
    where competencia_id = p_competencia and rol = 'juez' and juez_puesto <> p_puesto
      and p_juez_codigo is not null and juez_codigo = p_juez_codigo
  ) then
    raise exception 'Ese juez ya está sentado en otro puesto de esta competencia';
  end if;
  update public.competencia_accesos
    set juez_codigo = p_juez_codigo, nombre = trim(p_nombre)
    where competencia_id = p_competencia and rol = 'juez' and juez_puesto = p_puesto;
  if not found then
    raise exception 'Ese puesto de juez no tiene código en esta competencia';
  end if;
  update public.juzgamiento_jueces jj
    set juez_codigo = p_juez_codigo, nombre = trim(p_nombre)
    from public.juzgamientos j
    where jj.juzgamiento_id = j.id and j.competencia_id = p_competencia and jj.puesto = p_puesto;
end;
$$;

revoke execute on function public.reasignar_juez(uuid, integer, integer, text) from public, anon;
grant execute on function public.reasignar_juez(uuid, integer, integer, text) to authenticated;

-- Estado: agrega etiquetaJueces a la competencia.
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
