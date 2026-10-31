// English UI strings. Exactly the same shape as TEXTOS_ES (checked via the Textos type).
import type { Textos } from './textos';

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const TEXTOS_EN: Textos = {
  marca: 'Indagora',
  subtitulo: 'evidence-based organizational diagnosis',

  servicio: {
    cargando: 'Contacting the service…',
    sinConexion: 'No connection to the service',
    demo: 'Demo mode · no cost',
    real: 'Live mode · each analysis has a cost',
    etiqueta: 'Service status',
  },
  gasto: {
    titulo: 'Session spend',
    de: (actual: string, tope: string) => `${actual} of ${tope}`,
    llamadas: (n: number) => `${n} ${plural(n, 'call', 'calls')}`,
    noDisponible: 'Spend unavailable',
  },
  reglaNivel:
    'Evidence levels are computed by the code from the citations and roles. The model only points to sentences; it assigns no levels and writes no quotations.',

  fuentes: {
    titulo: 'Sources',
    vacio: 'There are no sources yet. Add an interview or a document, or load the sample case.',
    cargarCaso: 'Load sample case: furniture workshop',
    casoFicticio: 'Fictional case',
    objetivo: 'Diagnosis objective',
    quitar: 'Remove',
    quitarFuente: (id: string) => `Remove source ${id}`,
    columnas: { id: 'Id', tipo: 'Type', rol: 'Role', modalidad: 'Format', titulo: 'Title' },
    agregar: 'Add a source',
    campos: {
      tipo: 'Type',
      rol: 'Role',
      rolAyuda: 'Role of the person interviewed, or document type',
      rolEjemplo: 'Owner, workshop lead…',
      modalidad: 'Format',
      titulo: 'Title',
      tituloEjemplo: 'Interview with the owner',
      entrevistador: 'Interviewer label (optional)',
      entrevistadorAyuda: 'As it appears in the text. If left blank, it is detected.',
      entrevistadorEjemplo: 'Consultant',
      texto: 'Text',
      textoAyuda: 'One turn per line, starting with the speaker label, e.g. “Consultant: Since when…?”.',
    },
    botonAgregar: (id: string) => `Add as ${id}`,
    soloFicticios: 'Paste fictional data only.',
    confirmarReemplazo: 'Loading the sample case replaces the current sources and results. Continue?',
  },

  tipos: { entrevista: 'Interview', documento: 'Document' },
  modalidades: { transcripcion: 'Transcript', notas: 'Notes' },
  modalidadAyuda: 'Notes are not verbatim: their claims cannot go above N2.',

  analisis: {
    titulo: 'Analysis',
    analizar: 'Analyze',
    analizarPendientes: 'Analyze pending sources',
    reanalizar: 'Re-analyze everything',
    detener: 'Stop',
    deteniendo: 'Stopping…',
    ayuda: 'Sources are analyzed one at a time, in order. Each source receives a summary of the claims from the previous ones so corroborations can be proposed.',
    sinFuentes: 'Add at least one source to analyze.',
    progreso: 'Analysis progress',
    estados: {
      pendiente: 'Pending',
      analizando: 'Analyzing…',
      lista: 'Done',
      error: 'Error',
    },
    detalleLista: (afirmaciones: number, usd: string, segundos: string) =>
      `${afirmaciones} ${plural(afirmaciones, 'claim', 'claims')} · ${usd} · ${segundos}`,
    total: 'Total',
    totalLinea: (usd: string, segundos: string) => `${usd} · ${segundos}`,
    terminado: 'Analysis finished.',
    terminadoConErrores: (n: number) => `Analysis finished with ${n} ${plural(n, 'source in error', 'sources in error')}.`,
    detenido: 'Analysis stopped.',
    modelo: 'Model',
    demoGrabada: 'recorded response',
  },

  avisoUnaFuente: 'With a single source, nothing goes above N2 (single-source testimony): no full intervention.',

  resultados: {
    titulo: 'Evidence',
    fuente: 'Source',
    transcripcion: 'Transcript',
    afirmaciones: 'Claims',
    sinAfirmaciones: 'The model proposed no claims that the code accepted in this source.',
    leyendaTranscripcion:
      'Underlined: sentences cited by some claim. Muted: interviewer sentences, which never count as evidence.',
    entrevistador: 'Interviewer',
    turno: (n: number) => `Turn ${n}`,
    ubicar: 'Locate in the transcript',
    ubicada: 'Located in the transcript',
    citaDe: (hablante: string, rol: string) => `${hablante} · ${rol}`,
    parafrasis: 'Model paraphrase',
    tema: 'Topic',
    senalAfirmacion: 'Signal about the claim',
    datosEspecificos: 'Specific data',
    razonesNivel: 'Why this level',
    razonesCalculadas: 'Computed by the code',
    contradicha: 'Contradicted',
    contradichaAyuda: 'Another claim opposes this one.',
    modeloPropone: 'Type proposed by the model',
    primeraMano: 'first-hand',
    deSegundaMano: 'not first-hand',
    tipoAfirmacion: { opinion: 'opinion', testimonio_especifico: 'specific testimony' },
  },

  alertas: {
    generalizacion: 'Generalization',
    de_oidas: 'Hearsay',
    recencia: 'Recency',
    atribucion_externa: 'Attribution to another area',
  },
  rasgos: { deseabilidad: 'desirability', defensa: 'defensiveness' },

  corroboracion: {
    titulo: 'Cross-role corroboration pending',
    explicacion: 'The model only proposes it; the consultant confirms it.',
    confirmar: 'Confirm cross-role corroboration',
    tituloDocumento: 'Documentary support pending',
    confirmarDocumento: 'Confirm documentary support',
    deshacer: 'Undo',
    confirmada: 'Confirmed by the consultant',
    conOtra: (id: string, rol: string) => `With ${id} (${rol})`,
  },

  rechazos: {
    contador: (n: number) => `Pointers rejected by the code: ${n}`,
    explicacion:
      'Whenever the model points to a sentence that does not exist, belongs to the interviewer, or does not match, the code discards that claim before it reaches the screen.',
    ninguno: 'In the analyzed sources the code did not have to reject any pointer.',
    fuente: (id: string) => `Source ${id}`,
    afirmacionN: (n: number) => `Proposed claim #${n}`,
    mostrar: 'Show the list',
    ocultar: 'Hide the list',
    motivos: {
      id_inexistente: 'The sentence identifier does not exist',
      oracion_del_entrevistador: 'It pointed to an interviewer sentence',
      ancla_no_coincide: 'The anchor text does not match the sentence',
      hablantes_distintos: 'It mixed sentences from different speakers',
      sin_oraciones_validas: 'No usable sentence remained',
      referencia_invalida: 'It pointed to a previous claim that does not exist',
      cifra_sin_origen: 'The paraphrase carried a figure that is not in the citation',
    },
  },

  exportar: {
    boton: 'Export session (JSON)',
    ayuda: 'The session lives in this browser. Exporting saves sources, results, and confirmations to a file.',
    archivo: 'indagora-session.json',
  },

  errores: {
    sinConexion: 'No connection to the service.',
    http: (estado: number) => `Service error ${estado}.`,
  },

  pie: 'Fictional data only. Levels are a code computation over the citations, not a verdict.',
};
