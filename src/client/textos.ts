// Todos los textos visibles de la interfaz. Cuando llegue el bilingüe, este objeto se
// convierte en un diccionario por idioma; las funciones reciben los valores a insertar.

import type { MotivoRechazo, Modalidad, TipoAlerta, TipoFuente, Rasgo } from '../nucleo/tipos';
import { idioma } from './idioma';
import { TEXTOS_EN } from './textos.en';

const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);

export const TEXTOS_ES = {
  marca: 'Indagora',
  subtitulo: 'diagnóstico organizacional basado en evidencia',

  servicio: {
    cargando: 'Consultando el servicio…',
    sinConexion: 'Sin conexión con el servicio',
    demo: 'Modo demostración · sin costo',
    real: 'Modo real · cada análisis tiene costo',
    etiqueta: 'Estado del servicio',
  },
  gasto: {
    titulo: 'Gasto de la sesión',
    de: (actual: string, tope: string) => `${actual} de ${tope}`,
    llamadas: (n: number) => `${n} ${plural(n, 'llamada', 'llamadas')}`,
    noDisponible: 'Gasto no disponible',
  },
  reglaNivel:
    'El nivel de evidencia lo calcula el código a partir de las citas y los roles. El modelo solo señala oraciones; no asigna niveles ni escribe citas.',

  fuentes: {
    titulo: 'Fuentes',
    vacio: 'Todavía no hay fuentes. Agrega una entrevista o un documento, o carga el caso de ejemplo.',
    cargarCaso: 'Cargar caso de ejemplo: taller de muebles',
    casoFicticio: 'Caso ficticio',
    objetivo: 'Objetivo del diagnóstico',
    quitar: 'Quitar',
    quitarFuente: (id: string) => `Quitar la fuente ${id}`,
    columnas: { id: 'Id', tipo: 'Tipo', rol: 'Rol', modalidad: 'Modalidad', titulo: 'Título' },
    agregar: 'Agregar una fuente',
    campos: {
      tipo: 'Tipo',
      rol: 'Rol',
      rolAyuda: 'Rol de la persona entrevistada o tipo de documento',
      rolEjemplo: 'Dueña, jefe de taller…',
      modalidad: 'Modalidad',
      titulo: 'Título',
      tituloEjemplo: 'Entrevista con la dueña',
      entrevistador: 'Etiqueta del entrevistador (opcional)',
      entrevistadorAyuda: 'Como aparece en el texto. Si se deja vacía, se detecta.',
      entrevistadorEjemplo: 'Consultora',
      texto: 'Texto',
      textoAyuda: 'Un turno por línea, empezando con la etiqueta del hablante, por ejemplo «Consultora: ¿Desde cuándo…?».',
    },
    botonAgregar: (id: string) => `Agregar como ${id}`,
    soloFicticios: 'Pega solo datos ficticios.',
    confirmarReemplazo: 'Cargar el caso de ejemplo reemplaza las fuentes y los resultados actuales. ¿Continuar?',
  },

  tipos: { entrevista: 'Entrevista', documento: 'Documento' } satisfies Record<TipoFuente, string>,
  modalidades: { transcripcion: 'Transcripción', notas: 'Notas' } satisfies Record<Modalidad, string>,
  modalidadAyuda: 'Las notas no son literales: sus afirmaciones no pasan de N2.',

  analisis: {
    titulo: 'Análisis',
    analizar: 'Analizar',
    analizarPendientes: 'Analizar las pendientes',
    reanalizar: 'Volver a analizar todo',
    detener: 'Detener',
    deteniendo: 'Deteniendo…',
    ayuda: 'Se analiza una fuente a la vez, en orden. Cada fuente recibe un resumen de las afirmaciones de las anteriores para proponer corroboraciones.',
    sinFuentes: 'Agrega al menos una fuente para analizar.',
    progreso: 'Progreso del análisis',
    estados: {
      pendiente: 'Pendiente',
      analizando: 'Analizando…',
      lista: 'Lista',
      error: 'Error',
    },
    detalleLista: (afirmaciones: number, usd: string, segundos: string) =>
      `${afirmaciones} ${plural(afirmaciones, 'afirmación', 'afirmaciones')} · ${usd} · ${segundos}`,
    total: 'Total',
    totalLinea: (usd: string, segundos: string) => `${usd} · ${segundos}`,
    terminado: 'Análisis terminado.',
    terminadoConErrores: (n: number) => `Análisis terminado con ${n} ${plural(n, 'fuente con error', 'fuentes con error')}.`,
    detenido: 'Análisis detenido.',
    modelo: 'Modelo',
    demoGrabada: 'respuesta grabada',
  },

  avisoUnaFuente: 'Con una sola fuente, nada pasa de N2: ninguna intervención plena.',

  resultados: {
    titulo: 'Evidencia',
    fuente: 'Fuente',
    transcripcion: 'Transcripción',
    afirmaciones: 'Afirmaciones',
    sinAfirmaciones: 'El modelo no propuso afirmaciones que el código aceptara en esta fuente.',
    leyendaTranscripcion:
      'Subrayadas: oraciones citadas por alguna afirmación. En tono apagado: oraciones del entrevistador, que nunca cuentan como evidencia.',
    entrevistador: 'Entrevistador',
    turno: (n: number) => `Turno ${n}`,
    ubicar: 'Ubicar en la transcripción',
    ubicada: 'Ubicada en la transcripción',
    citaDe: (hablante: string, rol: string) => `${hablante} · ${rol}`,
    parafrasis: 'Paráfrasis del modelo',
    tema: 'Tema',
    senalAfirmacion: 'Señal sobre la afirmación',
    datosEspecificos: 'Datos específicos',
    razonesNivel: 'Por qué este nivel',
    razonesCalculadas: 'Calculado por el código',
    contradicha: 'Contradicha',
    contradichaAyuda: 'Otra afirmación se opone a esta.',
    modeloPropone: 'Tipo propuesto por el modelo',
    primeraMano: 'primera mano',
    deSegundaMano: 'no es de primera mano',
    tipoAfirmacion: { opinion: 'opinión', testimonio_especifico: 'testimonio específico' },
  },

  alertas: {
    generalizacion: 'Generalización',
    de_oidas: 'De oídas',
    recencia: 'Recencia',
    atribucion_externa: 'Atribución a otra área',
  } satisfies Record<TipoAlerta, string>,
  rasgos: { deseabilidad: 'deseabilidad', defensa: 'defensa' } satisfies Record<Rasgo, string>,

  corroboracion: {
    titulo: 'Corroboración entre roles pendiente',
    explicacion: 'El modelo solo la propone; la confirma el consultor.',
    confirmar: 'Confirmar corroboración entre roles',
    tituloDocumento: 'Respaldo documental pendiente',
    confirmarDocumento: 'Confirmar respaldo documental',
    deshacer: 'Deshacer',
    confirmada: 'Confirmada por el consultor',
    conOtra: (id: string, rol: string) => `Con ${id} (${rol})`,
  },

  rechazos: {
    contador: (n: number) => `Punteros rechazados por el código: ${n}`,
    explicacion:
      'Cada vez que el modelo señala una oración que no existe, que es del entrevistador o que no coincide, el código descarta esa afirmación antes de que llegue a la pantalla.',
    ninguno: 'En las fuentes analizadas el código no tuvo que rechazar ningún puntero.',
    fuente: (id: string) => `Fuente ${id}`,
    afirmacionN: (n: number) => `Afirmación propuesta n.º ${n}`,
    mostrar: 'Ver la lista',
    ocultar: 'Ocultar la lista',
    motivos: {
      id_inexistente: 'El identificador de oración no existe',
      oracion_del_entrevistador: 'Apuntaba a una oración del entrevistador',
      ancla_no_coincide: 'El texto de anclaje no coincide con la oración',
      hablantes_distintos: 'Mezclaba oraciones de hablantes distintos',
      sin_oraciones_validas: 'No quedó ninguna oración utilizable',
      referencia_invalida: 'Apuntaba a una afirmación previa que no existe',
      cifra_sin_origen: 'La paráfrasis traía una cifra que no está en la cita',
    } satisfies Record<MotivoRechazo, string>,
  },

  exportar: {
    boton: 'Exportar sesión (JSON)',
    ayuda: 'La sesión vive en este navegador. Exportarla guarda fuentes, resultados y confirmaciones en un archivo.',
    archivo: 'indagora-sesion.json',
  },

  errores: {
    sinConexion: 'No hay conexión con el servicio.',
    http: (estado: number) => `Error ${estado} del servicio.`,
  },

  pie: 'Solo datos ficticios. Los niveles son un cálculo del código sobre las citas, no un dictamen.',
};

export type Textos = typeof TEXTOS_ES;

export const TEXTOS: Textos = idioma === 'en' ? TEXTOS_EN : TEXTOS_ES;
