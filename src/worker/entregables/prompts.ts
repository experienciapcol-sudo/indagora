// Prompts de entregables F5: instrucción común, evidencia relevante acotada y tarea por llamada.
import { recortar } from '../../nucleo/agente/aplicar';
import type { VistaAgente } from '../../nucleo/agente/tipos';
import type { CausaEvaluada } from '../../nucleo/agente/tipos';

export const VERSION_ENTREGABLES = 1;

export const INSTRUCCIONES_ENTREGABLES = `Eres el módulo de entregables de Indagora. Trabajas solo con las afirmaciones verificadas de la lista: cada hecho que uses lleva su id (por ejemplo E2-A05) en \`punteros\`. Nunca inventes hechos, cifras ni ids. Los niveles los calcula el código: N1 opinión, N2 testimonio específico, N3 corroborado entre roles, N4 documentado. Una causa con N0 a N2 solo admite verificación; intervenir pide N3 o N4 y que la causa explique todas las filas. Escribe breve, neutro, en el idioma de las fuentes y sin juzgar a las personas.`;

// Afirmaciones relevantes: evidencia de alguna causa o pendientes de corroboración. Cita recortada.
export function bloqueEvidenciaEntregables(vista: VistaAgente): string {
  const { estado } = vista;
  const relevantes = new Set<string>();
  for (const c of estado.causas) for (const id of c.evidencia) relevantes.add(id);
  for (const a of estado.afirmaciones) {
    if ((vista.niveles[a.id]?.pendientes ?? []).length > 0) relevantes.add(a.id);
  }
  const lista = estado.afirmaciones.filter((a) => relevantes.has(a.id));
  return [
    `Objetivo del consultor: ${estado.objetivo}`,
    `Caso: ${estado.titulo}`,
    '',
    lista.length ? 'Afirmaciones verificadas relevantes (id · rol · nivel · cita literal):' : 'Sin afirmaciones relevantes todavía.',
    ...lista.map((a) => `${a.id} · ${a.rol} · N${vista.niveles[a.id]?.nivel ?? 0} · "${recortar(a.cita, 260)}"`),
  ].join('\n');
}

const lineaCausa = (vista: VistaAgente, c: CausaEvaluada) => {
  const causa = vista.estado.causas.find((x) => x.id === c.id);
  return `- ${c.id} (N${c.nivel}, ${c.estado}, explica ${c.filasExplicadas}/${c.filasTotales} filas): ${causa?.enunciado ?? ''} [evidencia: ${causa?.evidencia.join(', ') ?? ''}]`;
};

export function tareaVerificacionEntregables(vista: VistaAgente, causas: readonly CausaEvaluada[]): string {
  return [
    'Causas abiertas indicadas por el código (solo verificación):',
    ...causas.map((c) => lineaCausa(vista, c)),
    '',
    `Tarea: para cada causa indicada como abierta, diseña su plan de verificación en ciclo PDSA de Deming: qué revisar, con quién o en qué documento, qué resultado concreto la confirma y cuál la descarta, y cuatro pasos (planear, hacer, estudiar, actuar) con responsable por rol y punteros. No propongas intervenir sobre estas causas.`,
  ].join('\n');
}

export function tareaIntervencionEntregables(vista: VistaAgente, causa: CausaEvaluada): string {
  return [
    'Causa elegible para intervenir según el código:',
    lineaCausa(vista, causa),
    '',
    `Tarea: propón de 2 a 5 acciones concretas sobre el mecanismo de la causa, nunca sobre las personas. Cada acción: texto, cuadrante de la matriz (eliminar, reducir, incrementar o crear), categoría de esfuerzo (bajo, medio o alto) y punteros. No calcules prioridades: las calcula el código.`,
  ].join('\n');
}

export function tareaIndicadoresEntregables(vista: VistaAgente, causas: readonly CausaEvaluada[]): string {
  return [
    'Causas con plan (verificación o intervención):',
    ...causas.map((c) => lineaCausa(vista, c)),
    '',
    `Tarea: propón fichas de indicador SMART (Doran 1981) para comprobar si la causa se corrige o si la verificación avanza: nombre, definición, fórmula con numerador y denominador, unidad, línea base solo si una afirmación la sostiene (si no, déjala vacía), meta con cifra y plazo, frecuencia, responsable por rol y punteros. Máximo 3 fichas por causa.`,
  ].join('\n');
}
