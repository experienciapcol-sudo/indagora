// Llamadas a las rutas del Laboratorio y de voz. Ninguna clave vive aquí.
import type { CasoLaboratorio, Intercambio, ParametrosLaboratorio, ResultadoComparacion, SegmentoDiarizado, VerdadLaboratorio } from '../../nucleo/laboratorio/tipos';
import { TEXTOS_LAB } from './textos';

export function esAbortada(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

export interface IntercambioPublico {
  n: number;
  persona: string;
  tipoPregunta: Intercambio['tipoPregunta'];
  pregunta: string;
  respuesta: string;
  hechosRevelados: number;
  fuga: boolean;
}

export interface GrabadoLab {
  caso: CasoLaboratorio | null;
  intercambios: IntercambioPublico[];
  comparacionReferencia: ResultadoComparacion | null;
  textos: string[];
}

export interface VistaLaboratorio {
  id: string;
  modo: 'en_vivo' | 'grabado';
  estado: string;
  caso: CasoLaboratorio | null;
  intercambios: IntercambioPublico[];
  agenteId: string | null;
  aviso: string | null;
  grabado: GrabadoLab | null;
}

export interface RespuestaRevelar {
  verdad: VerdadLaboratorio;
  comparacion: ResultadoComparacion;
}

export interface RespuestaTranscripcion {
  segmentos: SegmentoDiarizado[];
  texto: string;
  duracionS: number;
  costoUsd: number;
}

type Registro = Record<string, unknown>;

function esRegistro(x: unknown): x is Registro {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function comoTexto(x: unknown): string | null {
  return typeof x === 'string' ? x : null;
}

// La respuesta puede traer el JSON ya parseado o como texto (grabaciones guardadas).
function desenvolver(x: unknown): Registro {
  if (typeof x === 'string') {
    try {
      const p: unknown = JSON.parse(x);
      return esRegistro(p) ? p : {};
    } catch {
      return {};
    }
  }
  return esRegistro(x) ? x : {};
}

function intercambiosDe(x: unknown): IntercambioPublico[] {
  if (!Array.isArray(x)) return [];
  const salida: IntercambioPublico[] = [];
  for (const bruto of x) {
    if (!esRegistro(bruto)) continue;
    const hechos = bruto.hechosRevelados;
    salida.push({
      n: typeof bruto.n === 'number' ? bruto.n : salida.length + 1,
      persona: comoTexto(bruto.persona) ?? '',
      tipoPregunta: (comoTexto(bruto.tipoPregunta) ?? 'abierta') as Intercambio['tipoPregunta'],
      pregunta: comoTexto(bruto.pregunta) ?? '',
      respuesta: comoTexto(bruto.respuesta) ?? '',
      hechosRevelados: Array.isArray(hechos) ? hechos.length : typeof hechos === 'number' ? hechos : 0,
      fuga: bruto.fuga === true,
    });
  }
  return salida;
}

function grabadoDe(x: unknown): GrabadoLab | null {
  if (x == null) return null;
  const r = desenvolver(x);
  const comparacion = esRegistro(r.comparacionReferencia) ? (r.comparacionReferencia as unknown as ResultadoComparacion) : null;
  const textos = Array.isArray(r.textos)
    ? r.textos.filter((t): t is string => typeof t === 'string')
    : Array.isArray(r.fuentes)
      ? r.fuentes.map((f) => (esRegistro(f) ? (comoTexto(f.texto) ?? '') : '')).filter(Boolean)
      : [];
  return {
    caso: esRegistro(r.caso) ? (r.caso as unknown as CasoLaboratorio) : null,
    intercambios: intercambiosDe(r.intercambios),
    comparacionReferencia: comparacion,
    textos,
  };
}

// Normaliza las formas de respuesta del servidor a una sola vista para la pantalla.
export function normalizarVista(bruto: unknown): VistaLaboratorio {
  const r = desenvolver(bruto);
  const grabadoBruto = r.grabado ?? r.contenido ?? null;
  const grabado = grabadoDe(grabadoBruto);
  const modo = r.modo === 'grabado' || grabadoBruto != null ? 'grabado' : 'en_vivo';
  const casoDirecto = esRegistro(r.caso) ? (r.caso as unknown as CasoLaboratorio) : esRegistro(r.publico) ? (r.publico as unknown as CasoLaboratorio) : esRegistro(r.empresa) ? (r as unknown as CasoLaboratorio) : null;
  return {
    id: comoTexto(r.id) ?? casoDirecto?.id ?? grabado?.caso?.id ?? '',
    modo,
    estado: comoTexto(r.estado) ?? (modo === 'grabado' ? 'grabado' : ''),
    caso: casoDirecto ?? grabado?.caso ?? null,
    intercambios: intercambiosDe(r.intercambios).length ? intercambiosDe(r.intercambios) : (grabado?.intercambios ?? []),
    agenteId: comoTexto(r.agenteId) ?? comoTexto(r.agente_id) ?? (esRegistro(r.vista) && esRegistro(r.vista.estado) ? comoTexto(r.vista.estado.id) : null),
    aviso: comoTexto(r.aviso) ?? comoTexto(r.mensaje) ?? null,
    grabado,
  };
}

async function pedir<T>(url: string, init: RequestInit, signal?: AbortSignal): Promise<T> {
  let r: Response;
  try {
    r = await fetch(url, { ...init, signal });
  } catch (e) {
    if (esAbortada(e)) throw e;
    throw new Error(TEXTOS_LAB.errores.sinConexion);
  }
  const cuerpo: unknown = await r.json().catch(() => null);
  if (!r.ok) {
    const mensaje = esRegistro(cuerpo) ? (comoTexto(cuerpo.error) ?? comoTexto(cuerpo.mensaje)) : null;
    throw new Error(mensaje ?? `El servidor respondió ${r.status}.`);
  }
  return cuerpo as T;
}

const JSON_CABECERA = { 'content-type': 'application/json' };

export async function crearLaboratorio(
  cuerpo: { preparado: string } | ParametrosLaboratorio,
  signal?: AbortSignal,
): Promise<VistaLaboratorio> {
  return normalizarVista(await pedir<unknown>('/api/laboratorio', { method: 'POST', headers: JSON_CABECERA, body: JSON.stringify(cuerpo) }, signal));
}

export async function obtenerLaboratorio(id: string, signal?: AbortSignal): Promise<VistaLaboratorio> {
  return normalizarVista(await pedir<unknown>(`/api/laboratorio/${encodeURIComponent(id)}`, {}, signal));
}

export async function entrevistarLaboratorio(id: string, signal?: AbortSignal): Promise<VistaLaboratorio> {
  return normalizarVista(await pedir<unknown>(`/api/laboratorio/${encodeURIComponent(id)}/entrevistar`, { method: 'POST', headers: JSON_CABECERA, body: '{}' }, signal));
}

export async function iniciarAgenteLaboratorio(id: string, signal?: AbortSignal): Promise<VistaLaboratorio> {
  const bruto = await pedir<unknown>(`/api/laboratorio/${encodeURIComponent(id)}/iniciar-agente`, { method: 'POST', headers: JSON_CABECERA, body: '{}' }, signal);
  const vista = normalizarVista(bruto);
  if (!vista.agenteId && esRegistro(bruto)) {
    // Algunas respuestas devuelven directamente la vista del agente.
    const estado = esRegistro(bruto.estado) ? bruto.estado : esRegistro(bruto.vista) && esRegistro(bruto.vista.estado) ? bruto.vista.estado : null;
    vista.agenteId = estado ? comoTexto(estado.id) : null;
  }
  return vista;
}

export async function revelarLaboratorio(id: string, forzar: boolean, signal?: AbortSignal): Promise<RespuestaRevelar> {
  const bruto = await pedir<unknown>(
    `/api/laboratorio/${encodeURIComponent(id)}/revelar`,
    { method: 'POST', headers: JSON_CABECERA, body: JSON.stringify({ forzar }) },
    signal,
  );
  const r = desenvolver(bruto);
  const verdad = (esRegistro(r.verdad) ? r.verdad : r) as unknown as VerdadLaboratorio;
  const comparacion = (esRegistro(r.comparacion) ? r.comparacion : r.resultado) as unknown as ResultadoComparacion;
  return { verdad, comparacion };
}

export async function transcribirAudio(audio: Blob, signal?: AbortSignal): Promise<RespuestaTranscripcion> {
  const datos = new FormData();
  datos.append('audio', audio, 'entrevista.wav');
  const bruto = await pedir<unknown>('/api/voz/transcribir', { method: 'POST', body: datos }, signal);
  const r = desenvolver(bruto);
  return {
    segmentos: Array.isArray(r.segmentos) ? (r.segmentos as SegmentoDiarizado[]) : [],
    texto: comoTexto(r.texto) ?? '',
    duracionS: typeof r.duracionS === 'number' ? r.duracionS : 0,
    costoUsd: typeof r.costoUsd === 'number' ? r.costoUsd : 0,
  };
}
