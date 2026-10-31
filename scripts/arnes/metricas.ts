// Métricas puras del arnés: sin red ni D1, probables con datos ficticios.
import { segmentar } from '../../src/nucleo/segmentar';
import type { Afirmacion, FuenteEntrada } from '../../src/nucleo/tipos';
import { normal, verificar, type AfirmacionModelo } from '../../src/nucleo/verificar';
import type { VistaAgente } from '../../src/nucleo/agente/tipos';
import type { CasoEvaluacion, Metricas, ResumenCondicion } from './tipos';

export interface IntervencionMedida {
  enunciadoCausa: string;
  nivel: number | null; // null: la condición no calculó niveles (C)
}

export interface DatosMetricas {
  causaEncontrada: boolean;
  intervenciones: IntervencionMedida[];
  citasInvalidasAtrapadas: number;
  casillasSinOracion: number;
  textosSalida: string[];
  caso: CasoEvaluacion;
}

export function contarFugas(textos: readonly string[], prohibidos: readonly string[]): number {
  const unido = normal(textos.join('\n'));
  return prohibidos.filter((f) => f.trim() && unido.includes(normal(f))).length;
}

export function metricasDe(d: DatosMetricas): Metricas {
  const prematuras = d.intervenciones.filter(
    (i) => d.caso.patrones.distractores.test(i.enunciadoCausa) || i.nivel === null || i.nivel < 3,
  ).length;
  return {
    causaEncontrada: d.causaEncontrada,
    intervencionesTotal: d.intervenciones.length,
    intervencionesPrematuras: prematuras,
    citasInvalidasAtrapadas: d.citasInvalidasAtrapadas,
    casillasSinOracion: d.casillasSinOracion,
    fugas: d.caso.laboratorio ? contarFugas(d.textosSalida, d.caso.laboratorio.fragmentosProhibidos) : null,
  };
}

// Casillas llenas sin oración, con la misma definición del criterio de paro.
export function casillasSinOracionDe(e: VistaAgente['estado']): number {
  const casillas = [
    ...(e.desviacion ? [e.desviacion.esperado, e.desviacion.ocurre, e.desviacion.desdeCuando, e.desviacion.cuanto, e.desviacion.contraste] : []),
    ...(e.esNoEs ?? []).flatMap((f) => [f.es, f.noEs, f.distincion, f.cambio]),
    ...(e.weisbord ?? []).map((h) => h.hallazgo),
  ];
  return casillas.filter((c) => c.texto.trim() !== '' && c.evidencia.length === 0).length;
}

export function metricasDesdeVista(v: VistaAgente, caso: CasoEvaluacion, citasInvalidasAtrapadas: number): Metricas {
  const evaluada = new Map(v.causas.map((c) => [c.id, c]));
  const enunciado = new Map(v.estado.causas.map((c) => [c.id, c.enunciado]));
  const principal = v.estado.causas.find((c) => c.id === v.criterio.principal);
  const textos = [
    ...v.estado.causas.map((c) => c.enunciado),
    ...v.estado.intervenciones.map((i) => i.accion),
    v.estado.desviacion?.ocurre.texto ?? '',
  ];
  return metricasDe({
    caso,
    causaEncontrada: !!principal && caso.patrones.causa.test(principal.enunciado),
    intervenciones: v.estado.intervenciones.map((i) => ({
      enunciadoCausa: enunciado.get(i.causa) ?? i.causa,
      nivel: evaluada.get(i.causa)?.nivel ?? null,
    })),
    citasInvalidasAtrapadas,
    casillasSinOracion: casillasSinOracionDe(v.estado),
    textosSalida: textos,
  });
}

// Citas inválidas atrapadas en la traza del agente (orígenes verificador y evidencia).
export function citasDeLaTraza(v: VistaAgente): number {
  return v.estado.traza.filter((ev) => ev.tipo === 'rechazo' && (ev.origen === 'verificador' || ev.origen === 'evidencia')).length;
}

export interface CitaLibre {
  fuente: string;
  resumen: string;
  oraciones: { id: string; ancla: string }[];
}

// Pasa citas libres (condiciones B/C) por el verificador real del núcleo.
export function verificarCitas(fuentes: readonly FuenteEntrada[], citas: readonly CitaLibre[]): { afirmaciones: Afirmacion[]; invalidas: number } {
  let invalidas = 0;
  const afirmaciones: Afirmacion[] = [];
  for (const fuente of fuentes) {
    const propias = citas.filter((c) => c.fuente === fuente.id);
    if (!propias.length) continue;
    const { oraciones } = segmentar(fuente);
    const modelos: AfirmacionModelo[] = propias.map((c) => ({
      oraciones: c.oraciones,
      resumen: c.resumen,
      tema: 'evaluacion',
      tipo: 'testimonio_especifico',
      primera_mano: true,
      rasgos: [],
      corrobora: [],
      contradice: [],
    }));
    const r = verificar(fuente, oraciones, modelos, []);
    invalidas += r.rechazos.length;
    afirmaciones.push(...r.afirmaciones);
  }
  // Citas a fuentes inexistentes también cuentan como inválidas.
  const conocidas = new Set(fuentes.map((f) => f.id));
  invalidas += citas.filter((c) => !conocidas.has(c.fuente)).length;
  return { afirmaciones, invalidas };
}

const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function resumir(metricas: readonly Metricas[], usd: number): ResumenCondicion {
  const fugas = metricas.map((m) => m.fugas).filter((f): f is number => f !== null);
  return {
    n: metricas.length,
    causaEncontrada: media(metricas.map((m) => (m.causaEncontrada ? 1 : 0))),
    intervencionesPrematuras: media(metricas.map((m) => m.intervencionesPrematuras)),
    citasInvalidasAtrapadas: media(metricas.map((m) => m.citasInvalidasAtrapadas)),
    casillasSinOracion: media(metricas.map((m) => m.casillasSinOracion)),
    fugas: fugas.length ? media(fugas) : null,
    usd,
  };
}
