// Revisión en código de las propuestas del modelo: punteros reales, elegibilidad y campos.
// Lo que no pasa queda registrado en rechazos; los indicadores SMART incompletos se conservan marcados.
import type { VistaAgente } from '../agente/tipos';
import { elegibleParaIntervencion, elegibleParaVerificacion } from './elegibilidad';
import { carrilDe, prioridadDe } from './prioridad';
import { CUADRANTES } from './matriz';
import type {
  AccionIntervencion, AccionPropuesta, EsfuerzoPropuesto, FichaIndicador, IndicadorPropuesto,
  PasoPDSA, PlanVerificacion, RechazoEntregable, VerificacionPropuesta,
} from './tipos';

const FASES: PasoPDSA['fase'][] = ['planear', 'hacer', 'estudiar', 'actuar'];
const ESFUERZOS: EsfuerzoPropuesto[] = ['bajo', 'medio', 'alto'];

class RevisorEntregables {
  readonly rechazos: RechazoEntregable[] = [];
  readonly ids: Set<string>;
  constructor(vista: VistaAgente) { this.ids = new Set(vista.estado.afirmaciones.map((a) => a.id)); }
  rechazar(elemento: string, motivo: RechazoEntregable['motivo'], detalle: string) {
    this.rechazos.push({ elemento, motivo, detalle });
  }
  // Devuelve punteros válidos o null si el elemento debe descartarse.
  // Si se dan `permitidos`, además de existir deben pertenecer a la evidencia de la causa.
  punteros(elemento: string, punteros: readonly string[], permitidos?: ReadonlySet<string>): string[] | null {
    if (!punteros || punteros.length === 0) {
      this.rechazar(elemento, 'sin_punteros', `${elemento}: no señala ninguna afirmación`);
      return null;
    }
    const invalidos = [...new Set(punteros.filter((id) => !this.ids.has(id)))];
    if (invalidos.length) {
      this.rechazar(elemento, 'puntero_inexistente', `${elemento}: ${invalidos.join(', ')} no es una afirmación del caso`);
      return null;
    }
    // Los punteros ajenos a la evidencia de la causa se quitan; el elemento solo se descarta
    // si no le queda ninguno pertinente.
    const ajenos = permitidos ? [...new Set(punteros.filter((id) => !permitidos.has(id)))] : [];
    const validos = [...new Set(punteros.filter((id) => !ajenos.includes(id)))];
    if (ajenos.length) {
      this.rechazar(elemento, 'puntero_no_pertinente', validos.length
        ? `${elemento}: se quitaron ${ajenos.join(', ')}, que no forman parte de la evidencia de la causa`
        : `${elemento}: ${ajenos.join(', ')} existe(n) pero no forma(n) parte de la evidencia de la causa`);
    }
    return validos.length ? validos : null;
  }
  causa(vista: VistaAgente, elemento: string, causaId: string) {
    const evaluada = vista.causas.find((c) => c.id === causaId);
    if (!evaluada || !vista.estado.causas.some((c) => c.id === causaId)) {
      this.rechazar(elemento, 'causa_inexistente', `${elemento}: la causa ${causaId} no existe en el caso`);
      return null;
    }
    if (evaluada.estado === 'descartada') {
      this.rechazar(elemento, 'causa_descartada', `${elemento}: la causa ${causaId} está descartada`);
      return null;
    }
    return evaluada;
  }
}

const vacio = (s: string | null | undefined) => !s || s.trim() === '';

// Evidencia declarada por el código para una causa: único ámbito pertinente de sus punteros.
const evidenciaDeCausa = (vista: VistaAgente, causaId: string): ReadonlySet<string> =>
  new Set(vista.estado.causas.find((c) => c.id === causaId)?.evidencia ?? []);

const numerosDeTexto = (s: string): number[] =>
  [...s.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(',', '.'))).filter((n) => Number.isFinite(n));

