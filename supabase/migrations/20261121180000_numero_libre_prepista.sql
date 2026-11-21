-- Numeración flexible en pre-pista: la pre-pista (o la mesa) le pone a cada ejemplar el número físico
-- que tenga disponible en ese momento, uno por uno, sin orden de edad.
--
-- * acceso_numero_ejemplar: pone p_numero al ejemplar p_ejemplar. Si otro ejemplar de la misma
--   categoría ya tenía ese número, se intercambian (el otro se queda con el número anterior de este,
--   o sin número si este no tenía). Solo en fase pre-pista y antes de que los jueces marquen.
-- * acceso_asignar_numeros (reparto por edad) se queda igual, por compatibilidad.

create or replace function public.acceso_numero_ejemplar(p_codigo text, p_clase uuid, p_ejemplar uuid, p_numero integer)
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

  -- (juzgamiento_id, numero) es único: se libera primero el número de este ejemplar.
  update public.juzgamiento_ejemplares set numero = null where id = e.id;
  if otro is not null then
    update public.juzgamiento_ejemplares set numero = e.numero where id = otro;
  end if;
  update public.juzgamiento_ejemplares set numero = p_numero where id = e.id;
end;
$$;

revoke execute on function public.acceso_numero_ejemplar(text, uuid, uuid, integer) from public;
grant execute on function public.acceso_numero_ejemplar(text, uuid, uuid, integer) to anon, authenticated;
