#!/usr/bin/env python3
"""Importa los Excel de "Todas las estadísticas" a Supabase (Postgres).

Requisitos:  pip install pandas xlrd psycopg2-binary

Uso:
  python3 scripts/importar_estadisticas.py --verificar
      Lee y limpia los Excel, compara columnas con la migración y muestra el informe.
      No necesita base de datos.
  SUPABASE_DB_URL='postgresql://...' python3 scripts/importar_estadisticas.py --aplicar
      Carga los datos. Se niega a correr si las tablas ya tienen filas (para no pisar
      cambios hechos desde el módulo admin), salvo que se use --reemplazar.
  SUPABASE_DB_URL='postgresql://...' python3 scripts/importar_estadisticas.py --agregar
      Solo agrega las participaciones que faltan (por número); no borra ni cambia nada.

SUPABASE_DB_URL es la cadena de conexión de Postgres (Project Settings → Database), nunca
va al repositorio ni al código del sitio.
"""
from __future__ import annotations

import argparse
import math
import os
import re
import sys
from datetime import date, datetime
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
CARPETA = RAIZ / "Todas las estadísticas"
MIGRACION = RAIZ / "supabase" / "migrations" / "20260920000000_esquema_inicial.sql"

# Cadenas dañadas por la codificación antigua (CP437 leído como Latin-1).
REEMPLAZOS = {"¥": "Ñ", "¤": "ñ", "ï": "'"}  # ï = apóstrofo dañado (D'ARQUERIA)
SOSPECHOSOS = "µ€Ï"  # se cuentan en el informe, no se corrigen a ciegas
VACIO = re.compile(r"^[\s\-/]*$")


# --- Conversores -----------------------------------------------------------
def nulo(v) -> bool:
    return v is None or (isinstance(v, float) and math.isnan(v)) or v is pd.NaT


def txt(v):
    if nulo(v):
        return None
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    s = str(v)
    for malo, bueno in REEMPLAZOS.items():
        s = s.replace(malo, bueno)
    s = s.strip()
    return None if VACIO.match(s) else s


def ent(v):
    if nulo(v):
        return None
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def fecha(v):
    if nulo(v):
        return None
    if isinstance(v, (datetime, pd.Timestamp)):
        return v.date()
    if isinstance(v, date):
        return v
    s = txt(v)
    if s is None:
        return None
    try:
        return pd.to_datetime(s).date()
    except (ValueError, TypeError):
        return None


def marca_x(v):
    return (txt(v) or "").upper() == "X"


def booleano(v):
    return None if nulo(v) else bool(v)


# --- Definición de tablas: (destino, columna_origen, conversor) --------------
PERSONA = [
    ("codigo", "codigo", ent), ("nombre", "nombre", txt),
    ("residencia", "residencia", txt), ("oficina", "oficina", txt), ("fax", "fax", txt),
    ("beeper", "beeper", txt), ("secretaria", "secretaria", txt), ("celular", "celular", txt),
    ("email", "email", txt), ("direccion", "direccion", txt),
]

# Abuelos y bisabuelos: (campo_código, campo_nombre) tal como vienen en pedegree.xls
ANCESTROS = [
    ("copabuelo", "nopabuelo"), ("copapbiso", "nopapbiso"), ("copambisa", "nopambisa"),
    ("copabuela", "nopabuela"), ("copmabiso", "nopmabiso"), ("copmabisa", "nopmabisa"),
    ("compabuelo", "nompabuelo"), ("compabiso", "nompabiso"), ("compabisa", "nompabisa"),
    ("commabuela", "nommabuela"), ("commabiso", "nommabiso"), ("commabisa", "nommabisa"),
]

