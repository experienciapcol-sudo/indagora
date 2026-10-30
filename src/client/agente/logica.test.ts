import { describe, expect, it } from 'vitest';
import type { Causa, CausaEvaluada, EventoTraza, FilaEsNoEs, HallazgoWeisbord, Juicio, Seleccion } from '../../nucleo/agente/tipos';
import type { NivelCalculado } from '../../nucleo/tipos';
import {
  agruparPorEspina,
  columnasDePrueba,
  compararIds,
  contarRechazos,
  esIdAfirmacion,
  nivelMaximo,
  ordenarFilas,
  parametrosLegibles,
  pasoSiguiente,
  proporcion,
  seccionesDelMetodo,
} from './logica';
import { VISTA_EJEMPLO } from './ejemplo';

const causa = (id: string, espina: Causa['espina']): Causa => ({ id, enunciado: id, espina, origen: [], evidencia: [] });
const evaluada = (id: string, extra: Partial<CausaEvaluada> = {}): CausaEvaluada => ({
  id,
  nivel: 2,
  estado: 'sin_probar',
  filasExplicadas: 0,
  filasTotales: 0,
  descartadaPor: [],
  contradicciones: [],
  verificacion: false,
  intervencion: false,
  principal: false,
  ...extra,
});

describe('contarRechazos', () => {
  it('cuenta por origen e ignora los demás eventos', () => {
    const traza: EventoTraza[] = [
      { n: 1, paso: 1, tipo: 'decision', accion: 'leer_fuentes', justificacion: '', punteros: [], parametros: '' },
      { n: 2, paso: 1, tipo: 'rechazo', origen: 'guarda', accion: 'detenerse', motivo: 'criterio_no_cumplido', detalle: '' },
      { n: 3, paso: 2, tipo: 'rechazo', origen: 'evidencia', accion: null, motivo: 'casilla_sin_evidencia', detalle: '' },
      { n: 4, paso: 2, tipo: 'rechazo', origen: 'evidencia', accion: null, motivo: 'evidencia_ajena', detalle: '' },
    ];
    expect(contarRechazos(traza)).toEqual({ total: 3, porOrigen: { guarda: 1, evidencia: 2, verificador: 0 } });
    expect(contarRechazos([]).total).toBe(0);
  });

  it('la vista de ejemplo trae entre 3 y 4 rechazos', () => {
    const { total } = contarRechazos(VISTA_EJEMPLO.estado.traza);
    expect(total).toBeGreaterThanOrEqual(3);
    expect(total).toBeLessThanOrEqual(4);
  });
});

describe('pasoSiguiente', () => {
  it('toma el mayor entre la traza y el presupuesto, más uno', () => {
    expect(pasoSiguiente([], null)).toBe(1);
    expect(pasoSiguiente([], { pasos: 2 })).toBe(3);
    const traza: EventoTraza[] = [{ n: 1, paso: 4, tipo: 'error', accion: null, detalle: '' }];
    expect(pasoSiguiente(traza, { pasos: 3 })).toBe(5);
  });
});

describe('parametrosLegibles', () => {
  it('formatea JSON como clave: valor y omite lo vacío', () => {
    expect(parametrosLegibles('{"fuentes":["E1","E2"],"causa":null,"documento":""}')).toBe('fuentes: E1, E2');
    expect(parametrosLegibles('{"causa":"C5"}')).toBe('causa: C5');
  });
  it('deja el texto plano tal cual', () => {
    expect(parametrosLegibles('  fuentes E1  ')).toBe('fuentes E1');
    expect(parametrosLegibles('')).toBe('');
    expect(parametrosLegibles('[1,2]')).toBe('[1,2]');
  });
});

describe('esIdAfirmacion', () => {
  it('reconoce ids de afirmación', () => {
    expect(esIdAfirmacion('E2-A05')).toBe(true);
    expect(esIdAfirmacion('D1-A12')).toBe(true);
    expect(esIdAfirmacion('E2-007')).toBe(false);
    expect(esIdAfirmacion('R1')).toBe(false);
  });
});

describe('nivelMaximo', () => {
  const niveles = { a: { nivel: 2 }, b: { nivel: 4 } } as unknown as Record<string, NivelCalculado>;
  it('toma el mayor y trata lo desconocido como N0', () => {
    expect(nivelMaximo(['a', 'b'], niveles)).toBe(4);
    expect(nivelMaximo(['x'], niveles)).toBe(0);
    expect(nivelMaximo([], niveles)).toBe(0);
  });
});

