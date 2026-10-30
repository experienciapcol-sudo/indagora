import type { RespuestaPaso, VistaAgente } from '../../nucleo/agente/tipos';
import { esAbortada } from '../api';
import { TEXTOS } from '../textos';

export { esAbortada };

// Mensaje legible del cuerpo { error } o, si no lo hay, del código HTTP.
function mensajeDe(cuerpo: unknown, estado: number): string {
  return cuerpo && typeof cuerpo === 'object' && 'error' in cuerpo && typeof cuerpo.error === 'string'
    ? cuerpo.error
    : TEXTOS.errores.http(estado);
}

// Lanza Error con un mensaje legible; las cancelaciones se relanzan tal cual.
async function pedir<T>(url: string, init: RequestInit, signal?: AbortSignal): Promise<T> {
  let r: Response;
  try {
    r = await fetch(url, { ...init, signal });
  } catch (e) {
    if (esAbortada(e)) throw e;
    throw new Error(TEXTOS.errores.sinConexion);
  }
  const cuerpo: unknown = await r.json().catch(() => null);
  if (!r.ok) throw new Error(mensajeDe(cuerpo, r.status));
  return cuerpo as T;
}

const JSON_CABECERA = { 'content-type': 'application/json' };

export const crearAgente = (caso: 'taller', signal?: AbortSignal) =>
  pedir<VistaAgente>('/api/agente', { method: 'POST', headers: JSON_CABECERA, body: JSON.stringify({ caso }) }, signal);

// `indicacion`: lo que el consultor le pide al agente para este paso (opcional).
export const darPaso = (id: string, indicacion: string | null, signal?: AbortSignal) =>
  pedir<RespuestaPaso>(
    `/api/agente/${encodeURIComponent(id)}/paso`,
    { method: 'POST', headers: JSON_CABECERA, body: JSON.stringify({ indicacion }) },
    signal,
  );

export const confirmarPar = (id: string, clave: string, confirmada: boolean, signal?: AbortSignal) =>
  pedir<VistaAgente>(
    `/api/agente/${encodeURIComponent(id)}/confirmar`,
    { method: 'POST', headers: JSON_CABECERA, body: JSON.stringify({ clave, confirmada }) },
    signal,
  );

export const obtenerAgente = (id: string, signal?: AbortSignal) =>
  pedir<VistaAgente>(`/api/agente/${encodeURIComponent(id)}`, {}, signal);
