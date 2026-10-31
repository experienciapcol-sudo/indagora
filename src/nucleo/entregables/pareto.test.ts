import { describe, expect, it } from 'vitest';
import type { NivelCalculado } from '../tipos';
import { afirmacion } from './fixture';
import { calcularPareto, extraerCifras } from './pareto';

const niveles = (entradas: [string, NivelCalculado['nivel']][]) =>
  new Map(entradas.map(([id, nivel]) => [id, { nivel, razones: [], pendientes: [], contradicha: false } as NivelCalculado]));

describe('Pareto', () => {
  it('acepta 9,4 en la cita con 9.4 en especificidad', () => {
    const a = afirmacion({ id: 'E1-A01' });
    expect(extraerCifras(a, 2)).toEqual({ valor: 9.4, unidad: 'días' });
  });

  it('rechaza cifra que no está literal en la cita', () => {
    const a = afirmacion({ id: 'E1-A01', cita: 'El proveedor tarda mucho', especificidad: ['9.4 días'] });
    expect(extraerCifras(a, 2)).toBeNull();
  });

  it('sin cifras en citas devuelve motivo, sin inventar barras', () => {
    const a = afirmacion({ id: 'E1-A01', cita: 'Siempre se atrasa', especificidad: [] });
    const r = calcularPareto([a], niveles([['E1-A01', 2]]));
    expect(r.pareto).toBeNull();
    expect(r.motivo).toBe('sin_cifras_en_citas');
  });

  it('opinión N1 nunca entra', () => {
    const a = afirmacion({ id: 'E1-A01', tipo: 'opinion' });
    const r = calcularPareto([a], niveles([['E1-A01', 1]]));
    expect(r.pareto).toBeNull();
    expect(r.motivo).toBe('sin_cifras_en_citas');
  });

  it('porcentajes y acumulados suman 100 y ordena descendente', () => {
    const a = afirmacion({ id: 'E1-A01', tema: 'Herraje', cita: 'Tarda 30 días el herraje', especificidad: ['30 días'] });
    const b = afirmacion({ id: 'E2-A01', tema: 'Madera', cita: 'Tarda 10 días la madera', especificidad: ['10 días'] });
    const r = calcularPareto([b, a], niveles([['E1-A01', 2], ['E2-A01', 2]]));
    expect(r.motivo).toBeNull();
    expect(r.pareto?.barras.map((x) => x.categoria)).toEqual(['herraje', 'madera']);
    expect(r.pareto?.barras[0].porcentaje).toBe(75);
    expect(r.pareto?.barras.at(-1)?.acumulado).toBe(100);
    expect(r.pareto?.total).toBe(40);
  });

  it('una sola categoría y unidades incompatibles tienen motivo distinto', () => {
    const a = afirmacion({ id: 'E1-A01', cita: 'Tarda 30 días', especificidad: ['30 días'] });
    expect(calcularPareto([a], niveles([['E1-A01', 2]])).motivo).toBe('una_sola_categoria');
    const b = afirmacion({ id: 'E2-A01', tema: 'Costo', cita: 'Cuesta 10 pesos', especificidad: ['10 pesos'] });
    expect(calcularPareto([a, b], niveles([['E1-A01', 2], ['E2-A01', 2]])).motivo).toBe('unidades_incompatibles');
  });
});
