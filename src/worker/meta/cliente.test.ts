import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { d1Falsa } from '../gasto/d1-falsa';
import { resumen, TopeAlcanzado } from '../gasto/gasto';
import { costoDe, ErrorMeta, estimarCosto, leerUso, llamarMeta, type Peticion, type VarsMeta } from './cliente';
import { definirSalida } from './esquema';

const salida = definirSalida('eco', z.object({ eco: z.string() }));
const env: VarsMeta = {
  META_API_KEY: 'llave-de-prueba',
  META_API_BASE_URL: 'https://meta.prueba/v1/',
  MODEL_AGENT: 'muse-spark-1.3',
  TOPE_SESION_USD: '1',
  TOPE_GLOBAL_USD: '5',
  DEMO_MODE: 'false',
};
const peticion: Peticion<{ eco: string }> = {
  sesion: 's1',
  proposito: 'prueba',
  rol: 'agente',
  esfuerzo: 'low',
  mensajes: [{ role: 'user', content: 'hola' }],
  salida,
  maxTokens: 1000,
};

const uso = { prompt_tokens: 1000, completion_tokens: 200, prompt_tokens_details: { cached_tokens: 400 }, completion_tokens_details: { reasoning_tokens: 150 } };
const ok = (contenido: unknown, finish = 'stop', usage: unknown = uso) =>
  new Response(JSON.stringify({ choices: [{ finish_reason: finish, message: { content: JSON.stringify(contenido) } }], usage }), { status: 200 });

function fetchFalso(...respuestas: (Response | Error)[]) {
  const llamadas: { url: string; init: RequestInit }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    llamadas.push({ url, init });
    const r = respuestas.shift();
    if (!r) throw new Error('fetch inesperado');
    if (r instanceof Error) throw r;
    return r;
  }) as unknown as typeof fetch;
  return { f, llamadas };
}

const deps = (f: typeof fetch, extra: Partial<VarsMeta> = {}) => ({ env: { ...env, ...extra }, db: d1Falsa(), fetch: f, esperar: async () => {} });