TABLAS = {
    "socios": ("socios.xls", PERSONA[:2] + [("tipo", "socio", txt)] + PERSONA[2:]),
    "criadores": ("criador.xls", PERSONA),
    "montadores": ("montar.xls", PERSONA),
    "jueces": ("jueces.xls", PERSONA),
    "eventos": ("eventos.xls", [
        ("codigo", "codigo", ent), ("nombre", "nombre", txt), ("tiempo_desde", "tiempo1", ent),
        ("tiempo_hasta", "tiempo2", ent), ("tipo", "tipo", txt), ("sexo", "sexo", txt),
        ("fecha_inicio", "fechaini", fecha), ("fecha_fin", "fechafin", fecha),
        ("competidores", "compite", ent), ("campeon", "campeon", txt), ("participa", "participa", txt),
        ("puntos", "punto", ent), ("tipo_pedigree", "tipoped", ent), ("jinete", "jinete", txt),
    ]),
    "programa": ("programa.xls", [
        ("codigo", "codigo", ent), ("fecha", "fecha", fecha), ("fecha_fin", "fecha1", fecha),
        ("nombre", "nombre", txt), ("circuito", "circuito", txt), ("competencia", "compete", txt),
        ("ciudad", "ciudad", txt),
    ]),
    "caballos": ("pedegree.xls", [
        ("codigo", "codigo", txt), ("registro_tipo", "tipo", txt), ("categoria", "categoria", txt),
        ("categoria_nombre", "nocatego", txt), ("fecha_registro", "fecha", fecha),
        ("fecha_nacimiento", "fechanac", fecha), ("fecha_muerte", "fechamue", fecha),
        ("nombre", "nombre", txt), ("sexo", "sexo", txt), ("color", "colores", txt),
        ("lugar_nacimiento", "lugarnac", txt), ("senas", "senas", txt), ("sangre", "sangre", txt),
        ("adn", "adn", txt), ("microchip", "microchip", txt), ("codigo_asociacion", "codigoaso", txt),
        ("padre_codigo", "copadre", txt), ("padre", "nompadre", txt),
        ("madre_codigo", "comadre", txt), ("madre", "nommadre", txt),
        ("ancestros", None, None),  # se arma aparte
        ("expositor_codigo", "expositor", ent), ("expositor", "noexposito", txt),
        ("criador_codigo", "cocriador", ent), ("criador", "nocriador", txt),
        ("pais", "nompais", txt), ("raza", "nomoda", txt),
        ("asociacion_codigo", "coasocia", ent), ("asociacion", "noasocia", txt),
        ("asociacion_abrev", "abrevia", txt), ("autorizado", "autori", booleano),
        ("registrado_en", "realizado", fecha),
    ]),
    "descendencia": ("padres.xls", [
        ("codigo", "codigo", txt), ("nombre", "nombre", txt), ("sexo_padre", "sexopadre", txt),
        ("hijo_codigo", "codigohijo", txt), ("hijo_nombre", "nomhijo", txt),
        ("hijo_sexo", "sexohijo", txt), ("parentesco", "pariente", txt),
        ("registrado_en", "realizado", fecha),
    ]),
    "participaciones": ("competef.xlsx", [  # compete.xls viene cortado en 16,383 filas (2016)
        ("id", "numeros", ent), ("fecha", "fecha", fecha), ("registro_tipo", "tipo", txt),
        ("caballo_codigo", "codigo", txt), ("caballo_nombre", "nombre", txt), ("sexo", "sexo", txt),
        ("fecha_nacimiento", "fechanac", fecha), ("color", "colores", txt),
        ("padre", "nompadre", txt), ("madre", "nommadre", txt),
        ("expositor_codigo", "expositor", ent), ("expositor", "noexposito", txt),
        ("criador_codigo", "cocriador", ent), ("criador", "nocriador", txt),
        ("asociado_codigo", "coasocia", ent), ("asociado", "noasocia", txt),
        ("montador_codigo", "comontador", ent), ("montador", "nomontador", txt),
        ("juez_codigo", "codigoin", ent), ("juez", "nombrein", txt),
        ("evento_codigo", "compite", ent), ("lugar", "lugar", txt),
        ("categoria_tipo", "tipos", ent), ("categoria_nombre", "nombretip", txt),
        ("tipo_pedigree", "tipoped", ent), ("asignado", "asignado", ent), ("puesto", "gana", ent),
        ("puntos", "puntos", ent), ("puntos_propietario", "ppropie", ent),
        ("puntos_criador", "pcriador", ent), ("puntos_montador", "pmontador", ent),
        ("campeon", "campeon", marca_x), ("campeones", "campeones", txt),
        ("asociacion", "abrevia", txt), ("numero_competidor", "numero", ent), ("hora", "hora", txt),
    ]),
}
ORDEN_CARGA = ["socios", "criadores", "montadores", "jueces", "eventos", "programa",
               "caballos", "descendencia", "participaciones"]


