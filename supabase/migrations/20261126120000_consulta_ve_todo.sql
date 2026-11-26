-- El rol "consulta" ve todo y no cambia nada.
--
-- Solo se agregan políticas de LECTURA (for select) para cualquier usuario activo (es_usuario()).
-- Las políticas de escritura existentes (for all … es_admin()) no se tocan: las políticas permisivas
-- se suman por comando, así que insertar, actualizar y borrar siguen siendo solo del administrador.
--
-- competencia_accesos NO se abre: guarda los códigos de jueces, pre-pista y mesa técnica, y con un
-- código se puede votar y numerar desde /pista. Esa tabla sigue siendo solo del administrador.

do $$
declare
  t text;
begin
  foreach t in array array[
    'socios', 'criadores', 'montadores', 'jueces',
    'competencias',
    'juzgamientos', 'juzgamiento_ejemplares', 'juzgamiento_jueces', 'juzgamiento_votos',
    'juzgamiento_formato_a', 'juzgamiento_finalizados', 'juzgamiento_excusas_votos'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_leer_usuarios', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select public.es_usuario()))',
      t || '_leer_usuarios', t
    );
  end loop;
end $$;

-- Lista de usuarios: cualquier usuario activo la puede ver; solo el administrador la cambia.
drop policy if exists perfiles_ver_usuarios on public.perfiles;
create policy perfiles_ver_usuarios on public.perfiles
  for select to authenticated using ((select public.es_usuario()));
