import { describe, expect, it } from 'vitest';
import { CASOS_PREPARADOS } from './casos';
import { comparar } from './comparar';

describe('comparar', () => {
  const verdad = CASOS_PREPARADOS[0].verdad;
  it('causa con marcadores → encontrada', () => {
    const r = comparar(verdad, 'El aviso no llega porque la plataforma Avisamed usa el teléfono viejo de la ficha.');
    expect(r.veredicto).toBe('encontrada');
    expect(r.marcadoresEnCausa.length).toBe(3);
  });
  it('causa que es un distractor → no encontrada con distractorPrincipal', () => {
    const r = comparar(verdad, 'Los pacientes se volvieron irresponsables y ya no confirman.');
    expect(r.veredicto).toBe('no_encontrada');
    expect(r.distractorPrincipal).toBe('X1');
  });
  it('marcadores solo en la evidencia → parcial', () => {
    const r = comparar(verdad, 'Hay un problema con los avisos a los pacientes.', ['La plataforma Avisamed mandó al teléfono viejo de la ficha y el aviso no llega.']);
    expect(r.veredicto).toBe('parcial');
    expect(r.marcadoresEnEvidencia.length).toBeGreaterThanOrEqual(2);
  });
  it('sin causa del agente → no encontrada', () => {
    expect(comparar(verdad, null).veredicto).toBe('no_encontrada');
  });
});