# --- Transformación ---------------------------------------------------------
def construir(tabla: str):
    archivo, columnas = TABLAS[tabla]
    df = pd.read_excel(CARPETA / archivo)
    if tabla == "participaciones":
        # competef.xlsx trae ~110 filas en blanco (numeros=0)
        df = df[df["numeros"] != 0]
    filas = []
    for reg in df.to_dict("records"):
        fila = []
        for destino, origen, conv in columnas:
            if destino == "ancestros":
                antepasados = {
                    cc: {"codigo": txt(reg.get(cc)), "nombre": txt(reg.get(nn))}
                    for cc, nn in ANCESTROS
                    if txt(reg.get(cc)) or txt(reg.get(nn))
                }
                fila.append(antepasados or None)
            else:
                fila.append(conv(reg.get(origen)))
        # El histórico tiene 1 caballo (G-000235) sin nombre; la tabla lo exige.
        if tabla == "caballos":
            destinos = [c[0] for c in columnas]
            i_nom, i_cod = destinos.index("nombre"), destinos.index("codigo")
            if fila[i_nom] is None and fila[i_cod]:
                fila[i_nom] = fila[i_cod]
        filas.append(tuple(fila))
    return df, [c[0] for c in columnas], filas


def columnas_migracion() -> dict[str, list[str]]:
    sql = MIGRACION.read_text()
    tablas = {}
    for m in re.finditer(r"create table public\.(\w+) \((.*?)\n\);", sql, re.S):
        cols = []
        for linea in m.group(2).splitlines():
            linea = linea.strip()
            if not linea or linea.startswith("--"):
                continue
            nombre = linea.split()[0]
            if nombre not in ("primary", "constraint", "unique", "foreign", "check"):
                cols.append(nombre)
        tablas[m.group(1)] = cols
    return tablas


def transformar():
    resultado = {}
    for tabla in ORDEN_CARGA:
        resultado[tabla] = construir(tabla)
    return resultado


def informe(datos) -> list[str]:
    out, problemas = [], []
    migracion = columnas_migracion()
    for tabla in ORDEN_CARGA:
        df, cols, filas = datos[tabla]
        # "id" es autogenerado salvo en participaciones, donde se conserva el número original
        esperadas = [c for c in migracion.get(tabla, []) if c != "id" or tabla == "participaciones"]
        if set(esperadas) != set(cols):
            problemas.append(
                f"columnas distintas en {tabla}: falta en script {sorted(set(esperadas) - set(cols))}, "
                f"sobra {sorted(set(cols) - set(esperadas))}"
            )
        out.append(f"{tabla:16} leídas {len(df):>6}  a cargar {len(filas):>6}")

    ids = {"caballos": {f[0] for f in datos["caballos"][2]}}
    huerf_part = {f[3] for f in datos["participaciones"][2] if f[3] and f[3] not in ids["caballos"]}
    n_part = sum(1 for f in datos["participaciones"][2] if f[3] and f[3] not in ids["caballos"])
    huerf_hijo = sum(1 for f in datos["descendencia"][2] if f[3] and f[3] not in ids["caballos"])
    eventos = {f[0] for f in datos["eventos"][2]}
    sin_evento = sum(1 for f in datos["participaciones"][2] if f[20] is not None and f[20] not in eventos)
    out += ["", "Cruces:",
            f"  participaciones con caballo que no está en el registro: {n_part} ({len(huerf_part)} caballos distintos)",
            f"  participaciones con evento inexistente: {sin_evento}",
            f"  descendencia con hijo fuera del registro: {huerf_hijo}"]

    out += ["", "Códigos repetidos (personas distintas con el mismo código):"]
    for t in ("socios", "criadores", "montadores", "jueces"):
        cods = pd.Series([f[0] for f in datos[t][2]])
        out.append(f"  {t}: {int(cods.duplicated().sum())} filas con código ya usado")

    out += ["", "Caracteres sospechosos que quedaron sin corregir (revisar):"]
    for tabla in ORDEN_CARGA:
        conteo = {}
        for fila in datos[tabla][2]:
            for v in fila:
                if isinstance(v, str):
                    for ch in SOSPECHOSOS:
                        if ch in v:
                            conteo[ch] = conteo.get(ch, 0) + v.count(ch)
        if conteo:
            out.append(f"  {tabla}: {conteo}")
    if problemas:
        out += ["", "PROBLEMAS:"] + [f"  {p}" for p in problemas]
    return out, problemas