// La línea base solo vale si TODAS sus cifras aparecen literalmente en la cita o en la
// especificidad detectada por el código de alguna afirmación señalada. Si no, queda null.
function lineaBaseSostenida(vista: VistaAgente, punteros: readonly string[], lineaBase: string | null | undefined): string | null {
  const texto = lineaBase?.trim();
  if (!texto) return null;
  const cifras = numerosDeTexto(texto);
  if (cifras.length === 0) return null;
  const porId = new Map(vista.estado.afirmaciones.map((a) => [a.id, a]));
  const sostenidas = new Set<number>();
  for (const id of punteros) {
    const a = porId.get(id);
    if (!a) continue;
    for (const n of numerosDeTexto(a.cita)) sostenidas.add(n);
    for (const n of a.especificidad.flatMap(numerosDeTexto)) sostenidas.add(n);
  }
  return cifras.every((n) => sostenidas.has(n)) ? texto : null;
}

export function aplicarVerificaciones(
  vista: VistaAgente, propuestas: readonly VerificacionPropuesta[],
): { verificaciones: PlanVerificacion[]; rechazos: RechazoEntregable[] } {
  const r = new RevisorEntregables(vista);
  const salida: PlanVerificacion[] = [];
  for (const p of propuestas) {
    const elemento = `Verificación de ${p.causa || '?'}`;
    const evaluada = r.causa(vista, elemento, p.causa);
    if (!evaluada) continue;
    if (!elegibleParaVerificacion(evaluada)) {
      // Una causa elegible para intervenir no necesita plan de verificación en este entregable.
      r.rechazar(elemento, 'causa_ya_elegible_intervencion', `${elemento}: ${p.causa} ya es elegible para intervenir, no para verificar`);
      continue;
    }
    if ([p.queRevisar, p.conQuien, p.confirmaSi, p.descartaSi].some(vacio)) {
      r.rechazar(elemento, 'campo_vacio', `${elemento}: falta qué revisar, con quién, qué confirma o qué descarta`);
      continue;
    }
    if (!p.pasos || p.pasos.length !== 4 || p.pasos.some((paso, i) => paso.fase !== FASES[i] || vacio(paso.texto) || vacio(paso.responsable))) {
      r.rechazar(elemento, 'campo_vacio', `${elemento}: los pasos PDSA deben ser 4 (planear, hacer, estudiar, actuar), con texto y responsable por rol`);
      continue;
    }
    let ok = true;
    const pasos: PasoPDSA[] = [];
    const permitidos = evidenciaDeCausa(vista, p.causa);
    for (const paso of p.pasos) {
      const punteros = r.punteros(`${elemento}, paso ${paso.fase}`, paso.punteros, permitidos);
      if (!punteros) { ok = false; break; }
      pasos.push({ fase: paso.fase, texto: paso.texto.trim(), responsable: paso.responsable.trim(), punteros });
    }
    if (!ok) continue;
    salida.push({
      causa: p.causa, nivelAlGenerar: evaluada.nivel, estadoAlGenerar: evaluada.estado,
      queRevisar: p.queRevisar.trim(), conQuien: p.conQuien.trim(),
      confirmaSi: p.confirmaSi.trim(), descartaSi: p.descartaSi.trim(), pasos,
    });
  }
  return { verificaciones: salida, rechazos: r.rechazos };
}

