// English strings for the deliverables. Same shape as TEXTOS_ENTREGABLES_ES (checked by type).
import type { TextosEntregables } from './textos';

export const TEXTOS_ENTREGABLES_EN: TextosEntregables = {
  titulo: 'Diagnosis deliverables',
  ayuda:
    'Verification plan, intervention plan, indicators, cause concentration, next-interview guide, and report. Priorities and the Pareto chart are computed by the code; every item points to its evidence.',
  botonGenerar: 'Generate deliverables',
  botonRegenerar: 'Generate again',
  generando: 'Generating…',
  aunNo: 'No deliverables yet',
  aunNoAyuda: 'When the agent finishes (by criterion or waiting for the consultant) you can generate them from the current state.',
  desactualizado: 'These deliverables no longer match the current state: generate them again',
  demo: 'Generated in demo mode, at no cost',
  costo: (usd: number) => `Generation cost: ${usd !== 0 && Math.abs(usd) < 0.01 ? usd.toFixed(3) : usd.toFixed(2)} USD`,
  generadoEn: (fecha: string) => `Generated: ${fecha}`,
  errorCargar: 'The saved deliverables could not be loaded.',
  errorGenerar: (mensaje: string) => `The deliverables could not be generated: ${mensaje}`,
  soloVerificacion: 'Verification only',
  soloVerificacionAyuda:
    'This cause does not admit intervention yet: it must first be verified and raised to N3 (corroborated across roles) or N4 (documented), explaining every row and with no contradictions.',
  rechazos: (n: number) => `The code rejected ${n} proposed item(s); they are recorded in the report.`,

  verificacion: {
    titulo: 'Verification plan',
    ayuda: 'Deming’s PDSA cycle for each cause that does not yet admit intervention.',
    vacio: 'No verification plans in this generation.',
    queRevisar: 'What to check',
    conQuien: 'With whom',
    confirmaSi: 'Confirms if',
    descartaSi: 'Rules out if',
    nivelEstado: (nivel: number, estado: string) => `N${nivel} · ${estado}`,
  },
  fases: { planear: 'Plan', hacer: 'Do', estudiar: 'Study', actuar: 'Act' },

  intervencion: {
    titulo: 'Intervention plan',
    ayuda: 'Only a cause at N3 or N4 that explains every row and has no open contradictions is intervened on.',
    vacio: 'No intervention plan.',
    causa: (id: string, nivel: number) => `Cause ${id} (N${nivel})`,
    prioridad: (clase: string, puntaje: number) => `Priority ${clase} · score ${puntaje}`,
    impactoEsfuerzo: (impacto: number, esfuerzo: string, puntos: number) =>
      `Impact ${impacto} (computed by code) · effort ${esfuerzo} (${puntos} point(s))`,
    razones: 'How the code computed it',
    matriz: 'Four-actions framework',
    sinPropuesta: 'no proposal',
    listas: 'Change checklists',
    descongelar: 'Unfreeze (Lewin; Kotter 1; ADKAR: awareness)',
    mover: 'Move (Kotter 2–6; ADKAR: desire, knowledge, and ability)',
    recongelar: 'Refreeze (Lewin; Kotter 7–8; ADKAR: reinforcement)',
  },
  carriles: {
    inmediato: 'Immediate lane',
    corto_plazo: 'Short-term lane',
    estructural: 'Structural lane',
  },
  cuadrantes: {
    eliminar: 'Eliminate',
    reducir: 'Reduce',
    incrementar: 'Raise',
    crear: 'Create',
  },
  prioridades: { alta: 'high', media: 'medium', baja: 'low' },

  indicadores: {
    titulo: 'Indicator sheets',
    ayuda: 'SMART criteria (Doran, 1981). An incomplete sheet says what is missing; it is not discarded.',
    vacio: 'No indicator sheets in this generation.',
    definicion: 'Definition',
    formula: 'Formula',
    unidad: 'Unit',
    lineaBase: 'Baseline',
    sinLineaBase: 'Pending: no claim supports it yet',
    meta: 'Target',
    plazo: 'Time frame',
    frecuencia: 'Frequency',
    responsable: 'Owner',
    causa: (id: string) => `Cause ${id}`,
    smartCompleta: 'SMART complete',
    smartIncompleta: (faltan: string) => `SMART incomplete: missing ${faltan}`,
  },
  frecuencias: { diaria: 'Daily', semanal: 'Weekly', mensual: 'Monthly' },

  pareto: {
    titulo: 'Cause concentration (Pareto)',
    ayuda: 'Only with figures the code finds verbatim in citations with sufficient level. Never with figures from memory.',
    vacio: 'No Pareto in this generation.',
    total: (total: number, unidad: string) => `Total: ${total} ${unidad}`,
    barra: (categoria: string, valor: number, unidad: string, porcentaje: number, acumulado: number) =>
      `${categoria}: ${valor} ${unidad} (${porcentaje}%, cumulative ${acumulado}%)`,
    porcentaje: (n: number) => `${n}%`,
    acumulado: (n: number) => `cum. ${n}%`,
  },
  motivosSinPareto: {
    sin_cifras_en_citas: 'There are no suitable verbatim figures in the citations: the Pareto stays empty instead of inventing bars.',
    una_sola_categoria: 'Only one category has suitable figures: concentration cannot be shown.',
    unidades_incompatibles: 'The suitable figures use incompatible units: they are not mixed in a single Pareto.',
  },

  guia: {
    titulo: 'Next-interview guide',
    ayuda: 'Critical-incident questions (Flanagan, 1954) aimed at whoever can close each gap (theoretical sampling).',
    vacio: 'No pending gaps recorded.',
    paraQuien: (rol: string) => `For whom: ${rol}`,
    objetivo: (texto: string) => `Gap it closes: ${texto}`,
    tipos: {
      vacio_criterio: 'Stopping-criterion gap',
      causa_abierta: 'Open cause',
      corroboracion_pendiente: 'Pending corroboration',
      documento_pedido: 'Requested document',
      casilla_vacia: 'Empty box',
    },
  },

  informe: {
    titulo: 'Feedback report',
    ayuda: 'Report (Block, 1981) assembled by the code from the case data. The download and the printout are the same text.',
    descargar: 'Download Markdown',
    imprimir: 'Print / save PDF',
    vacio: 'No report yet: generate the deliverables first.',
  },
};
