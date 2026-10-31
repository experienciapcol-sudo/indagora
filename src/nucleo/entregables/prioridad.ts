// Prioridad impacto/esfuerzo calculada por código. El modelo solo propone esfuerzo (enum).
import type { CausaEvaluada } from '../agente/tipos';
import type { Carril, ClasePrioridad, EsfuerzoPropuesto, Prioridad } from './tipos';

export const PUNTOS_ESFUERZO: Record<EsfuerzoPropuesto, 1 | 2 | 3> = { bajo: 1, medio: 2, alto: 3 };

const redondear2 = (n: number) => Math.round(n * 100) / 100;

export function impactoDe(c: CausaEvaluada): { impacto: 1 | 2 | 3 | 4 | 5; razones: string[] } {
  const puntosNivel = c.nivel === 4 ? 2 : c.nivel === 3 ? 1 : 0;
  const cobertura = c.filasTotales > 0 ? c.filasExplicadas / c.filasTotales : 0;
  const puntosCobertura = Math.round(2 * cobertura);
  const bruto = 1 + puntosNivel + puntosCobertura;
  const impacto = Math.min(5, Math.max(1, bruto)) as 1 | 2 | 3 | 4 | 5;
  return {
    impacto,
    razones: [
      `base 1`,
      `nivel N${c.nivel}: +${puntosNivel}`,
      `cobertura ${c.filasExplicadas}/${c.filasTotales} filas: +${puntosCobertura}`,
      `impacto = ${impacto}`,
    ],
  };
}

export function prioridadDe(c: CausaEvaluada, esfuerzo: EsfuerzoPropuesto): Prioridad {
  const { impacto, razones } = impactoDe(c);
  const esfuerzoPuntos = PUNTOS_ESFUERZO[esfuerzo] ?? 2;
  const puntaje = redondear2(impacto / esfuerzoPuntos);
  const clase: ClasePrioridad = puntaje >= 3 ? 'alta' : puntaje >= 1.8 ? 'media' : 'baja';
  return {
    impacto,
    esfuerzo,
    esfuerzoPuntos,
    puntaje,
    clase,
    razones: [...razones, `esfuerzo ${esfuerzo}: ${esfuerzoPuntos} punto(s)`, `puntaje = ${impacto}/${esfuerzoPuntos} = ${puntaje}`, `clase ${clase}`],
  };
}

export function carrilDe(clase: ClasePrioridad): Carril {
  return clase === 'alta' ? 'inmediato' : clase === 'media' ? 'corto_plazo' : 'estructural';
}