# --- Carga ------------------------------------------------------------------
def aplicar(datos, reemplazar: bool):
    import psycopg2
    from psycopg2.extras import Json, execute_values

    url = os.environ.get("SUPABASE_DB_URL")
    if not url:
        sys.exit("Falta la variable SUPABASE_DB_URL (cadena de conexión de Postgres).")
    with psycopg2.connect(url) as con, con.cursor() as cur:
        cur.execute("select to_regclass('public.caballos')")
        if cur.fetchone()[0] is None:
            sys.exit("No existe el esquema. Corra primero la migración en Supabase.")
        con_datos = []
        for t in ORDEN_CARGA:
            cur.execute(f"select count(*) from public.{t}")
            if cur.fetchone()[0]:
                con_datos.append(t)
        if con_datos and not reemplazar:
            sys.exit(f"Ya hay datos en {con_datos}. Use --reemplazar solo si quiere borrarlos y recargar.")
        if con_datos:
            cur.execute("truncate " + ", ".join(f"public.{t}" for t in ORDEN_CARGA) + " restart identity")
        for t in ORDEN_CARGA:
            _, cols, filas = datos[t]
            filas = [tuple(Json(v) if isinstance(v, dict) else v for v in f) for f in filas]
            execute_values(
                cur,
                f"insert into public.{t} ({', '.join(cols)}) values %s",
                filas,
                page_size=2000,
            )
            print(f"  {t}: {len(filas)} filas cargadas")
        # Todo o nada: si algo falla, la transacción se revierte al salir del bloque.
        for t in ORDEN_CARGA:
            cur.execute(f"select count(*) from public.{t}")
            if cur.fetchone()[0] != len(datos[t][2]):
                raise RuntimeError(f"El conteo de {t} no coincide; se revierte la carga.")
    print("Carga completa y verificada.")


def agregar_participaciones(datos):
    """Inserta solo las participaciones cuyo número todavía no está en la base; no toca lo demás."""
    import psycopg2
    from psycopg2.extras import execute_values

    url = os.environ.get("SUPABASE_DB_URL")
    if not url:
        sys.exit("Falta la variable SUPABASE_DB_URL (cadena de conexión de Postgres).")
    _, cols, filas = datos["participaciones"]
    with psycopg2.connect(url) as con, con.cursor() as cur:
        cur.execute("select count(*), max(fecha) from public.participaciones")
        antes, ultima = cur.fetchone()
        execute_values(
            cur,
            f"insert into public.participaciones ({', '.join(cols)}) values %s on conflict (id) do nothing",
            filas,
            page_size=2000,
        )
        cur.execute("select count(*), max(fecha) from public.participaciones")
        despues, nueva = cur.fetchone()
    print(f"  participaciones: {antes} → {despues} (+{despues - antes}); última fecha {ultima} → {nueva}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--verificar", action="store_true")
    g.add_argument("--aplicar", action="store_true")
    g.add_argument("--agregar", action="store_true", help="solo agrega participaciones nuevas")
    ap.add_argument("--reemplazar", action="store_true")
    args = ap.parse_args()

    datos = transformar()
    lineas, problemas = informe(datos)
    print("\n".join(lineas))
    if args.aplicar:
        if problemas:
            sys.exit("Corrija los problemas antes de cargar.")
        aplicar(datos, args.reemplazar)
    if args.agregar:
        if problemas:
            sys.exit("Corrija los problemas antes de cargar.")
        agregar_participaciones(datos)


if __name__ == "__main__":
    main()
