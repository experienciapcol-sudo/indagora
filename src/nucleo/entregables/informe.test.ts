import { describe, expect, it } from 'vitest';
import { generarEntregables, huellaDeEstado } from './generar';
import { pasosPDSA, vistaTaller } from './fixture';

const propuestas = () => ({
  verificaciones: [],
  acciones: [{ causa: 'C1', texto: 'Pedir cotización a dos proveedores', cuadrante: 'crear' as const, esfuerzo: 'bajo' as const, punteros: ['E1-A01'] }],
  indicadores: [{
    nombre: 'Plazo de herraje', definicion: 'Días promedio de entrega', formula: 'suma de días / número de pedidos',
    unidad: 'días', lineaBase: '9,4 días', meta: 'Bajar a 4 días', plazo: 'en 2 meses', frecuencia: 'semanal' as const,
    responsable: 'Jefe de taller', causa: 'C1', punteros: ['E1-A01'],
  }],
});

describe('informe y orquestador', () => {
  it('genera los entregables del taller: intervención, matriz, Pareto o motivo, guía e informe', () => {
    const v = vistaTaller();
    const e = generarEntregables(v, propuestas());
    expect(e.version).toBe(1);
    expect(e.intervencion?.causa).toBe('C1');
    expect(e.intervencion?.matriz.crear).toEqual(['I1']);
    expect(e.intervencion?.matriz.eliminar).toEqual([]);
    expect(e.indicadores[0].smart.completa).toBe(true);
    expect(e.guia.length).toBeGreaterThan(0);
    expect(e.huellaEstado).toBe(huellaDeEstado(v));
    expect(e.informeMarkdown).toContain('Carpintería Velandria');
    expect(e.informeMarkdown).toContain('I1');
  });

  it('toda cita del Markdown existe en las afirmaciones y todo puntero citado aparece', () => {
    const v = vistaTaller();
    const e = generarEntregables(v, propuestas());
    // Extraer textos entre « » del informe: deben ser citas literales de afirmaciones.
    const citasVista = new Set(v.estado.afirmaciones.map((a) => a.cita));
    const enInforme = [...e.informeMarkdown.matchAll(/«([^»]+)»/g)].map((m) => m[1]);
    expect(enInforme.length).toBeGreaterThan(0);
    for (const c of enInforme) expect(citasVista.has(c)).toBe(true);
    for (const id of ['E1-A01', 'E2-A01']) expect(e.informeMarkdown).toContain(id);
  });

  it('no rotula nada de una sola fuente como verificado', () => {
    const v = vistaTaller();
    const e = generarEntregables(v, propuestas());
    expect(e.informeMarkdown.toLowerCase()).not.toContain('verificad');
  });

  it('regeneración sin cambios: misma huella', () => {
    const v = vistaTaller();
    expect(huellaDeEstado(v)).toBe(huellaDeEstado(vistaTaller()));
    const conVerificacion = generarEntregables(vistaTaller(), { ...propuestas(), verificaciones: [{
      causa: 'C2', queRevisar: 'x', conQuien: 'y', confirmaSi: 'a', descartaSi: 'b', pasos: pasosPDSA(['E1-A01']),
    }] });
    // C2 está descartada o no elegible para verificación plena: no debe colar plan si está descartada.
    const v2 = vistaTaller();
    if (v2.causas.find((c) => c.id === 'C2')?.estado === 'descartada') {
      expect(conVerificacion.verificaciones).toEqual([]);
      expect(conVerificacion.rechazos.some((r) => r.motivo === 'causa_descartada')).toBe(true);
    }
  });
});
