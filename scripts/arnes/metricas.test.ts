// Pruebas de las métricas y de la carga de casos, sin red.
import { describe, expect, it } from 'vitest';
import { CASO_TALLER } from '../../src/nucleo/casos/taller';
import type { VistaAgente } from '../../src/nucleo/agente/tipos';
import { cargarCasos, validarCaso, CASO_TALLER_EVALUACION } from './casos';
import { contarFugas, metricasDe, metricasDesdeVista, resumir, verificarCitas } from './metricas';

describe('metricasDe', () => {
  it('marca prematura la intervención en N2, en distractor y sin nivel; no en N3', () => {
    const m = metricasDe({
      caso: CASO_TALLER_EVALUACION,
      causaEncontrada: true,
      citasInvalidasAtrapadas: 2,
      casillasSinOracion: 1,
      textosSalida: [],
      intervenciones: [
        { enunciadoCausa: 'Falta herraje del proveedor', nivel: 2 },
        { enunciadoCausa: 'El personal es flojo', nivel: 4 },
        { enunciadoCausa: 'Falta herraje del proveedor', nivel: 3 },
        { enunciadoCausa: 'Falta herraje del proveedor', nivel: null },
      ],
    });
    expect(m.intervencionesPrematuras).toBe(3);
    expect(m.fugas).toBeNull(); // el taller no es del Laboratorio
  });

  it('cuenta fugas solo con fragmentos prohibidos presentes', () => {
    const caso = { ...CASO_TALLER_EVALUACION, laboratorio: { fragmentosProhibidos: ['la causa oculta es X', 'dato reservado'] } };
    expect(contarFugas(['Se propone revisar la causa oculta es x'], caso.laboratorio.fragmentosProhibidos)).toBe(1);
  });
});

describe('verificarCitas', () => {
  it('atrapa ids inexistentes y anclas que no están en la oración', () => {
    const fuente = CASO_TALLER.fuentes[1]; // E2
    const { oraciones } = { oraciones: [] as never[] };
    void oraciones;
    const r = verificarCitas([fuente], [
      { fuente: 'E2', resumen: 'x', oraciones: [{ id: 'E2-999', ancla: 'no existe esto' }] },
      { fuente: 'E2', resumen: 'y', oraciones: [{ id: 'E2-001', ancla: 'palabras que no están' }] },
      { fuente: 'E9', resumen: 'z', oraciones: [{ id: 'E9-001', ancla: 'algo' }] },
    ]);
    expect(r.invalidas).toBeGreaterThanOrEqual(3);
  });
});

describe('metricasDesdeVista y resumir', () => {
  it('extrae causa, nivel y casillas de una vista fabricada', () => {
    const vista = {
      estado: {
        causas: [{ id: 'C1', enunciado: 'El proveedor de herraje tarda más', espina: 'materiales', origen: [], evidencia: [] }],
        intervenciones: [{ causa: 'C1', accion: 'Cambiar proveedor', evidencia: [] }],
        desviacion: { esperado: { texto: 'a tiempo', evidencia: [] }, ocurre: { texto: 'tarde', evidencia: ['E1-A01'] }, desdeCuando: { texto: '', evidencia: [] }, cuanto: { texto: '', evidencia: [] }, contraste: { texto: '', evidencia: [] } },
        esNoEs: null, weisbord: null, traza: [],
      },
      causas: [{ id: 'C1', nivel: 2, estado: 'explica_todo', filasExplicadas: 1, filasTotales: 1, descartadaPor: [], contradicciones: [], verificacion: false, intervencion: true, principal: true }],
      criterio: { cumplido: false, principal: 'C1', cumplidos: [], faltantes: [] },
    } as unknown as VistaAgente;
    const m = metricasDesdeVista(vista, CASO_TALLER_EVALUACION, 0);
    expect(m.causaEncontrada).toBe(true);
    expect(m.intervencionesPrematuras).toBe(1); // N2
    expect(m.casillasSinOracion).toBe(1); // "esperado" lleno sin evidencia
    const r = resumir([m, m], 1.5);
    expect(r.n).toBe(2);
    expect(r.causaEncontrada).toBe(1);
  });
});

describe('casos', () => {
  it('el taller es el caso 0 y valida contra su verdad', () => {
    const casos = cargarCasos();
    expect(casos[0].id).toBe('taller');
    expect(validarCaso(casos[0])).toEqual([]);
  });

  it('rechaza un fragmento que no aparece exactamente una vez', () => {
    const roto = structuredClone(CASO_TALLER_EVALUACION);
    roto.verdad.oracionesClave[0].fragmento = 'fragmento que no existe en el caso';
    expect(validarCaso(roto).length).toBeGreaterThan(0);
  });
});
