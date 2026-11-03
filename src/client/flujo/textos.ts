// Textos visibles del flujo "Cómo funciona". Mismo criterio que ../textos.ts.
// Cada afirmación de aquí la respalda el código o la evaluación del README: si cambia el
// producto, cambia este texto.
import { idioma } from '../idioma';
import type { ClaveOracion } from './datos';
import { TEXTOS_FLUJO_EN } from './textos.en';

export type Carril = 'consultor' | 'modelo' | 'codigo';

export interface Estacion {
  carriles: Carril[];
  corto: string;
  titulo: string;
  texto: string;
  metodo: string;
}

export const TEXTOS_FLUJO_ES = {
  pestana: 'Cómo funciona',
  enlace: '¿Primera vez? Mira cómo funciona',
  titulo: 'Cómo funciona Indagora',
  intro:
    'De las entrevistas a un plan que puedes defender frente al cliente, oración por oración. Así se ve con el caso ficticio de un taller de muebles que entrega tarde.',

  contraste: {
    etiqueta: 'El caso del taller en una línea',
    dijo: 'Lo que dijo la dueña',
    mostro: 'Lo que mostró la evidencia',
    causa: 'Un proveedor de herraje nuevo que tarda 9.4 días en vez de 3.1. Lo dicen dos roles distintos y lo confirma el registro del almacén.',
  },

  promesas: [
    'Cada conclusión apunta a la oración que la sostiene: el modelo señala identificadores y el código reconstruye la cita.',
    'No recomienda antes de tiempo: 0 intervenciones prematuras en las 21 corridas del agente de la evaluación.',
    'Usa métodos publicados, con su autor y año, y una regla del código decide cuál aplica.',
  ],

  carriles: {
    etiqueta: 'Quién hace cada parte',
    consultor: 'Tú',
    modelo: 'Modelo (Muse)',
    codigo: 'Código',
  } satisfies Record<Carril | 'etiqueta', string>,

  estacionesEtiqueta: 'El flujo, paso a paso',
  estaciones: [
    {
      carriles: ['consultor'],
      corto: 'Escuchas',
      titulo: 'Escuchas a varias personas',
      texto: 'Pegas notas o transcripciones, o grabas el audio de la entrevista, y marcas quién habla. Cada oración recibe un identificador.',
      metodo: 'Entrevistas con varios roles y documentos',
    },
    {
      carriles: ['modelo'],
      corto: 'Leen',
      titulo: 'Roles especializados del modelo leen cada fuente',
      texto: 'Leen las fuentes en paralelo y proponen afirmaciones señalando oraciones. El código reconstruye la cita y rechaza lo que no se sostiene: una pregunta de la consultora, un ancla que no está o una cifra que la cita no contiene.',
      metodo: 'El modelo señala; nunca escribe la cita',
    },
    {
      carriles: ['codigo'],
      corto: 'Mide',
      titulo: 'El código mide la evidencia',
      texto: 'El código calcula el nivel a partir de quién lo dijo, cuántas fuentes y roles coinciden y si tú lo confirmaste. Lo que dice una sola persona llega como máximo a N2; dos roles distintos que coinciden, más tu clic, dan N3; un registro documental con el dato da N4.',
      metodo: 'Triangulación de fuentes (Denzin, 1978)',
    },
    {
      carriles: ['modelo', 'codigo'],
      corto: 'Investiga',
      titulo: 'El agente investiga con método',
      texto: 'Enuncia la desviación, separa dónde ocurre el problema y dónde no, ordena las causas posibles y las prueba contra cada fila. El código aprueba o rechaza cada paso antes de que ocurra, y el agente solo declara una causa principal cuando su evidencia llega a N3 o N4.',
      metodo: 'Kepner y Tregoe (1965) · Weisbord (1976) si es crónico · Ishikawa',
    },
    {
      carriles: ['modelo', 'codigo'],
      corto: 'Entrega',
      titulo: 'Entregables que llevas al cliente',
      texto: 'El código decide qué causa admite intervención y calcula prioridades; el modelo redacta. Cada línea lleva a la oración que la sostiene.',
      metodo: 'Si ninguna causa llega a N3, recibes un plan de verificación y la lista de lo que falta',
    },
  ] satisfies Estacion[],

  artefactos: {
    fuentes: 'Fuentes del caso',
    documento: 'documento',
    entrevista: 'entrevista',
    oracion: 'Una oración con su identificador',
    citaReconstruida: 'Cita que reconstruye el código',
    rechazo: 'Otra propuesta del modelo, rechazada: apuntaba a una pregunta de la consultora.',
    niveles: [
      { nivel: 1, nombre: 'opinión', quien: 'La dueña: «el taller es flojo»' },
      { nivel: 2, nombre: 'testimonio específico', quien: 'El jefe de taller: «nueve o diez días»' },
      { nivel: 3, nombre: 'corroborado entre roles', quien: 'Compras dice lo mismo, y tú lo confirmas' },
      { nivel: 4, nombre: 'documentado', quien: 'El registro: «9.4 días de espera»' },
    ],
    es: 'Es',
    noEs: 'No es',
    esTexto: 'Clósets, cómodas y cocinas: llevan herraje',
    noEsTexto: 'Mesas y bancas: sin herraje, salen a tiempo',
    bloqueo: 'Intervención bloqueada por el código: con N0 a N2 solo se admiten acciones de verificación.',
    causa: 'Causa principal: cambio de proveedor de herraje (N4)',
    entregables: [
      { nombre: 'Plan de verificación', metodo: 'ciclo PDSA (Deming)' },
      { nombre: 'Plan de intervención por esfuerzo e impacto', metodo: 'cuatro acciones (Kim y Mauborgne) y listas de cambio (Lewin, Kotter, ADKAR)' },
      { nombre: 'Fichas de indicador con línea base, meta, plazo y responsable', metodo: 'criterios SMART (Doran, 1981)' },
      { nombre: 'Concentración de causas, solo con cifras documentadas', metodo: 'Pareto (Juran)' },
      { nombre: 'Guía de la siguiente entrevista', metodo: 'incidente crítico (Flanagan, 1954)' },
      { nombre: 'Informe de devolución', metodo: 'Block (1981)' },
    ],
  },

  // En español se muestran las oraciones tal como están en el caso.
  traduccion: null as Record<ClaveOracion, string> | null,
  roles: null as Record<string, string> | null,
  notaTraduccion: '',

  cta: {
    boton: 'Ver este caso en el agente',
    nota: 'En la demostración se reproduce una corrida grabada de este caso ficticio, hecha antes con el modelo real: sin costo.',
  },
  pie: 'Caso, empresa y personas ficticios.',
};

export type TextosFlujo = typeof TEXTOS_FLUJO_ES;

export const TEXTOS_FLUJO: TextosFlujo = idioma === 'en' ? TEXTOS_FLUJO_EN : TEXTOS_FLUJO_ES;
