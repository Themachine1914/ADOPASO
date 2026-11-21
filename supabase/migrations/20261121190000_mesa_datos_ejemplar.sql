-- La mesa técnica (y la pre-pista) ven todos los datos del ejemplar, como en el
-- «Formulario Dirección de Eventos»: registro, asociación, ADN, microchip, padre, madre,
-- abuelo materno, criador, propietario y montador. Los jueces siguen viendo solo números.
-- Es la misma acceso_estado de 20261121160000 con esos campos de más.

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