describe('agruparPorEspina', () => {
  const causas = [causa('C10', 'metodo'), causa('C2', 'metodo'), causa('C3', 'materiales'), causa('C4', 'liderazgo')];
  const evaluadas = [evaluada('C10', { principal: true }), evaluada('C2'), evaluada('C3'), evaluada('C4')];

  it('arma las seis espinas, con la principal primero y el id en orden numérico', () => {
    const { grupos, otras } = agruparPorEspina(causas, evaluadas, 'seis_m');
    expect(grupos.map((g) => g.espina)).toEqual(['mano_de_obra', 'maquinaria', 'materiales', 'metodo', 'medicion', 'medio_ambiente']);
    expect(grupos.find((g) => g.espina === 'metodo')!.causas.map((c) => c.causa.id)).toEqual(['C10', 'C2']);
    expect(grupos.find((g) => g.espina === 'mano_de_obra')!.causas).toEqual([]);
    expect(otras.map((c) => c.causa.id)).toEqual(['C4']);
  });

  it('con Weisbord usa las casillas como espinas', () => {
    const { grupos, otras } = agruparPorEspina(causas, evaluadas, 'weisbord');
    expect(grupos.map((g) => g.espina)).toEqual(['propositos', 'estructura', 'relaciones', 'recompensas', 'liderazgo', 'mecanismos']);
    expect(grupos.find((g) => g.espina === 'liderazgo')!.causas).toHaveLength(1);
    expect(otras.map((c) => c.causa.id)).toEqual(['C10', 'C2', 'C3']);
  });
});

describe('compararIds', () => {
  it('ordena por número y no por texto', () => {
    expect(['C10', 'C2', 'C1'].sort(compararIds)).toEqual(['C1', 'C2', 'C10']);
  });
});

describe('ordenarFilas', () => {
  it('ordena por dimensión y luego por id', () => {
    const fila = (id: string, dimension: FilaEsNoEs['dimension']) => ({ id, dimension }) as FilaEsNoEs;
    const r = ordenarFilas([fila('R4', 'cuanto'), fila('R2', 'donde'), fila('R1', 'que'), fila('R3', 'cuando')]);
    expect(r.map((f) => f.id)).toEqual(['R1', 'R2', 'R3', 'R4']);
  });
});

describe('seccionesDelMetodo', () => {
  const sel = (es: boolean, w: boolean) =>
    ({ herramientas: [{ herramienta: 'es_no_es', elegida: es, razon: '' }, { herramienta: 'weisbord', elegida: w, razon: '' }] }) as unknown as Seleccion;
  it('sin selección muestra el Es / No Es vacío', () => {
    expect(seccionesDelMetodo(null, null, null)).toEqual({ esNoEs: true, weisbord: false });
  });
  it('ruta crónica: solo Weisbord', () => {
    expect(seccionesDelMetodo(sel(false, true), null, null)).toEqual({ esNoEs: false, weisbord: true });
  });
  it('muestra lo que ya tiene datos aunque la selección no lo mencione', () => {
    expect(seccionesDelMetodo(sel(true, false), [], null)).toEqual({ esNoEs: true, weisbord: false });
    expect(seccionesDelMetodo(sel(true, true), [], [])).toEqual({ esNoEs: true, weisbord: true });
  });
});

describe('columnasDePrueba', () => {
  it('junta filas del Es / No Es y hallazgos de Weisbord con brecha o citados', () => {
    const filas = [{ id: 'R1', dimension: 'que', pregunta: '¿Qué muebles?' }] as FilaEsNoEs[];
    const hallazgos = [
      { id: 'W-liderazgo', casilla: 'liderazgo', estado: 'brecha' },
      { id: 'W-propositos', casilla: 'propositos', estado: 'sin_brecha' },
      { id: 'W-estructura', casilla: 'estructura', estado: 'sin_datos' },
    ] as HallazgoWeisbord[];
    const juicios = [{ causa: 'C1', fila: 'W-estructura', veredicto: 'sin_datos', razon: '', evidencia: [] }] as Juicio[];
    const cols = columnasDePrueba(filas, hallazgos, juicios, (d) => d.toUpperCase(), (c) => c);
    expect(cols.map((c) => c.id)).toEqual(['R1', 'W-liderazgo', 'W-estructura']);
    expect(cols[0].etiqueta).toBe('QUE: ¿Qué muebles?');
  });
});

describe('proporcion', () => {
  it('acota entre 0 y 1', () => {
    expect(proporcion(3, 12)).toBe(0.25);
    expect(proporcion(20, 12)).toBe(1);
    expect(proporcion(0, 0)).toBe(0);
    expect(proporcion(1, 0)).toBe(1);
  });
});
