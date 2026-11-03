// Transcripción ASR fuera de llamarMeta: reserva y cierre de gasto con la duración del WAV.
import { modeloPara, PRECIO_HORA_AUDIO_USD } from '../../config/models';
import { leerCabeceraWav, textoDeSegmentos } from '../../nucleo/laboratorio/voz';
import type { SegmentoDiarizado } from '../../nucleo/laboratorio/tipos';
import { cerrar, leerTopes, reservar } from '../gasto/gasto';
import type { VarsMeta } from '../meta/cliente';

export class ErrorTranscripcion extends Error {
  constructor(message: string, readonly status = 400) { super(message); this.name = 'ErrorTranscripcion'; }
}

export interface DependenciasVoz { env: VarsMeta; db: D1Database; fetch?: typeof fetch }

export function construirPeticionAsr(env: VarsMeta, bytes: Uint8Array): { url: string; formulario: FormData } {
  const base = env.META_API_BASE_URL?.trim().replace(/\/$/, '');
  if (!base || !env.META_API_KEY?.trim()) throw new ErrorTranscripcion('Falta la configuración de la API de Meta.', 500);
  const formulario = new FormData();
  formulario.append('request', new Blob([JSON.stringify({ mode: 'DIARIZATION', model: modeloPara(env, 'transcripcion'), audioEncoding: 'WAV', languageBias: ['Spanish'] })], { type: 'application/json' }));
  formulario.append('audio', new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: 'audio/wav' }), 'audio.wav');
  return { url: `${base}/asr/transcribe`, formulario };
}

// Adaptador tolerante: la forma fijada en pruebas es turns[{speaker,startMs,endMs,transcript}].
export function adaptarRespuestaAsr(json: unknown): SegmentoDiarizado[] {
  const x = (json ?? {}) as Record<string, any>;
  const lista: any[] = Array.isArray(x.turns) ? x.turns : Array.isArray(x.segments) ? x.segments : Array.isArray(x.results) ? x.results : [];
  const segmentos: SegmentoDiarizado[] = [];
  for (const t of lista) {
    const texto = String(t.transcript ?? t.text ?? t.utterance ?? '').trim();
    if (!texto) continue;
    const inicioS = typeof t.startMs === 'number' ? t.startMs / 1000 : typeof t.start === 'number' ? t.start : typeof t.startS === 'number' ? t.startS : segmentos.length;
    const finS = typeof t.endMs === 'number' ? t.endMs / 1000 : typeof t.end === 'number' ? t.end : typeof t.endS === 'number' ? t.endS : inicioS + 1;
    segmentos.push({ hablante: String(t.speaker ?? t.hablante ?? 'SPEAKER_00'), inicioS, finS, texto });
  }
  if (!segmentos.length && typeof x.transcript === 'string' && x.transcript.trim()) {
    segmentos.push({ hablante: 'SPEAKER_00', inicioS: 0, finS: 0, texto: x.transcript.trim() });
  }
  return segmentos;
}

export const AVISO_VOZ_DEMO = 'Modo demostración: la voz no se transcribe porque eso llamaría a la API de Meta. Pega la transcripción como texto o usa un caso preparado.';

export async function transcribirAudio(deps: DependenciasVoz, sesion: string, bytes: Uint8Array): Promise<{ segmentos: SegmentoDiarizado[]; texto: string; duracionS: number; costoUsd: number }> {
  // Como llamarMeta: en DEMO_MODE nada sale a la API ni se registra gasto.
  if (deps.env.DEMO_MODE === 'true') throw new ErrorTranscripcion(AVISO_VOZ_DEMO, 403);
  if (bytes.length > 32 * 1024 * 1024) throw new ErrorTranscripcion('El audio supera los 32 MB.', 413);
  const info = leerCabeceraWav(bytes);
  if (!info.valida) throw new ErrorTranscripcion(info.motivo ?? 'El archivo no es un WAV válido.');
  const costoUsd = (info.duracionS / 3600) * PRECIO_HORA_AUDIO_USD;
  const modelo = modeloPara(deps.env, 'transcripcion');
  const id = crypto.randomUUID();
  // TopeAlcanzado sale de aquí sin llamar a la API.
  await reservar(deps.db, { id, sesion, modelo, proposito: 'voz:transcribir', estimadoUsd: costoUsd }, leerTopes(deps.env));
  const inicio = Date.now();
  let res: Response;
  try {
    const { url, formulario } = construirPeticionAsr(deps.env, bytes);
    res = await (deps.fetch ?? fetch)(url, { method: 'POST', headers: { Authorization: `Bearer ${deps.env.META_API_KEY!.trim()}` }, body: formulario });
  } catch {
    await cerrar(deps.db, id, { estado: 'fallida', costoUsd, ms: Date.now() - inicio, error: 'red: sin respuesta del ASR' });
    throw new ErrorTranscripcion('No se pudo completar la transcripción; no se sabe si hubo cobro, así que se registró el costo estimado.', 502);
  }
  const textoRespuesta = await res.text();
  if (!res.ok) {
    await cerrar(deps.db, id, { estado: 'fallida', costoUsd: 0, ms: Date.now() - inicio, error: `HTTP ${res.status}: ${textoRespuesta.slice(0, 200)}` });
    throw new ErrorTranscripcion(`La transcripción falló (HTTP ${res.status}). Puedes reintentar a mano; no se hizo un segundo envío automático.`, 502);
  }
  let json: unknown = null;
  try { json = JSON.parse(textoRespuesta); } catch { /* se cierra con lo estimado y se avisa abajo */ }
  const segmentos = adaptarRespuestaAsr(json);
  await cerrar(deps.db, id, { estado: 'completada', costoUsd, ms: Date.now() - inicio });
  if (!segmentos.length) throw new ErrorTranscripcion('La transcripción no devolvió segmentos reconocibles.', 502);
  return { segmentos, texto: textoDeSegmentos(segmentos), duracionS: info.duracionS, costoUsd };
}
