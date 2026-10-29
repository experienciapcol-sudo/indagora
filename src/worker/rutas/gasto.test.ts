import { describe, expect, it } from 'vitest';
import app from '../index';
import type { Bindings } from '../env';
import { d1Falsa } from '../gasto/d1-falsa';

const env = (extra: Partial<Bindings> = {}): Bindings => ({
  DB: d1Falsa(),
  META_API_KEY: 'llave-de-prueba',
  META_API_BASE_URL: 'https://meta.prueba/v1',
  MODEL_AGENT: 'muse-spark-1.3',
  MODEL_AGENT_CONTRIBUTOR: 'muse-spark-1.3-contributor',
  MODEL_TRANSCRIBE: 'muse-voice-transcribe-1.0',
  DEMO_MODE: 'false',
  TOPE_SESION_USD: '0.25',
  TOPE_GLOBAL_USD: '5',
  ...extra,
});

describe('rutas de gasto', () => {
  it('GET /api/gasto crea la sesión y devuelve el gasto en cero', async () => {
    const res = await app.request('/api/gasto', {}, env());
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toMatch(/indagora_sesion=[0-9a-f-]{36}.*HttpOnly/i);
    expect(await res.json()).toMatchObject({ sesionUsd: 0, globalUsd: 0, llamadasSesion: 0, topes: { sesionUsd: 0.25, globalUsd: 5 } });
  });

  it('una cookie mal formada se reemplaza', async () => {
    const res = await app.request('/api/gasto', { headers: { cookie: 'indagora_sesion=../../x' } }, env());
    expect(res.headers.get('set-cookie')).toMatch(/indagora_sesion=[0-9a-f-]{36}/);
  });

  it('POST /api/prueba con el tope global en cero responde 429 sin llamar a Meta', async () => {
    const res = await app.request('/api/prueba', { method: 'POST' }, env({ TOPE_GLOBAL_USD: '0' }));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ alcance: 'global' });
  });

  it('POST /api/prueba en DEMO_MODE sin grabación responde 503', async () => {
    const res = await app.request('/api/prueba', { method: 'POST' }, env({ DEMO_MODE: 'true', META_API_KEY: '' }));
    expect(res.status).toBe(503);
  });

  it('un tope mal configurado no filtra detalles', async () => {
    const res = await app.request('/api/prueba', { method: 'POST' }, env({ TOPE_SESION_USD: 'abc' }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Error interno' });
  });
});
