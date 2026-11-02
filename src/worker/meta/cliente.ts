// Cliente de la Meta Model API (Chat Completions). Toda llamada del producto pasa por aquí:
// esfuerzo obligatorio, salida con esquema estricto, tope de gasto antes de salir, costo real
// al volver, un solo reintento y revisión de finish_reason.
import { ESFUERZOS, modeloPara, precioDe, type Esfuerzo, type PrecioTokens, type RolTexto, type VarsModelos } from '../../config/models';
import { cerrar, leerTopes, reservar, TopeAlcanzado, type VarsTopes } from '../gasto/gasto';
import type { Salida } from './esquema';

export interface VarsMeta extends VarsModelos, VarsTopes {
  META_API_KEY?: string;
  META_API_BASE_URL?: string;
  DEMO_MODE?: string;
}

export interface Dependencias {
  env: VarsMeta;
  db: D1Database;
  fetch?: typeof fetch;
  esperar?: (ms: number) => Promise<void>;
  timeoutMs?: number;
}

export interface Mensaje {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface Peticion<T> {
  sesion: string;
  proposito: string;
  rol: RolTexto;
  esfuerzo: Esfuerzo;
  mensajes: Mensaje[];
  salida: Salida<T>;
  maxTokens?: number;
  // Tope adicional por propósito (ver `reservar`), p. ej. el del Laboratorio público.
  subtope?: { prefijo: string; usd: number };
  promptCacheKey?: string;
  // Clave de grabación: en DEMO_MODE se reproduce; fuera de él, con `grabar`, se guarda.
  // `{ caso }`: se aparta para ese caso del agente y se publica solo si el caso termina bien.
  clave?: string;
  grabar?: boolean | { caso: string };
}

export interface Uso {
  entrada: number;
  cache: number;
  salida: number;
  razonamiento: number | null;
}

export interface Respuesta<T> {
  datos: T;
  modelo: string;
  costoUsd: number;
  uso: Uso | null;
  ms: number;
  intentos: number;
  demo: boolean;
}

export type TipoError = 'config' | 'red' | 'http' | 'truncada' | 'invalida' | 'demo';

export class ErrorMeta extends Error {
  constructor(
    message: string,
    readonly tipo: TipoError,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ErrorMeta';
  }
}

const MAX_TOKENS_POR_OMISION = 4000;
const TIMEOUT_POR_OMISION_MS = 60_000;
const ESPERA_REINTENTO_MS = 800;
const ESPERA_MAXIMA_MS = 5_000;

// Retry-After en segundos; null si pide esperar más que ESPERA_MAXIMA_MS.
export function esperaDe(retryAfter: string | null): number | null {
  // Segundos o fecha HTTP (ambas son válidas).
  const esFecha = retryAfter !== null && Number.isNaN(Number(retryAfter)) && !Number.isNaN(Date.parse(retryAfter));
  const segundos = retryAfter === null ? Number.NaN : esFecha ? (Date.parse(retryAfter) - Date.now()) / 1000 : Number(retryAfter);
  if (!Number.isFinite(segundos) || segundos < 0) return ESPERA_REINTENTO_MS;
  const ms = segundos * 1000;
  return ms > ESPERA_MAXIMA_MS ? null : Math.max(ESPERA_REINTENTO_MS, ms);
}

export async function llamarMeta<T>(deps: Dependencias, p: Peticion<T>): Promise<Respuesta<T>> {
  if (!ESFUERZOS.includes(p.esfuerzo)) throw new ErrorMeta(`Esfuerzo de razonamiento inválido: ${String(p.esfuerzo)}`, 'config');
  const modelo = modeloPara(deps.env, p.rol);
  if (deps.env.DEMO_MODE === 'true') return reproducir(deps.db, p, modelo);

  const llave = deps.env.META_API_KEY?.trim();
  const base = deps.env.META_API_BASE_URL?.trim().replace(/\/$/, '');
  if (!llave || !base) throw new ErrorMeta('Falta META_API_KEY o META_API_BASE_URL', 'config');
  const precio = precioDe(modelo);
  const topes = leerTopes(deps.env);
  const maxTokens = p.maxTokens ?? MAX_TOKENS_POR_OMISION;

  const cuerpo = JSON.stringify({
    model: modelo,
    reasoning_effort: p.esfuerzo,
    messages: p.mensajes,
    max_tokens: maxTokens,
    response_format: { type: 'json_schema', json_schema: { name: p.salida.nombre, strict: true, schema: p.salida.jsonSchema } },
    ...(p.promptCacheKey ? { prompt_cache_key: p.promptCacheKey } : {}),
  });
  const estimadoUsd = estimarCosto(precio, cuerpo.length, maxTokens);
  const intento = { deps, url: `${base}/chat/completions`, llave, cuerpo, precio, estimadoUsd, salida: p.salida };

  let ultimo: ErrorMeta | undefined;
  for (let n = 1; n <= 2; n++) {
    const id = crypto.randomUUID();
    // Si se alcanzó el tope, TopeAlcanzado sale de aquí sin llamar a la API. En el reintento
    // se informa el fallo original, que es lo que el usuario necesita saber.
    try {
      await reservar(deps.db, { id, sesion: p.sesion, modelo, proposito: p.proposito, estimadoUsd, subtope: p.subtope }, topes);
    } catch (e) {
      if (ultimo && e instanceof TopeAlcanzado) throw ultimo;
      throw e;
    }
    const r = await intentar(id, intento);
    if (r.ok) {
      // La grabación es de mejor esfuerzo: si D1 falla, la respuesta ya pagada no se pierde.
      if (p.grabar && p.clave) await grabar(deps.db, p.clave, modelo, r.datos, p.grabar === true ? null : p.grabar.caso).catch(() => undefined);
      return { datos: r.datos, modelo, costoUsd: r.costoUsd, uso: r.uso, ms: r.ms, intentos: n, demo: false };
    }
    ultimo = r.error;
    if (!r.reintentable) break;
    if (n === 1) await (deps.esperar ?? dormir)(r.esperaMs);
  }
  throw ultimo!;
}

type Intento<T> = {
  deps: Dependencias;
  url: string;
  llave: string;
  cuerpo: string;
  precio: PrecioTokens;
  estimadoUsd: number;
  salida: Salida<T>;
};

type Resultado<T> =
  | { ok: true; datos: T; uso: Uso | null; costoUsd: number; ms: number }
  | { ok: false; error: ErrorMeta; reintentable: boolean; esperaMs: number };

// Un intento siempre cierra su reserva, con el costo real o con 0 si la API no cobró.
async function intentar<T>(id: string, x: Intento<T>): Promise<Resultado<T>> {
  const { db } = x.deps;
  const inicio = Date.now();
  let res: Response;
  let texto: string;
  try {
    res = await (x.deps.fetch ?? fetch)(x.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${x.llave}`, 'Content-Type': 'application/json' },
      body: x.cuerpo,
      signal: AbortSignal.timeout(x.deps.timeoutMs ?? TIMEOUT_POR_OMISION_MS),
    });
    texto = await res.text();
  } catch (e) {
    // Sin respuesta no se sabe si hubo cobro (p. ej., tiempo agotado): se queda lo estimado.
    await cerrar(db, id, { estado: 'fallida', costoUsd: x.estimadoUsd, ms: Date.now() - inicio, error: `red: ${mensajeDe(e)}` });
    return { ok: false, error: new ErrorMeta('No se pudo completar la llamada a la API de Meta', 'red'), reintentable: true, esperaMs: ESPERA_REINTENTO_MS };
  }
  const ms = Date.now() - inicio;
  const json = leerJson(texto) as RespuestaChat | null;

  if (!res.ok) {
    const detalle = json?.error?.message ?? texto.slice(0, 200);
    await cerrar(db, id, { estado: 'fallida', costoUsd: 0, ms, error: `HTTP ${res.status}: ${detalle}` });
    const esperaMs = esperaDe(res.headers.get('retry-after'));
    return {
      ok: false,
      error: new ErrorMeta(`La API de Meta respondió ${res.status}`, 'http', res.status),
      // Si la API pide esperar más de lo razonable, no se reintenta.
      reintentable: (res.status === 429 || res.status >= 500) && esperaMs !== null,
      esperaMs: esperaMs ?? 0,
    };
  }

  const uso = leerUso(json?.usage);
  // Sin un uso legible se cobra lo estimado: nunca se registra menos de lo que pudo costar.
  const costoUsd = uso ? costoDe(x.precio, uso) : x.estimadoUsd;
  const eleccion = json?.choices?.[0];
  const finish = eleccion?.finish_reason ?? null;
  const cierre = {
    costoUsd,
    ms,
    finish,
    tokensEntrada: uso?.entrada,
    tokensCache: uso?.cache,
    tokensSalida: uso?.salida,
    tokensRazonamiento: uso?.razonamiento,
  };
  const fallo = async (error: ErrorMeta, reintentable: boolean): Promise<Resultado<T>> => {
    await cerrar(db, id, { ...cierre, estado: 'fallida', error: error.message });
    return { ok: false, error, reintentable, esperaMs: ESPERA_REINTENTO_MS };
  };

  if (finish === 'length') return fallo(new ErrorMeta('La salida se cortó por max_tokens', 'truncada'), false);
  if (finish !== 'stop') return fallo(new ErrorMeta(`La API terminó con finish_reason=${finish}`, 'invalida'), true);

  const contenido = eleccion?.message?.content;
  const crudo = typeof contenido === 'string' ? leerJson(contenido) : null;
  const validado = x.salida.zod.safeParse(crudo);
  if (!validado.success) return fallo(new ErrorMeta(`La salida no cumple el esquema ${x.salida.nombre}`, 'invalida'), true);

  await cerrar(db, id, { ...cierre, estado: 'completada' });
  return { ok: true, datos: validado.data, uso, costoUsd, ms };
}

interface RespuestaChat {
  error?: { message?: string };
  usage?: unknown;
  choices?: { finish_reason?: string | null; message?: { content?: unknown } }[];
}

export function leerUso(u: unknown): Uso | null {
  if (typeof u !== 'object' || u === null) return null;
  const x = u as Record<string, any>;
  const entrada = x.prompt_tokens;
  const salida = x.completion_tokens;
  const cache = x.prompt_tokens_details?.cached_tokens ?? 0;
  const razonamiento = x.completion_tokens_details?.reasoning_tokens ?? null;
  const valido = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  if (!valido(entrada) || !valido(salida) || !valido(cache) || cache > entrada) return null;
  return { entrada, cache, salida, razonamiento: valido(razonamiento) ? razonamiento : null };
}

export function costoDe(p: PrecioTokens, u: Uso): number {
  return ((u.entrada - u.cache) * p.entrada + u.cache * p.cache + u.salida * p.salida) / 1e6;
}

// Cota alta: unos 3 caracteres por token de entrada, sin caché, y la salida completa.
export function estimarCosto(p: PrecioTokens, caracteres: number, maxTokens: number): number {
  return (Math.ceil(caracteres / 3) * p.entrada + maxTokens * p.salida) / 1e6;
}

async function reproducir<T>(db: D1Database, p: Peticion<T>, modelo: string): Promise<Respuesta<T>> {
  const fila = p.clave ? await db.prepare('SELECT datos FROM grabaciones WHERE clave = ?1').bind(p.clave).first<{ datos: string }>() : null;
  if (!fila) throw new ErrorMeta('Modo demostración: no hay una corrida grabada para esta llamada', 'demo');
  const validado = p.salida.zod.safeParse(leerJson(fila.datos));
  if (!validado.success) throw new ErrorMeta(`La grabación "${p.clave}" no cumple el esquema ${p.salida.nombre}`, 'demo');
  return { datos: validado.data, modelo, costoUsd: 0, uso: null, ms: 0, intentos: 0, demo: true };
}

// Solo graba la primera vez: una grabación elegida no se pisa con cada llamada. Para regrabar,
// se borra la fila antes. Con `caso`, se aparta para ese caso (ver publicarGrabaciones).
async function grabar(db: D1Database, clave: string, modelo: string, datos: unknown, caso: string | null): Promise<void> {
  const sql = caso
    ? db.prepare('INSERT OR REPLACE INTO grabaciones_caso (caso, clave, modelo, datos) VALUES (?4, ?1, ?2, ?3)')
    : db.prepare('INSERT OR IGNORE INTO grabaciones (clave, modelo, datos) VALUES (?1, ?2, ?3)');
  await sql.bind(clave, modelo, JSON.stringify(datos), ...(caso ? [caso] : [])).run();
}

// Publica de una vez las grabaciones apartadas de un caso que terminó bien: reemplazan a las de
// corridas anteriores con las mismas claves, así la cadena que reproduce DEMO_MODE es de una sola corrida.
export async function publicarGrabaciones(db: D1Database, caso: string): Promise<void> {
  await db.batch([
    db.prepare('INSERT OR REPLACE INTO grabaciones (clave, modelo, datos) SELECT clave, modelo, datos FROM grabaciones_caso WHERE caso = ?1').bind(caso),
    db.prepare('DELETE FROM grabaciones_caso WHERE caso = ?1').bind(caso),
  ]);
}

function leerJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

function mensajeDe(e: unknown): string {
  return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
}

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