export function aplicarAcciones(
  vista: VistaAgente, propuestas: readonly AccionPropuesta[],
): { acciones: AccionIntervencion[]; rechazos: RechazoEntregable[] } {
  const r = new RevisorEntregables(vista);
  interface Pendiente { propuesta: AccionPropuesta; punteros: string[]; orden: number; evaluada: VistaAgente['causas'][number] }
  const pendientes: Pendiente[] = [];
  propuestas.forEach((p, orden) => {
    const elemento = `Acción para ${p.causa || '?'}: ${(p.texto ?? '').trim().slice(0, 60) || '(sin texto)'}`;
    const evaluada = r.causa(vista, elemento, p.causa);
    if (!evaluada) return;
    if (!elegibleParaIntervencion(evaluada)) {
      r.rechazar(elemento, 'causa_no_elegible_intervencion',
        `${elemento}: ${p.causa} tiene N${evaluada.nivel} y estado ${evaluada.estado}; intervenir pide N3 o N4, explicar todas las filas y no tener contradicciones abiertas`);
      return;
    }
    if (vacio(p.texto)) { r.rechazar(elemento, 'campo_vacio', `${elemento}: texto vacío`); return; }
    if (!CUADRANTES.includes(p.cuadrante)) { r.rechazar(elemento, 'cuadrante_invalido', `${elemento}: cuadrante "${String(p.cuadrante)}" fuera de la matriz`); return; }
    if (!ESFUERZOS.includes(p.esfuerzo)) { r.rechazar(elemento, 'campo_vacio', `${elemento}: esfuerzo fuera del enum bajo/medio/alto`); return; }
    const punteros = r.punteros(elemento, p.punteros, evidenciaDeCausa(vista, p.causa));
    if (!punteros) return;
    pendientes.push({ propuesta: p, punteros, orden, evaluada });
  });
  const conPrioridad = pendientes.map((x) => ({ ...x, prioridad: prioridadDe(x.evaluada, x.propuesta.esfuerzo) }));
  conPrioridad.sort((a, b) => b.prioridad.puntaje - a.prioridad.puntaje || b.prioridad.impacto - a.prioridad.impacto || a.orden - b.orden);
  const acciones: AccionIntervencion[] = conPrioridad.map((x, i) => ({
    id: `I${i + 1}`, causa: x.propuesta.causa, texto: x.propuesta.texto.trim(), cuadrante: x.propuesta.cuadrante,
    carril: carrilDe(x.prioridad.clase), prioridad: x.prioridad, punteros: x.punteros,
  }));
  return { acciones, rechazos: r.rechazos };
}

// Alias descriptivo para las tareas siguientes.
export const aplicarIntervenciones = aplicarAcciones;

export function smartDe(p: IndicadorPropuesto): { completa: boolean; faltan: string[] } {
  const faltan: string[] = [];
  if (vacio(p.definicion)) faltan.push('sin definición');
  if (vacio(p.formula) || !(/[/÷]/.test(p.formula) || /numerador/i.test(p.formula))) faltan.push('fórmula sin numerador y denominador');
  if (vacio(p.unidad)) faltan.push('sin unidad');
  if (vacio(p.lineaBase)) faltan.push('sin línea base');
  if (vacio(p.meta) || !/\d/.test(p.meta)) faltan.push('meta sin cifra');
  if (vacio(p.plazo)) faltan.push('sin plazo');
  if (vacio(p.responsable)) faltan.push('sin responsable');
  if (!p.frecuencia) faltan.push('sin frecuencia');
  return { completa: faltan.length === 0, faltan };
}

export function aplicarIndicadores(
  vista: VistaAgente, propuestas: readonly IndicadorPropuesto[],
): { indicadores: FichaIndicador[]; rechazos: RechazoEntregable[] } {
  const r = new RevisorEntregables(vista);
  const salida: FichaIndicador[] = [];
  for (const p of propuestas) {
    const elemento = `Indicador ${p.nombre?.trim() || '(sin nombre)'} para ${p.causa || '?'}`;
    const evaluada = r.causa(vista, elemento, p.causa);
    if (!evaluada) continue;
    if (vacio(p.nombre) || vacio(p.definicion) || vacio(p.formula)) {
      r.rechazar(elemento, 'campo_vacio', `${elemento}: falta nombre, definición o fórmula`);
      continue;
    }
    const punteros = r.punteros(elemento, p.punteros, evidenciaDeCausa(vista, p.causa));
    if (!punteros) continue;
    // Línea base inventada o sin cifras: se anula y la ficha queda SMART incompleta, no se descarta.
    const lineaBase = lineaBaseSostenida(vista, punteros, p.lineaBase);
    const smart = smartDe({ ...p, lineaBase });
    if (p.lineaBase?.trim() && !lineaBase) {
      smart.faltan = smart.faltan.map((f) => (f === 'sin línea base' ? 'línea base sin sustento en las citas señaladas' : f));
      smart.completa = false;
    }
    salida.push({
      id: `K${salida.length + 1}`, nombre: p.nombre.trim(), definicion: p.definicion.trim(), formula: p.formula.trim(),
      unidad: (p.unidad ?? '').trim(), lineaBase,
      meta: (p.meta ?? '').trim(), plazo: (p.plazo ?? '').trim(), frecuencia: p.frecuencia,
      responsable: (p.responsable ?? '').trim(), causa: p.causa, punteros, smart,
    });
  }
  return { indicadores: salida, rechazos: r.rechazos };
}
