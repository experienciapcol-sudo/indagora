import { describe, expect, it } from 'vitest';
import { cerrar, leerTopes, reservar, resumen, TopeAlcanzado } from './gasto';
import { d1Falsa } from './d1-falsa';

const topes = { sesionUsd: 0.1, globalUsd: 0.25 };
const reserva = (id: string, sesion: string, estimadoUsd: number) => ({ id, sesion, modelo: 'm', proposito: 'prueba', estimadoUsd });

describe('leerTopes', () => {
  it('lee números válidos', () => {
    expect(leerTopes({ TOPE_SESION_USD: '1.5', TOPE_GLOBAL_USD: '50' })).toEqual({ sesionUsd: 1.5, globalUsd: 50 });
  });
  it.each([undefined, '', '  ', 'abc', '-1', 'NaN', 'Infinity'])('falla cerrado con %j', (v) => {
    expect(() => leerTopes({ TOPE_SESION_USD: v, TOPE_GLOBAL_USD: '5' })).toThrow(/TOPE_SESION_USD/);
  });
});

describe('reservar y cerrar', () => {
  it('reserva dentro del tope y cierra con el costo real', async () => {
    const db = d1Falsa();
    await reservar(db, reserva('a', 's1', 0.05), topes);
    expect((await resumen(db, 's1')).sesionUsd).toBeCloseTo(0.05);
    await cerrar(db, 'a', { estado: 'completada', costoUsd: 0.002, tokensEntrada: 100, tokensSalida: 20 });
    const g = await resumen(db, 's1');
    expect(g.llamadasSesion).toBe(1);
    expect(g.sesionUsd).toBeCloseTo(0.002, 12);
    expect(g.globalUsd).toBeCloseTo(0.002, 12);
  });

  it('rechaza la reserva que pasaría el tope de la sesión', async () => {
    const db = d1Falsa();
    await reservar(db, reserva('a', 's1', 0.08), topes);
    const error = await reservar(db, reserva('b', 's1', 0.03), topes).catch((e) => e);
    expect(error).toBeInstanceOf(TopeAlcanzado);
    expect(error.alcance).toBe('sesion');
    expect((await resumen(db, 's1')).llamadasSesion).toBe(1);
  });

  it('rechaza por tope global aunque la sesión sea nueva', async () => {
    const db = d1Falsa();
    for (const [id, s] of [['a', 's1'], ['b', 's2'], ['c', 's3']]) await reservar(db, reserva(id, s, 0.08), topes);
    const error = await reservar(db, reserva('d', 's4', 0.02), topes).catch((e) => e);
    expect(error).toBeInstanceOf(TopeAlcanzado);
    expect(error.alcance).toBe('global');
  });

  it('libera lo reservado al cerrar más barato', async () => {
    const db = d1Falsa();
    await reservar(db, reserva('a', 's1', 0.09), topes);
    await cerrar(db, 'a', { estado: 'fallida', costoUsd: 0, error: 'HTTP 500' });
    await expect(reservar(db, reserva('b', 's1', 0.09), topes)).resolves.toBeUndefined();
  });

  it('no reabre una llamada ya cerrada', async () => {
    const db = d1Falsa();
    await reservar(db, reserva('a', 's1', 0.05), topes);
    await cerrar(db, 'a', { estado: 'completada', costoUsd: 0.04 });
    await cerrar(db, 'a', { estado: 'fallida', costoUsd: 0 });
    expect((await resumen(db, 's1')).sesionUsd).toBeCloseTo(0.04);
  });

  it('rechaza costos no numéricos o negativos', async () => {
    const db = d1Falsa();
    await expect(reservar(db, reserva('a', 's1', Number.NaN), topes)).rejects.toThrow(/estimado/);
    await expect(reservar(db, reserva('a', 's1', -1), topes)).rejects.toThrow(/estimado/);
    await reservar(db, reserva('b', 's1', 0.01), topes);
    await expect(cerrar(db, 'b', { estado: 'completada', costoUsd: Number.NaN })).rejects.toThrow(/inválido/);
  });

  it('el total global coincide con la suma de las llamadas', async () => {
    const db = d1Falsa();
    await reservar(db, reserva('a', 's1', 0.05), topes);
    await reservar(db, reserva('b', 's2', 0.07), topes);
    await cerrar(db, 'a', { estado: 'completada', costoUsd: 0.01 });
    await cerrar(db, 'b', { estado: 'fallida', costoUsd: 0 });
    await cerrar(db, 'b', { estado: 'completada', costoUsd: 0.5 });
    const suma = await db.prepare('SELECT SUM(costo_usd) AS s FROM llamadas').first<{ s: number }>();
    expect((await resumen(db, 's1')).globalUsd).toBeCloseTo(suma!.s, 12);
    expect(suma!.s).toBeCloseTo(0.01, 12);
  });

  it('una reserva rechazada no mueve el total global', async () => {
    const db = d1Falsa();
    await reservar(db, reserva('a', 's1', 0.09), topes);
    await reservar(db, reserva('b', 's1', 0.09), topes).catch(() => {});
    expect((await resumen(db, 's1')).globalUsd).toBeCloseTo(0.09, 12);
  });

  it('con tope 0 no deja pasar nada', async () => {
    const db = d1Falsa();
    await expect(reservar(db, reserva('a', 's1', 0.0001), { sesionUsd: 0, globalUsd: 0 })).rejects.toBeInstanceOf(TopeAlcanzado);
  });
});
