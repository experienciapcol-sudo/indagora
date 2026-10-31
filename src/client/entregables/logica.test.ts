import { describe, expect, it } from 'vitest';
import type { AccionIntervencion, EntregablesCaso } from '../../nucleo/entregables/tipos';
import { anchoRelativo, esSoloVerificacion, gruposPorCarril, nombreArchivoInforme, parseInformeMarkdown, resumenDe } from './logica';

const accion = (id: string, carril: AccionIntervencion['carril']): AccionIntervencion => ({
  id, causa: 'C1', texto: `Acción ${id}`, cuadrante: 'eliminar', carril,
  prioridad: { impacto: 5, esfuerzo: 'bajo', esfuerzoPuntos: 1, puntaje: 5, clase: 'alta', razones: [] },
  punteros: ['E1-A01'],
});

const base = (parcial: Partial<EntregablesCaso>): EntregablesCaso => ({
  version: 1, agenteId: 'a1', huellaEstado: 'h', generadoEn: '', costoUsd: 0, demo: false,
  verificaciones: [], intervencion: null, motivoSinIntervencion: 'sin causa', indicadores: [],
  pareto: null, motivoSinPareto: 'sin_cifras_en_citas', guia: [], informeMarkdown: '', rechazos: [], ...parcial,
});

describe('entregables · lógica pura', () => {
  it('nombre de archivo: minúsculas, sin acentos ni espacios', () => {
    expect(nombreArchivoInforme('Carpintería Velandria')).toBe('indagora-carpinteria-velandria.md');
    expect(nombreArchivoInforme('  ¡Ó! ')).toBe('indagora-o.md');
    expect(nombreArchivoInforme('')).toBe('indagora-informe.md');
  });

  it('ancho relativo a la barra mayor', () => {
    expect(anchoRelativo(50, 100)).toBe(50);
    expect(anchoRelativo(100, 100)).toBe(100);
    expect(anchoRelativo(1, 0)).toBe(0);
    expect(anchoRelativo(0, 10)).toBe(0);
  });

  it('agrupa por carril en orden inmediato → corto → estructural', () => {
    const grupos = gruposPorCarril([accion('I1', 'estructural'), accion('I2', 'inmediato')]);
    expect(grupos.map((g) => g.carril)).toEqual(['inmediato', 'corto_plazo', 'estructural']);
    expect(grupos[0].acciones.map((a) => a.id)).toEqual(['I2']);
    expect(grupos[1].acciones).toEqual([]);
  });

  it('solo verificación cuando no hay intervención y sí planes', () => {
    const plan = { causa: 'C1', nivelAlGenerar: 2 as const, estadoAlGenerar: 'explica_todo' as const, queRevisar: 'x', conQuien: 'y', confirmaSi: 'a', descartaSi: 'b', pasos: [] };
    expect(esSoloVerificacion(base({ verificaciones: [plan] }))).toBe(true);
    expect(esSoloVerificacion(base({}))).toBe(false);
  });

  it('resumen cuenta cada entregable', () => {
    const e = base({ guia: [{ tipo: 'causa_abierta', pregunta: '¿?', paraQuien: 'Dueña', objetivo: 'x', punteros: [] }] });
    expect(resumenDe(e)).toEqual({ verificaciones: 0, acciones: 0, indicadores: 0, preguntasGuia: 1, barrasPareto: 0 });
  });

  it('parsea el Markdown del informe sin inventar bloques', () => {
    const bloques = parseInformeMarkdown('# Título\n\n## 1. Datos\n\n- **Causa:** C1\n  - detalle\n\nTexto suelto');
    expect(bloques).toEqual([
      { tipo: 'h1', texto: 'Título' },
      { tipo: 'h2', texto: '1. Datos' },
      { tipo: 'li', texto: 'Causa: C1', anidado: false },
      { tipo: 'li', texto: 'detalle', anidado: true },
      { tipo: 'p', texto: 'Texto suelto' },
    ]);
  });
});
