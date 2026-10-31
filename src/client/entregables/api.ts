// Rutas de entregables del Worker (F5, tarea 03). GET sin generar devuelve 404: se traduce a null.
import type { EntregablesCaso } from '../../nucleo/entregables/tipos';
import { esAbortada } from '../api';
import { TEXTOS } from '../textos';

export interface RespuestaEntregables {
  entregables: EntregablesCaso;
  desactualizado: boolean;
}

function mensajeDe(cuerpo: unknown, estado: number): string {
  return cuerpo && typeof cuerpo === 'object' && 'error' in cuerpo && typeof cuerpo.error === 'string'
    ? cuerpo.error
    : TEXTOS.errores.http(estado);
}

async function pedir<T>(url: string, init: RequestInit, signal?: AbortSignal): Promise<{ estado: number; cuerpo: T | null }> {
  let r: Response;
  try {
    r = await fetch(url, { ...init, signal });
  } catch (e) {
    if (esAbortada(e)) throw e;
    throw new Error(TEXTOS.errores.sinConexion);
  }
  const cuerpo: unknown = await r.json().catch(() => null);
  if (r.status === 404) return { estado: 404, cuerpo: null };
  if (!r.ok) throw new Error(mensajeDe(cuerpo, r.status));
  return { estado: r.status, cuerpo: cuerpo as T };
}

const JSON_CABECERA = { 'content-type': 'application/json' };

export async function obtenerEntregables(id: string, signal?: AbortSignal): Promise<RespuestaEntregables | null> {
  const { cuerpo } = await pedir<RespuestaEntregables>(`/api/agente/${encodeURIComponent(id)}/entregables`, {}, signal);
  return cuerpo;
}

export async function generarEntregablesApi(id: string, regenerar: boolean, signal?: AbortSignal): Promise<RespuestaEntregables> {
  const consulta = regenerar ? '?regenerar=1' : '';
  const { cuerpo } = await pedir<RespuestaEntregables>(
    `/api/agente/${encodeURIComponent(id)}/entregables${consulta}`,
    { method: 'POST', headers: JSON_CABECERA, body: JSON.stringify({}) },
    signal,
  );
  if (!cuerpo) throw new Error(TEXTOS.errores.http(404));
  return cuerpo;
}
