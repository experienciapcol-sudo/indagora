import { describe, expect, it } from 'vitest';
import type { CausaEvaluada } from '../agente/tipos';
import { carrilDe, impactoDe, prioridadDe } from './prioridad';
import type { EsfuerzoPropuesto } from './tipos';

const causa = (nivel: CausaEvaluada['nivel'], filasExplicadas = 2, filasTotales = 2): CausaEvaluada => ({
  id: 'C1', nivel, estado: 'explica_todo', filasExplicadas, filasTotales,
  descartadaPor: [], contradicciones: [], verificacion: false, intervencion: false, principal: true,
});

describe('prioridad por código', () => {
  const tabla: [CausaEvaluada['nivel'], EsfuerzoPropuesto, number, number, string, string][] = [
    [4, 'bajo', 5, 5, 'alta', 'inmediato'],
    [4, 'medio', 5, 2.5, 'media', 'corto_plazo'],
    [4, 'alto', 5, 1.67, 'baja', 'estructural'],
    [3, 'bajo', 4, 4, 'alta', 'inmediato'],
    [3, 'medio', 4, 2, 'media', 'corto_plazo'],
    [3, 'alto', 4, 1.33, 'baja', 'estructural'],
  ];
  it.each(tabla)('N%i esfuerzo %s', (nivel, esfuerzo, impacto, puntaje, clase, carril) => {
    const p = prioridadDe(causa(nivel), esfuerzo);
    expect(p.impacto).toBe(impacto);
    expect(p.puntaje).toBe(puntaje);
    expect(p.clase).toBe(clase);
    expect(carrilDe(p.clase)).toBe(carril);
    expect(p.razones.length).toBeGreaterThan(0);
  });

  it('cobertura parcial baja el impacto', () => {
    expect(impactoDe(causa(3, 1, 2)).impacto).toBe(3); // 1 + 1 + round(2*0.5)=1
    expect(impactoDe(causa(2, 0, 2)).impacto).toBe(1);
    expect(impactoDe(causa(4, 0, 0)).impacto).toBe(3); // sin filas: cobertura 0
  });
});
