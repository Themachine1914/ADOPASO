-- La ficha pública sigue el certificado de entrada y la genealogía de cuatro generaciones.
-- Las columnas nuevas van al final: create or replace view no permite reordenar las existentes.

create or replace view public.caballo_publico
with (security_invoker = false, security_barrier = true) as
select
  codigo,
  nombre,
  sexo,
  color,
  fecha_nacimiento,
  lugar_nacimiento,
  padre,
  madre,
  expositor,
  criador,
  categoria_nombre,
  padre_codigo,
  madre_codigo,
  senas,
  adn,
  microchip,
  raza,
  fecha_registro,
  ancestros
from public.caballos;

grant select on public.caballo_publico to anon, authenticated;
