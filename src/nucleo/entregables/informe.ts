// Informe de devolución (Block 1981) en Markdown, ensamblado solo desde datos estructurados.
// Cada cita impresa es la cita reconstruida por el código de una afirmación del caso.
// Todo texto ajeno al código (títulos, citas, propuestas) se neutraliza: sin saltos de línea
// ni HTML ni corchetes de enlace, para que el .md exportado no altere la estructura ni
// inyecte HTML en el visor que lo abra.
import type { VistaAgente } from '../agente/tipos';
import { NOMBRE_NIVEL } from '../niveles';
import type { Nivel } from '../tipos';
import type { EntregablesCaso } from './tipos';
import { agruparPorCarril } from './matriz';

const NIVELES: Nivel[] = [0, 1, 2, 3, 4];

// Neutraliza un texto interpolado en el Markdown: una sola línea, sin HTML ni enlaces.
const limpio = (s: unknown): string =>
  String(s ?? '')
    .replace(/\s*[\r\n]+\s*/g, ' ')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');

export function generarInformeMarkdown(e: EntregablesCaso, vista: VistaAgente): string {
  const { estado } = vista;
  const porId = new Map(estado.afirmaciones.map((a) => [a.id, a]));
  const conCitas = (ids: readonly string[]): string[] =>
    ids.map((id) => {
      const a = porId.get(id);
      return a ? `- [${id}] «${limpio(a.cita)}»` : `- [${id}]`;
    });
  const linea = (ids: readonly string[]) => (ids.length ? ` (${ids.join(', ')})` : '');

  const out: string[] = [];
  out.push(`# Informe de devolución: ${limpio(estado.titulo)}`, '');
  out.push('## 1. Datos del caso', '');
  out.push(`- Objetivo: ${limpio(estado.objetivo)}`);
  out.push(`- Caso: ${limpio(e.agenteId)}`);
  // Sin metadatos finales (uso directo del núcleo) no se imprimen líneas vacías ni costo 0:
  // esas líneas solo aparecen cuando el Worker ya fijó generadoEn/costoUsd/demo.
  if (e.generadoEn) {
    out.push(`- Generado: ${limpio(e.generadoEn)}`);
    out.push(`- Costo de generación: ${e.costoUsd} USD${e.demo ? ' (modo demostración, sin costo)' : ''}`);
  }
  out.push('');

  out.push('## 2. Desviación', '');
  const d = estado.desviacion;
  if (!d) out.push('Sin desviación enunciada todavía.', '');
  else {
    const campos: [string, { texto: string; evidencia: string[] }][] = [
      ['Qué se esperaba', d.esperado], ['Qué ocurre', d.ocurre], ['Desde cuándo', d.desdeCuando], ['Cuánto', d.cuanto], ['Contraste', d.contraste],
    ];
    for (const [nombre, c] of campos) {
      if (!c.texto) continue;
      out.push(`- **${nombre}:** ${limpio(c.texto)}${linea(c.evidencia)}`, ...conCitas(c.evidencia));
    }
    out.push('');
  }

  out.push('## 3. Resumen de evidencia por niveles', '');
  const conteo = new Map<Nivel, number>(NIVELES.map((n) => [n, 0]));
  for (const a of estado.afirmaciones) {
    const n = vista.niveles[a.id]?.nivel ?? 0;
    conteo.set(n, (conteo.get(n) ?? 0) + 1);
  }
  for (const n of NIVELES) out.push(`- N${n} (${NOMBRE_NIVEL[n]}): ${conteo.get(n) ?? 0} afirmación(es)`);
  out.push('', 'Con una sola fuente ninguna afirmación pasa de N2; el nivel N3 pide corroboración entre roles confirmada y el N4, un documento.', '');

  out.push('## 4. Causas probadas y descartadas', '');
  if (estado.causas.length === 0) out.push('Sin causas todavía.', '');
  for (const c of estado.causas) {
    const ev = vista.causas.find((x) => x.id === c.id);
    out.push(`### ${limpio(c.id)}: ${limpio(c.enunciado)}`, '');
    out.push(`- Estado: ${ev?.estado ?? 'sin_probar'}; nivel: N${ev?.nivel ?? 0}; filas explicadas: ${ev?.filasExplicadas ?? 0}/${ev?.filasTotales ?? 0}${c.evidencia.length ? linea(c.evidencia) : ''}`);
    out.push(...conCitas(c.evidencia), '');
  }

  out.push('## 5. Plan de verificación', '');
  if (e.verificaciones.length === 0) out.push('Sin planes de verificación en esta generación.', '');
  for (const v of e.verificaciones) {
    out.push(`### ${limpio(v.causa)} (N${v.nivelAlGenerar}, ${v.estadoAlGenerar})`, '');
    out.push(`- Qué revisar: ${limpio(v.queRevisar)}`, `- Con quién: ${limpio(v.conQuien)}`, `- Confirma si: ${limpio(v.confirmaSi)}`, `- Descarta si: ${limpio(v.descartaSi)}`);
    for (const paso of v.pasos) out.push(`- PDSA ${paso.fase}: ${limpio(paso.texto)} (responsable: ${limpio(paso.responsable)})${linea(paso.punteros)}`, ...conCitas(paso.punteros));
    out.push('');
  }

  out.push('## 6. Plan de intervención', '');
  if (!e.intervencion) out.push(`Sin plan de intervención: ${limpio(e.motivoSinIntervencion ?? 'no hay causa elegible.')}`, '');
  else {
    out.push(`Causa: ${limpio(e.intervencion.causa)} (N${e.intervencion.nivelAlGenerar})`, '');
    const carriles = agruparPorCarril(e.intervencion.acciones);
    const nombres = { inmediato: 'Carril inmediato', corto_plazo: 'Carril de corto plazo', estructural: 'Carril estructural' } as const;
    for (const carril of ['inmediato', 'corto_plazo', 'estructural'] as const) {
      out.push(`### ${nombres[carril]}`, '');
      if (carriles[carril].length === 0) out.push('Sin acciones en este carril.', '');
      for (const a of carriles[carril]) {
        out.push(`- **${a.id}** (${a.cuadrante}): ${limpio(a.texto)}${linea(a.punteros)}`);
        out.push(`  - Prioridad ${a.prioridad.clase}: puntaje ${a.prioridad.puntaje}, impacto ${a.prioridad.impacto}, esfuerzo ${a.prioridad.esfuerzo}. Razones: ${limpio(a.prioridad.razones.join('; '))}`);
        out.push(...conCitas(a.punteros).map((s) => `  ${s}`));
      }
      out.push('');
    }
    out.push('### Matriz de las cuatro acciones', '');
    for (const q of ['eliminar', 'reducir', 'incrementar', 'crear'] as const) {
      out.push(`- ${q}: ${e.intervencion.matriz[q].length ? e.intervencion.matriz[q].join(', ') : 'sin propuesta'}`);
    }
    out.push('', '### Listas de verificación del cambio', '');
    out.push(`- Descongelar: ${limpio(e.intervencion.listasCambio.descongelar.join(' '))}`);
    out.push(`- Mover: ${limpio(e.intervencion.listasCambio.mover.join(' '))}`);
    out.push(`- Recongelar: ${limpio(e.intervencion.listasCambio.recongelar.join(' '))}`, '');
  }

  out.push('## 7. Indicadores', '');
  if (e.indicadores.length === 0) out.push('Sin fichas de indicador en esta generación.', '');
  for (const k of e.indicadores) {
    out.push(`### ${k.id}: ${limpio(k.nombre)} (${limpio(k.causa)})`, '');
    out.push(`- Definición: ${limpio(k.definicion)}`, `- Fórmula: ${limpio(k.formula)}`, `- Unidad: ${limpio(k.unidad)}`);
    out.push(`- Línea base: ${k.lineaBase ? limpio(k.lineaBase) : 'pendiente: ninguna afirmación la sostiene todavía'}`);
    out.push(`- Meta: ${limpio(k.meta)}; plazo: ${limpio(k.plazo)}; frecuencia: ${k.frecuencia}; responsable: ${limpio(k.responsable)}${linea(k.punteros)}`);
    out.push(`- SMART: ${k.smart.completa ? 'completa' : `incompleta: faltan ${limpio(k.smart.faltan.join(', '))}`}`);
    out.push(...conCitas(k.punteros), '');
  }

  out.push('## 8. Concentración de causas (Pareto)', '');
  if (!e.pareto) out.push(`Sin Pareto: ${limpio(e.motivoSinPareto ?? 'sin datos aptos')}. No se dibuja con cifras de memoria ni propuestas por el modelo.`, '');
  else {
    out.push(`Unidad: ${limpio(e.pareto.unidad)}; total: ${e.pareto.total}`, '');
    for (const b of e.pareto.barras) {
      out.push(`- ${limpio(b.categoria)}: ${b.valor} ${limpio(b.unidad)} (${b.porcentaje}%, acumulado ${b.acumulado}%)${linea(b.afirmaciones)}`, ...conCitas(b.afirmaciones));
    }
    out.push('');
  }

  out.push('## 9. Guía de la siguiente entrevista', '');
  if (e.guia.length === 0) out.push('Sin vacíos pendientes registrados.', '');
  for (const g of e.guia) out.push(`- [${g.tipo}] ${limpio(g.pregunta)} — Para quién: ${limpio(g.paraQuien)}. Objetivo: ${limpio(g.objetivo)}${linea(g.punteros)}`);
  out.push('');

  out.push('## 10. Traza resumida y rechazos', '');
  out.push(`- Eventos en la traza del agente: ${estado.traza.length}`);
  for (const ev of estado.traza) {
    if (ev.tipo === 'decision') out.push(`- Paso ${ev.paso}: decisión ${ev.accion} — ${limpio(ev.justificacion)}${linea(ev.punteros)}`);
    else if (ev.tipo === 'resultado') out.push(`- Paso ${ev.paso}: resultado ${ev.accion} — ${limpio(ev.resumen)}`);
    else if (ev.tipo === 'rechazo') out.push(`- Paso ${ev.paso}: rechazo (${ev.origen}) ${ev.accion ?? ''} ${ev.motivo}: ${limpio(ev.detalle)}`);
    else if (ev.tipo === 'fin') out.push(`- Paso ${ev.paso}: fin (${ev.motivo}): ${limpio(ev.detalle)}`);
  }
  if (e.rechazos.length) {
    out.push('', 'Rechazos de esta generación:');
    for (const r of e.rechazos) out.push(`- ${limpio(r.elemento)}: ${r.motivo} — ${limpio(r.detalle)}`);
  }
  out.push('');
  return out.join('\n');
}

// Nombre pedido para el generador del informe en la tarea.
export const renderInforme = generarInformeMarkdown;