describe('llamarMeta', () => {
  it('manda esfuerzo, esquema estricto y modelo; registra el costo real', async () => {
    const { f, llamadas } = fetchFalso(ok({ eco: 'hola' }));
    const d = deps(f);
    const r = await llamarMeta(d, peticion);
    expect(r.datos).toEqual({ eco: 'hola' });
    expect(r.intentos).toBe(1);
    expect(llamadas[0].url).toBe('https://meta.prueba/v1/chat/completions');
    const cuerpo = JSON.parse(llamadas[0].init.body as string);
    expect(cuerpo.model).toBe('muse-spark-1.3');
    expect(cuerpo.reasoning_effort).toBe('low');
    expect(cuerpo.max_tokens).toBe(1000);
    expect(cuerpo.response_format.json_schema).toMatchObject({ name: 'eco', strict: true });
    expect(cuerpo.response_format.json_schema.schema.additionalProperties).toBe(false);
    // 600 sin caché a 1.25, 400 en caché a 0.15, 200 de salida a 4.25 por millón.
    const esperado = (600 * 1.25 + 400 * 0.15 + 200 * 4.25) / 1e6;
    expect(r.costoUsd).toBeCloseTo(esperado, 12);
    expect((await resumen(d.db, 's1')).sesionUsd).toBeCloseTo(esperado, 12);
  });

  it('reintenta una vez ante un 500 y cobra solo el intento bueno', async () => {
    const { f, llamadas } = fetchFalso(new Response('caído', { status: 500 }), ok({ eco: 'x' }));
    const d = deps(f);
    const r = await llamarMeta(d, peticion);
    expect(r.intentos).toBe(2);
    expect(llamadas).toHaveLength(2);
    const g = await resumen(d.db, 's1');
    expect(g.llamadasSesion).toBe(2);
    expect(g.sesionUsd).toBeCloseTo(r.costoUsd, 12);
  });

  it('no reintenta un 400', async () => {
    const { f, llamadas } = fetchFalso(new Response(JSON.stringify({ error: { message: 'esquema malo' } }), { status: 400 }));
    const e = await llamarMeta(deps(f), peticion).catch((x) => x);
    expect(e).toBeInstanceOf(ErrorMeta);
    expect(e.status).toBe(400);
    expect(llamadas).toHaveLength(1);
  });

  it('se rinde tras dos fallos seguidos', async () => {
    const { f, llamadas } = fetchFalso(new Response('', { status: 503 }), new Response('', { status: 503 }));
    await expect(llamarMeta(deps(f), peticion)).rejects.toMatchObject({ tipo: 'http', status: 503 });
    expect(llamadas).toHaveLength(2);
  });

  it('reintenta si la salida no cumple el esquema, y cobra ambos intentos', async () => {
    const { f } = fetchFalso(ok({ otro: 1 }), ok({ eco: 'bien' }));
    const d = deps(f);
    const r = await llamarMeta(d, peticion);
    expect(r.datos.eco).toBe('bien');
    expect((await resumen(d.db, 's1')).sesionUsd).toBeCloseTo(2 * r.costoUsd, 12);
  });

  it('no reintenta una salida truncada por max_tokens', async () => {
    const { f, llamadas } = fetchFalso(ok({ eco: 'a' }, 'length'));
    await expect(llamarMeta(deps(f), peticion)).rejects.toMatchObject({ tipo: 'truncada' });
    expect(llamadas).toHaveLength(1);
  });

  it('ante un error de red conserva lo estimado como gastado', async () => {
    const { f } = fetchFalso(new TypeError('sin red'), new TypeError('sin red'));
    const d = deps(f);
    await expect(llamarMeta(d, peticion)).rejects.toMatchObject({ tipo: 'red' });
    expect((await resumen(d.db, 's1')).sesionUsd).toBeGreaterThan(0);
  });

  it('sin usage legible cobra lo estimado', async () => {
    const { f } = fetchFalso(ok({ eco: 'a' }, 'stop', { prompt_tokens: 'mucho' }));
    const r = await llamarMeta(deps(f), peticion);
    expect(r.uso).toBeNull();
    expect(r.costoUsd).toBeGreaterThan(1000 * 4.25 / 1e6 - 1e-12);
  });

  it('con el tope alcanzado no llama a la API', async () => {
    const { f, llamadas } = fetchFalso();
    await expect(llamarMeta(deps(f, { TOPE_SESION_USD: '0' }), peticion)).rejects.toBeInstanceOf(TopeAlcanzado);
    expect(llamadas).toHaveLength(0);
  });

  it('exige esfuerzo válido, llave y precio conocido', async () => {
    const { f } = fetchFalso();
    await expect(llamarMeta(deps(f), { ...peticion, esfuerzo: 'apagado' as never })).rejects.toMatchObject({ tipo: 'config' });
    await expect(llamarMeta(deps(f, { META_API_KEY: '' }), peticion)).rejects.toMatchObject({ tipo: 'config' });
    await expect(llamarMeta(deps(f, { MODEL_AGENT: 'modelo-nuevo' }), peticion)).rejects.toThrow(/sin precio/);
  });

  it('graba una corrida y DEMO_MODE la reproduce sin red ni costo', async () => {
    const { f } = fetchFalso(ok({ eco: 'grabado' }));
    const d = deps(f);
    await llamarMeta(d, { ...peticion, clave: 'caso-1', grabar: true });
    const demo = { ...d, env: { DEMO_MODE: 'true' }, fetch: fetchFalso().f };
    const r = await llamarMeta(demo, { ...peticion, clave: 'caso-1' });
    expect(r).toMatchObject({ datos: { eco: 'grabado' }, demo: true, costoUsd: 0 });
    await expect(llamarMeta(demo, { ...peticion, clave: 'otra' })).rejects.toMatchObject({ tipo: 'demo' });
  });
});

describe('cuentas', () => {
  it('leerUso rechaza conteos imposibles', () => {
    expect(leerUso({ prompt_tokens: 10, completion_tokens: 5, prompt_tokens_details: { cached_tokens: 20 } })).toBeNull();
    expect(leerUso({ prompt_tokens: -1, completion_tokens: 5 })).toBeNull();
    expect(leerUso(null)).toBeNull();
  });
  it('la estimación siempre supera el costo con la salida completa', () => {
    const p = { entrada: 1.25, cache: 0.15, salida: 4.25 };
    expect(estimarCosto(p, 3000, 500)).toBeGreaterThanOrEqual(costoDe(p, { entrada: 1000, cache: 0, salida: 500, razonamiento: null }));
  });
});
