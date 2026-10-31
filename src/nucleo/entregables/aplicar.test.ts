import { describe, expect, it } from 'vitest';
import { aplicarAcciones, aplicarIndicadores, aplicarVerificaciones } from './aplicar';
import { pasosPDSA, vistaTaller, vistaTallerN2 } from './fixture';

describe('revisión de propuestas (aplicar)', () => {
  it('impide intervenir sobre causa N2', () => {
    const v = vistaTallerN2();
    const r = aplicarAcciones(v, [{ causa: 'C1', texto: 'Cambiar de proveedor', cuadrante: 'crear', esfuerzo: 'bajo', punteros: ['E1-A01'] }]);
    expect(r.acciones).toEqual([]);
    expect(r.rechazos[0].motivo).toBe('causa_no_elegible_intervencion');
  });

  it('rechaza puntero inexistente y elemento sin punteros', () => {
    const v = vistaTaller();
    const r = aplicarAcciones(v, [
      { causa: 'C1', texto: 'A', cuadrante: 'eliminar', esfuerzo: 'bajo', punteros: ['E9-A99'] },
      { causa: 'C1', texto: 'B', cuadrante: 'eliminar', esfuerzo: 'bajo', punteros: [] },
    ]);
    expect(r.acciones).toEqual([]);
    expect(r.rechazos.map((x) => x.motivo)).toEqual(['puntero_inexistente', 'sin_punteros']);
  });

  it('rechaza causa descartada y causa inexistente infiltradas', () => {
    const v = vistaTaller();
    const r = aplicarAcciones(v, [
      { causa: 'C2', texto: 'Contratar personal', cuadrante: 'incrementar', esfuerzo: 'medio', punteros: ['E1-A01'] },
      { causa: 'C9', texto: 'Algo', cuadrante: 'crear', esfuerzo: 'bajo', punteros: ['E1-A01'] },
    ]);
    // C2 en la vista del taller está descartada (o, si no, no elegible): nunca entra.
    expect(r.acciones).toEqual([]);
    expect(r.rechazos.some((x) => x.motivo === 'causa_descartada' || x.motivo === 'causa_no_elegible_intervencion')).toBe(true);
    expect(r.rechazos.some((x) => x.motivo === 'causa_inexistente')).toBe(true);
  });

  it('ordena acciones por prioridad y asigna ids y carril', () => {
    const v = vistaTaller();
    const r = aplicarAcciones(v, [
      { causa: 'C1', texto: 'Acción cara', cuadrante: 'crear', esfuerzo: 'alto', punteros: ['E1-A01'] },
      { causa: 'C1', texto: 'Acción barata', cuadrante: 'incrementar', esfuerzo: 'bajo', punteros: ['E2-A01'] },
    ]);
    expect(r.acciones.map((a) => a.id)).toEqual(['I1', 'I2']);
    expect(r.acciones[0].texto).toBe('Acción barata');
    expect(r.acciones[0].carril).toBe('inmediato');
  });

  it('verificación exige PDSA completo con punteros', () => {
    const v = vistaTallerN2();
    const buena = aplicarVerificaciones(v, [{
      causa: 'C1', queRevisar: 'Registro', conQuien: 'Jefe de taller', confirmaSi: 'Plazos de 9 días', descartaSi: 'Plazos de 3 días', pasos: pasosPDSA(['E1-A01']),
    }]);
    expect(buena.verificaciones).toHaveLength(1);
    const mala = aplicarVerificaciones(v, [{
      causa: 'C1', queRevisar: 'Registro', conQuien: 'Jefe', confirmaSi: 'x', descartaSi: 'y', pasos: pasosPDSA(['E1-A01']).slice(0, 2),
    }]);
    expect(mala.verificaciones).toEqual([]);
    expect(mala.rechazos[0].motivo).toBe('campo_vacio');
  });

  it('indicador con meta sin número o sin plazo se conserva marcado SMART incompleto', () => {
    const v = vistaTaller();
    const r = aplicarIndicadores(v, [{
      nombre: 'Plazo de herraje', definicion: 'Días promedio', formula: 'suma de días / número de pedidos',
      unidad: 'días', lineaBase: null, meta: 'bajar', plazo: '', frecuencia: 'semanal', responsable: 'Jefe de taller', causa: 'C1', punteros: ['E1-A01'],
    }]);
    expect(r.indicadores).toHaveLength(1);
    expect(r.indicadores[0].smart.completa).toBe(false);
    expect(r.indicadores[0].smart.faltan).toContain('meta sin cifra');
    expect(r.indicadores[0].smart.faltan).toContain('sin plazo');
  });
});
