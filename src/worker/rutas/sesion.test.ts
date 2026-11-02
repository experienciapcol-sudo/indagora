import { describe, expect, it } from 'vitest';
import app from '../index';
import type { Bindings } from '../env';
import { d1Falsa } from '../gasto/d1-falsa';
import { reservar, TopeAlcanzado } from '../gasto/gasto';
import { MODELOS_POR_OMISION } from '../../config/models';
import { firmar, SESIONES_POR_DIA } from './sesion';

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
  SESION_SECRETO: 'secreto-de-prueba',
  ...extra,
});

const sesionDe = (res: Response) => /indagora_sesion=([0-9a-f-]{36})\./.exec(res.headers.get('set-cookie') ?? '')?.[1];

describe('sesión firmada', () => {
  it('en https sin secreto falla cerrado', async () => {
    const res = await app.request('https://indagora.prueba/api/gasto', {}, env({ SESION_SECRETO: undefined }));
    expect(res.status).toBe(500);
  });

  it('una sesión inventada sin firma no se acepta', async () => {
    const inventada = '11111111-2222-4333-8444-555555555555';
    const res = await app.request('/api/gasto', { headers: { cookie: `indagora_sesion=${inventada}` } }, env());
    expect(sesionDe(res)).toBeDefined();
    expect(sesionDe(res)).not.toBe(inventada);
  });

  it('una firma con otro secreto no se acepta y la válida se conserva', async () => {
    const e = env();
    const ajena = await firmar('11111111-2222-4333-8444-555555555555', 'otro-secreto');
    expect(sesionDe(await app.request('/api/gasto', { headers: { cookie: `indagora_sesion=${ajena}` } }, e))).not.toBe('11111111-2222-4333-8444-555555555555');
    const valida = await firmar('11111111-2222-4333-8444-555555555555', 'secreto-de-prueba');
    const res = await app.request('/api/gasto', { headers: { cookie: `indagora_sesion=${valida}` } }, e);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('borrar la cookie no da sesiones nuevas sin fin a la misma IP', async () => {
    const e = env();
    const pedir = () => app.request('/api/gasto', { headers: { 'cf-connecting-ip': '203.0.113.9' } }, e);
    const vistas = new Set<string>();
    for (let i = 0; i < SESIONES_POR_DIA; i++) vistas.add(sesionDe(await pedir())!);
    expect(vistas.size).toBe(SESIONES_POR_DIA);
    const extra1 = sesionDe(await pedir());
    const extra2 = sesionDe(await pedir());
    expect(extra1).toBe(extra2);
    expect(vistas.has(extra1!)).toBe(false);
    // Otra IP sigue recibiendo sesiones propias.
    const otra = await app.request('/api/gasto', { headers: { 'cf-connecting-ip': '203.0.113.10' } }, e);
    expect(sesionDe(otra)).not.toBe(extra1);
  });
});

describe('superficies cerradas', () => {
  it('POST /api/prueba no existe si no se habilita', async () => {
    const res = await app.request('/api/prueba', { method: 'POST' }, env());
    expect(res.status).toBe(404);
  });

  it('un cuerpo de más de 1 MB se rechaza antes de leerlo', async () => {
    const res = await app.request('/api/agente', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ x: 'a'.repeat(1_100_000) }) }, env());
    expect(res.status).toBe(413);
  });
});

describe('reservas', () => {
  const topes = { sesionUsd: 1, globalUsd: 5 };
  const sub = { prefijo: 'lab:', usd: 0.05 };

  it('el subtope por propósito se revisa en la misma reserva', async () => {
    const db = d1Falsa();
    await reservar(db, { id: 'a', sesion: 's', modelo: 'm', proposito: 'lab:simular', estimadoUsd: 0.03, subtope: sub }, topes);
    await expect(reservar(db, { id: 'b', sesion: 's', modelo: 'm', proposito: 'lab:simular', estimadoUsd: 0.03, subtope: sub }, topes)).rejects.toMatchObject({ alcance: 'subtope' });
    // Otro propósito de la misma sesión no cuenta contra el subtope.
    await reservar(db, { id: 'c', sesion: 's', modelo: 'm', proposito: 'agente:decidir', estimadoUsd: 0.03, subtope: sub }, topes);
    await expect(reservar(db, { id: 'd', sesion: 's', modelo: 'm', proposito: 'lab:generar', estimadoUsd: 0.01, subtope: sub }, topes)).resolves.toBeUndefined();
  });

  it('una reserva sin cerrar vence pero conserva su estimación', async () => {
    const db = d1Falsa();
    await db.prepare(`INSERT INTO llamadas (id, sesion, modelo, proposito, estado, costo_usd, creada) VALUES ('vieja', 's', 'm', 'x', 'reservada', 0.2, '2020-01-01T00:00:00.000Z')`).run();
    await reservar(db, { id: 'nueva', sesion: 's', modelo: 'm', proposito: 'x', estimadoUsd: 0.01 }, topes);
    const f = await db.prepare(`SELECT estado, costo_usd FROM llamadas WHERE id = 'vieja'`).first<{ estado: string; costo_usd: number }>();
    expect(f).toEqual({ estado: 'fallida', costo_usd: 0.2 });
  });

  it('TopeAlcanzado distingue el subtope', () => {
    expect(new TopeAlcanzado('subtope', 0.05, 0.05).message).toMatch(/esta parte/);
  });
});
