import { describe, expect, it } from 'vitest';
import { causaPrincipalElegible, elegibleParaIntervencion, elegibleParaVerificacion, motivoSinIntervencionPara } from './elegibilidad';
import { vistaTaller, vistaTallerN2 } from './fixture';

describe('elegibilidad', () => {
  it('N3 explica_todo sin contradicciones admite intervención', () => {
    const v = vistaTaller();
    const c1 = v.causas.find((c) => c.id === 'C1')!;
    expect(c1.nivel).toBe(3);
    expect(elegibleParaIntervencion(c1)).toBe(true);
    expect(elegibleParaVerificacion(c1)).toBe(false);
    expect(causaPrincipalElegible(v.causas)?.id).toBe('C1');
  });

  it('N0 a N2 solo admite verificación, aunque explique todo', () => {
    const v = vistaTallerN2();
    const c1 = v.causas.find((c) => c.id === 'C1')!;
    expect(c1.nivel).toBe(2);
    expect(c1.estado).toBe('explica_todo');
    expect(elegibleParaIntervencion(c1)).toBe(false);
    expect(elegibleParaVerificacion(c1)).toBe(true);
    expect(motivoSinIntervencionPara(v.causas)).toContain('N2');
  });

  it('una causa descartada no admite nada', () => {
    const v = vistaTaller();
    const c2 = v.causas.find((c) => c.id === 'C2')!;
    expect(c2.estado).toBe('descartada');
    expect(elegibleParaIntervencion(c2)).toBe(false);
    expect(elegibleParaVerificacion(c2)).toBe(false);
  });

  it('con contradicciones abiertas no hay intervención', () => {
    const v = vistaTaller();
    const c = { ...v.causas[0], contradicciones: ['E1-A01'] };
    expect(elegibleParaIntervencion(c)).toBe(false);
  });
});
