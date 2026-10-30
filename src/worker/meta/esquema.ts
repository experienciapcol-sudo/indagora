// Cada salida estructurada se define una sola vez con Zod. De ahí sale el JSON Schema
// estricto que va a la API y el validador que revisa la respuesta.
import { z } from 'zod';

export interface Salida<T> {
  nombre: string;
  zod: z.ZodType<T>;
  jsonSchema: Record<string, unknown>;
}

export function definirSalida<T>(nombre: string, esquema: z.ZodType<T>): Salida<T> {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(nombre)) throw new Error(`Nombre de salida inválido: ${nombre}`);
  // `io: 'input'`: el esquema describe lo que produce la API, antes de cualquier transformación de Zod.
  // `reused: 'ref'`: un esquema usado dos veces va una sola vez en $defs (cuida el límite de valores de enum).
  const js = z.toJSONSchema(esquema, { target: 'draft-2020-12', io: 'input', reused: 'ref' }) as Record<string, unknown>;
  delete js.$schema;
  return { nombre, zod: esquema, jsonSchema: aEstricto(js, '') };
}

type Nodo = Record<string, unknown>;
const esNodo = (v: unknown): v is Nodo => typeof v === 'object' && v !== null && !Array.isArray(v);

// Modo estricto: todo objeto cierra sus propiedades y las declara todas requeridas.
// Un campo opcional no cabe; se expresa con `.nullable()`.
function aEstricto(nodo: Nodo, ruta: string): Nodo {
  const salida: Nodo = { ...nodo };
  if (esNodo(nodo.properties)) {
    const requeridas = new Set(Array.isArray(nodo.required) ? (nodo.required as string[]) : []);
    const props: Nodo = {};
    for (const [clave, valor] of Object.entries(nodo.properties)) {
      if (!requeridas.has(clave)) throw new Error(`"${ruta}${clave}" es opcional; en salida estricta usa .nullable()`);
      props[clave] = esNodo(valor) ? aEstricto(valor, `${ruta}${clave}.`) : valor;
    }
    salida.properties = props;
    salida.required = Object.keys(props);
    salida.additionalProperties = false;
  } else if (nodo.type === 'object' && nodo.additionalProperties !== false) {
    throw new Error(`"${ruta || 'raíz'}" es un objeto sin propiedades fijas; la salida estricta no lo admite`);
  }
  for (const clave of ['items', 'not'] as const) {
    if (esNodo(nodo[clave])) salida[clave] = aEstricto(nodo[clave] as Nodo, `${ruta}[]`);
  }
  for (const clave of ['anyOf', 'oneOf', 'allOf', 'prefixItems'] as const) {
    if (Array.isArray(nodo[clave])) salida[clave] = (nodo[clave] as unknown[]).map((v) => (esNodo(v) ? aEstricto(v, ruta) : v));
  }
  for (const clave of ['$defs', 'definitions'] as const) {
    if (esNodo(nodo[clave])) {
      salida[clave] = Object.fromEntries(
        Object.entries(nodo[clave] as Nodo).map(([k, v]) => [k, esNodo(v) ? aEstricto(v, `${k}.`) : v]),
      );
    }
  }
  return salida;
}

// Enum de ids reales para los punteros del modelo. Un enum no puede ir vacío: con `relleno`,
// si no hay ids va ese valor, y el código que recibe la salida lo descarta.
export const enumDe = (ids: readonly string[], relleno?: string) =>
  z.enum((ids.length > 0 || relleno === undefined ? [...ids] : [relleno]) as [string, ...string[]]);
