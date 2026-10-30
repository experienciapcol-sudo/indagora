import { describe, expect, it } from 'vitest';
import type { Afirmacion, RespuestaAnalisis } from '../nucleo/tipos';
import { sinReferenciasA, type EstadosPorFuente } from './sesion';

const lista = (afirmaciones: Partial<Afirmacion>[]) => ({ tipo: 'lista', resp: { afirmaciones } as unknown as RespuestaAnalisis }) as const;

describe('sinReferenciasA', () => {
  it('quita las corroboraciones y contradicciones que apuntan a la fuente quitada', () => {
    const estados: EstadosPorFuente = {
      E1: lista([{ id: 'E1-A01', corrobora: ['E3-A02', 'E2-A01'], contradice: ['E3-A01'] }]),
      E2: { tipo: 'pendiente' },
    };
    const r = sinReferenciasA(estados, 'E3');
    const a = (r.E1 as ReturnType<typeof lista>).resp.afirmaciones[0];
    expect(a.corrobora).toEqual(['E2-A01']);
    expect(a.contradice).toEqual([]);
    expect(r.E2).toEqual({ tipo: 'pendiente' });
  });
});
