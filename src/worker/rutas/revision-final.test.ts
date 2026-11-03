// Reproducciones de la revisión final (3 nov): cada prueba falló antes de su corrección.
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../index';
import type { Bindings } from '../env';
import { d1Falsa } from '../gasto/d1-falsa';
import { MODELOS_POR_OMISION } from '../../config/models';
import { VISTA_EJEMPLO } from '../../client/agente/ejemplo';
import { clavePar } from '../../nucleo/niveles';
import type { VistaAgente } from '../../nucleo/agente/tipos';

const env = (extra: Partial<Bindings> = {}): Bindings => ({
  DB: d1Falsa(), META_API_KEY: 'llave-de-prueba', META_API_BASE_URL: 'https://meta.prueba/v1',
  MODEL_AGENT: MODELOS_POR_OMISION.agente, MODEL_AGENT_CONTRIBUTOR: MODELOS_POR_OMISION.contributor,
  MODEL_TRANSCRIBE: MODELOS_POR_OMISION.transcripcion, DEMO_MODE: 'false', TOPE_SESION_USD: '5', TOPE_GLOBAL_USD: '50', ...extra,
});

function wav(segundos = 1, hz = 16000): Uint8Array {
  const datos = Math.floor(segundos * hz) * 2;
  const b = new Uint8Array(44 + datos);
  const v = new DataView(b.buffer);
  const ascii = (o: number, s: string) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
  ascii(0, 'RIFF'); v.setUint32(4, 36 + datos, true); ascii(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, hz, true); v.setUint32(28, hz * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); ascii(36, 'data'); v.setUint32(40, datos, true);
  return b;
}
const subirAudio = (e: Bindings, bytes: Uint8Array) => {
  const form = new FormData();
  form.append('audio', new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: 'audio/wav' }), 'audio.wav');
  return app.request('/api/voz/transcribir', { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.40' }, body: form }, e);
};
afterEach(() => vi.unstubAllGlobals());

const pedir = (ruta: string, e: Bindings, cookie: string, cuerpo?: unknown) =>
  app.request(ruta, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) }, e);

describe('revisión final', () => {
  it('retirar la corroboración que daba N3 retira la intervención de esa causa', async () => {
    const e = env();
    const cookie = (await app.request('/api/gasto', {}, e)).headers.get('set-cookie')!.split(';')[0];
    const sesion = cookie.split('=')[1].split('.')[0];
    const estado = structuredClone(VISTA_EJEMPLO.estado);
    estado.id = crypto.randomUUID();
    // C1 queda sostenida solo por el testimonio E2-A04, que sube por dos corroboraciones confirmadas.
    estado.causas = estado.causas.map((c) => (c.id === 'C1' ? { ...c, evidencia: ['E2-A04'] } : c));
    await e.DB.prepare('INSERT INTO agentes (id, sesion, estado) VALUES (?1, ?2, ?3)').bind(estado.id, sesion, JSON.stringify(estado)).run();

    const r1 = await pedir(`/api/agente/${estado.id}/confirmar`, e, cookie, { clave: clavePar('D1-A01', 'E2-A04'), confirmada: false });
    const v1 = (await r1.json()) as VistaAgente;
    expect(v1.causas.find((c) => c.id === 'C1')!.nivel).toBe(3);
    expect(v1.estado.intervenciones.map((i) => i.causa)).toEqual(['C1']);

    const r2 = await pedir(`/api/agente/${estado.id}/confirmar`, e, cookie, { clave: clavePar('E2-A04', 'E3-A03'), confirmada: false });
    const v2 = (await r2.json()) as VistaAgente;
    expect(v2.causas.find((c) => c.id === 'C1')!.nivel).toBe(2);
    expect(v2.estado.intervenciones).toEqual([]);
    expect(v2.estado.traza.at(-1)).toMatchObject({ tipo: 'rechazo', origen: 'guarda', accion: 'proponer_intervencion', motivo: 'nivel_insuficiente' });
  });

  it('con DEMO_MODE la transcripción no llama a Meta ni registra gasto', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ turns: [{ speaker: 'SPEAKER_00', startMs: 0, endMs: 500, transcript: 'hola' }] }), { status: 200 }));
    vi.stubGlobal('fetch', f);
    const e = env({ DEMO_MODE: 'true' });
    const r = await subirAudio(e, wav(2));
    expect(f).not.toHaveBeenCalled();
    expect(r.status).not.toBe(200);
  });
});
