import { describe, expect, it } from 'vitest';
import app from '../index';
import type { Bindings } from '../env';
import { d1Falsa } from '../gasto/d1-falsa';
import { MODELOS_POR_OMISION } from '../../config/models';

// Límite falso: deja pasar `cupo` llamadas por clave.
const limite = (cupo = 100): RateLimit => {
  const usadas = new Map<string, number>();
  return {
    limit: async ({ key }) => {
      usadas.set(key, (usadas.get(key) ?? 0) + 1);
      return { success: usadas.get(key)! <= cupo };
    },
  };
};

const env = (extra: Partial<Bindings> = {}): Bindings => ({
  DB: d1Falsa(),
  LIMITE_META: limite(),
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

describe('rutas de gasto', () => {
  it('GET /api/gasto crea la sesión y devuelve el gasto en cero', async () => {
    const res = await app.request('/api/gasto', {}, env());
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toMatch(/indagora_sesion=[0-9a-f-]{36}.*HttpOnly/i);
    expect(await res.json()).toMatchObject({ sesionUsd: 0, globalUsd: 0, llamadasSesion: 0, topes: { sesionUsd: 0.25, globalUsd: 5 } });
  });

  it('la cookie lleva Secure solo en https', async () => {
    const enHttps = await app.request('https://indagora.prueba/api/gasto', {}, env());
    expect(enHttps.headers.get('set-cookie')).toMatch(/Secure/);
    const enHttp = await app.request('http://localhost/api/gasto', {}, env());
    expect(enHttp.headers.get('set-cookie')).not.toMatch(/Secure/);
  });

  it('POST /api/prueba limita por IP aunque cambie la sesión', async () => {
    const e = env({ TOPE_GLOBAL_USD: '0', LIMITE_META: limite(2) });
    const pedir = () => app.request('/api/prueba', { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.7' } }, e);
    await pedir();
    await pedir();
    const tercera = await pedir();
    expect(tercera.status).toBe(429);
    expect(await tercera.json()).toEqual({ error: 'Demasiadas llamadas seguidas; espera un minuto.' });
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
