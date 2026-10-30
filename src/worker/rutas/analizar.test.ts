import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../index';
import type { Bindings } from '../env';
import { d1Falsa } from '../gasto/d1-falsa';
import { MODELOS_POR_OMISION } from '../../config/models';
import type { PeticionAnalisis } from '../../nucleo/tipos';

const env = (extra: Partial<Bindings> = {}): Bindings => ({
  DB: d1Falsa(),
  META_API_KEY: 'llave-de-prueba',
  META_API_BASE_URL: 'https://meta.prueba/v1',
  MODEL_AGENT: MODELOS_POR_OMISION.agente,
  MODEL_AGENT_CONTRIBUTOR: MODELOS_POR_OMISION.contributor,
  MODEL_TRANSCRIBE: MODELOS_POR_OMISION.transcripcion,
  DEMO_MODE: 'false',
  TOPE_SESION_USD: '0.25',
  TOPE_GLOBAL_USD: '5',
  ...extra,
});

const peticion: PeticionAnalisis = {
  fuente: {
    id: 'E1',
    tipo: 'entrevista',
    rol: 'Jefe de taller',
    modalidad: 'transcripcion',
    titulo: 'Entrevista 1',
    entrevistador: 'Consultora',
    texto: 'Consultora: ¿Qué pasa?\nJefe de taller: Desde febrero esperamos el herraje nueve días.',
  },
  previas: [],
};

const post = (cuerpo: unknown, e: Bindings) =>
  app.request('/api/analizar', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.7' }, body: JSON.stringify(cuerpo) }, e);

function metaResponde() {
  const f = vi.fn(async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: JSON.stringify({
                afirmaciones: [{ oraciones: [{ id: 'E1-002', ancla: 'esperamos el herraje nueve' }], resumen: 'Esperan el herraje.', tema: 'herraje', tipo: 'testimonio_especifico', primera_mano: true, rasgos: [], corrobora: [], contradice: [] }],
              }),
            },
          },
        ],
        usage: { prompt_tokens: 1500, completion_tokens: 400 },
      }),
      { status: 200 },
    ),
  );
  vi.stubGlobal('fetch', f);
  return f;
}

afterEach(() => vi.unstubAllGlobals());

describe('POST /api/analizar', () => {
  it('analiza una fuente y devuelve oraciones, afirmaciones con cita y gasto', async () => {
    metaResponde();
    const res = await post(peticion, env());
    expect(res.status).toBe(200);
    const r: any = await res.json();
    expect(r.oraciones).toHaveLength(2);
    expect(r.afirmaciones[0]).toMatchObject({ id: 'E1-A01', cita: 'Desde febrero esperamos el herraje nueve días.' });
    expect(r.rechazos).toEqual([]);
    expect(r.gasto.llamadasSesion).toBe(1);
    expect(r.fuente.id).toBe('E1');
  });

  it('rechaza un cuerpo inválido sin llamar a Meta', async () => {
    const f = metaResponde();
    for (const malo of [{}, { ...peticion, fuente: { ...peticion.fuente, id: 'X1' } }, { ...peticion, fuente: { ...peticion.fuente, texto: 'a'.repeat(60_001) } }]) {
      expect((await post(malo, env())).status).toBe(400);
    }
    expect(f).not.toHaveBeenCalled();
  });

  it('acepta más de 200 previas (el analista recorta)', async () => {
    metaResponde();
    const previas = Array.from({ length: 260 }, (_, i) => ({ id: `E3-A${String(i + 1).padStart(3, '0')}`, fuente: 'E3', rol: 'Compras', resumen: 'x' }));
    expect((await post({ ...peticion, previas }, env())).status).toBe(200);
  });

  it('responde 400 si la fuente no tiene nada citable', async () => {
    const f = metaResponde();
    const res = await post({ ...peticion, fuente: { ...peticion.fuente, texto: 'Consultora: ¿Hola?' } }, env());
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toMatch(/oraciones/);
    expect(f).not.toHaveBeenCalled();
  });

  it('limita las llamadas por minuto por IP', async () => {
    metaResponde();
    const e = env({ TOPE_SESION_USD: '10', TOPE_GLOBAL_USD: '10' });
    const estados = [];
    for (let i = 0; i < 11; i++) estados.push((await post(peticion, e)).status);
    expect(estados.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(estados[10]).toBe(429);
  });
});
