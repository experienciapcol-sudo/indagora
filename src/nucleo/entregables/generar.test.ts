import { describe, expect, it } from 'vitest';
import { generarEntregables } from './generar';
import { pasosPDSA, vistaTallerN2 } from './fixture';

describe('generarEntregables con causa N2', () => {
  it('solo verificación: intervención null con motivo y sin acciones coladas', () => {
    const v = vistaTallerN2();
    const e = generarEntregables(v, {
      verificaciones: [{
        causa: 'C1', queRevisar: 'Registro de compras', conQuien: 'Jefe de taller',
        confirmaSi: 'Plazos cercanos a 9 días', descartaSi: 'Plazos cercanos a 3 días', pasos: pasosPDSA(['E1-A01']),
      }],
      acciones: [{ causa: 'C1', texto: 'Cambiar proveedor ya', cuadrante: 'crear', esfuerzo: 'bajo', punteros: ['E1-A01'] }],
      indicadores: [],
    });
    expect(e.verificaciones).toHaveLength(1);
    expect(e.intervencion).toBeNull();
    expect(e.motivoSinIntervencion).toContain('N2');
    expect(e.rechazos.some((r) => r.motivo === 'causa_no_elegible_intervencion')).toBe(true);
    expect(e.informeMarkdown).toContain('Plan de verificación');
  });

  it('Pareto sin cifras aptas informa el motivo en vez de barras', () => {
    const v = vistaTallerN2();
    // Las dos afirmaciones comparten tema y unidad: una sola categoría.
    const e = generarEntregables(v, { verificaciones: [], acciones: [], indicadores: [] });
    expect(e.pareto).toBeNull();
    expect(e.motivoSinPareto).toBe('una_sola_categoria');
    expect(e.informeMarkdown).toContain('una_sola_categoria');
  });
});
