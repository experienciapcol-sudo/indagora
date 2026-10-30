import type { PeticionAnalisis, RespuestaAnalisis } from '../nucleo/tipos';
import { TEXTOS } from './textos';

export interface Salud {
  ok: boolean;
  nombre: string;
  demo: boolean;
}

export interface Gasto {
  sesionUsd: number;
  globalUsd: number;
  llamadasSesion: number;
  topes: { sesionUsd: number; globalUsd: number };
  demo: boolean;
}

export const esAbortada = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

export async function obtenerSalud(signal?: AbortSignal): Promise<Salud> {
  const r = await fetch('/api/salud', { signal });
  if (!r.ok) throw new Error(TEXTOS.errores.http(r.status));
  return (await r.json()) as Salud;
}

export async function obtenerGasto(signal?: AbortSignal): Promise<Gasto | null> {
  try {
    const r = await fetch('/api/gasto', { signal });
    return r.ok ? ((await r.json()) as Gasto) : null;
  } catch (e) {
    if (esAbortada(e)) throw e;
    return null;
  }
}

// Lanza Error con un mensaje legible; las cancelaciones se relanzan tal cual.
export async function analizarFuente(peticion: PeticionAnalisis, signal?: AbortSignal): Promise<RespuestaAnalisis> {
  let r: Response;
  try {
    r = await fetch('/api/analizar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(peticion),
      signal,
    });
  } catch (e) {
    if (esAbortada(e)) throw e;
    throw new Error(TEXTOS.errores.sinConexion);
  }
  const cuerpo: unknown = await r.json().catch(() => null);
  if (!r.ok) {
    const mensaje =
      cuerpo && typeof cuerpo === 'object' && 'error' in cuerpo && typeof cuerpo.error === 'string'
        ? cuerpo.error
        : TEXTOS.errores.http(r.status);
    throw new Error(mensaje);
  }
  return cuerpo as RespuestaAnalisis;
}
