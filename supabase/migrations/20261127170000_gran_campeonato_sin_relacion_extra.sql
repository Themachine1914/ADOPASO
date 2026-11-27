-- La clave origen_clase apuntaba a juzgamientos y PostgREST ya no sabía
-- cuál relación usar al cargar los inscritos. Se queda la columna, sin esa clave.
alter table public.juzgamiento_ejemplares
  drop constraint if exists juzgamiento_ejemplares_origen_clase_fkey;

create or replace function public.quitar_clasificados_de_clase()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.juzgamiento_ejemplares where origen_clase = old.id;
  return old;
end;
$$;

revoke all on function public.quitar_clasificados_de_clase() from public, anon, authenticated;

drop trigger if exists quitar_clasificados_al_borrar_clase on public.juzgamientos;
create trigger quitar_clasificados_al_borrar_clase
  after delete on public.juzgamientos
  for each row execute function public.quitar_clasificados_de_clase();

notify pgrst, 'reload schema';
