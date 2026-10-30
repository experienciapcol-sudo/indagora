// Contrato del agente (F4). Lo comparten el Worker, la interfaz y las pruebas. Código puro.
// El agente sigue el análisis de problemas de Kepner y Tregoe (The Rational Manager, 1965):
// desviación, especificación Es/No Es con distinciones y cambios, causas posibles, prueba de
// causas contra la especificación, confirmación y verificación. Sin fecha de inicio o sin
// contraste toma la ruta crónica: las seis casillas de Weisbord (1976) y luego Ishikawa.
import type { Afirmacion, FuenteEntrada, Nivel, NivelCalculado, Oracion, Rechazo, Turno } from '../tipos';

// Movimientos que el modelo puede proponer. El código aprueba o rechaza cada uno antes de ejecutarlo.
export const ACCIONES = [
  'leer_fuentes',
  'enunciar_desviacion',
  'especificar_es_no_es',
  'barrer_weisbord',
  'generar_causas',
  'probar_causas',
  'disenar_verificacion',
  'proponer_intervencion',
  'solicitar_documento',
  'detenerse',
] as const;
export type Accion = (typeof ACCIONES)[number];

// Lo que devuelve el decisor en cada paso.
export interface Decision {
  accion: Accion;
  fuentes: string[]; // leer_fuentes: ids de fuentes
  causa: string | null; // disenar_verificacion y proponer_intervencion: id de causa
  documento: string; // solicitar_documento: qué documento pedir
  justificacion: string;
  punteros: string[]; // ids de afirmaciones que sostienen la decisión
}

// Toda casilla llena apunta a afirmaciones verificadas. Texto vacío = casilla vacía.
export interface Casilla {
  texto: string;
  evidencia: string[]; // ids de afirmaciones (E2-A05)
}

export type Ambito = 'operacion_fisica' | 'organizacional';

// Kepner y Tregoe, paso 1: qué se esperaba, qué ocurre, desde cuándo, cuánto. El contraste
// (algo comparable que sí funciona) y la fecha de inicio deciden la ruta.
export interface Desviacion {
  esperado: Casilla;
  ocurre: Casilla;
  desdeCuando: Casilla;
  cuanto: Casilla;
  contraste: Casilla;
  ambito: Ambito;
}

export const HERRAMIENTAS = ['es_no_es', 'ishikawa', 'weisbord', 'campo_de_fuerzas', 'lienzo', 'cinco_porques'] as const;
export type Herramienta = (typeof HERRAMIENTAS)[number];

// Regla de selección (código, visible): qué herramientas aplican a este caso y por qué.
export interface Seleccion {
  ruta: 'aguda' | 'cronica';
  razones: string[];
  espinas: 'seis_m' | 'weisbord'; // espinas del Ishikawa
  herramientas: { herramienta: Herramienta; elegida: boolean; razon: string }[];
}

export const DIMENSIONES = ['que', 'donde', 'cuando', 'cuanto'] as const;
export type Dimension = (typeof DIMENSIONES)[number];

// Kepner y Tregoe, pasos 2 y 3: una fila de la especificación con su distinción y su cambio.
export interface FilaEsNoEs {
  id: string; // R1, R2…
  dimension: Dimension;
  pregunta: string;
  es: Casilla;
  noEs: Casilla;
  distincion: Casilla;
  cambio: Casilla;
}

export const CASILLAS_WEISBORD = ['propositos', 'estructura', 'relaciones', 'recompensas', 'liderazgo', 'mecanismos'] as const;
export type CasillaWeisbord = (typeof CASILLAS_WEISBORD)[number];

export interface HallazgoWeisbord {
  id: string; // W-propositos…
  casilla: CasillaWeisbord;
  estado: 'brecha' | 'sin_brecha' | 'sin_datos';
  hallazgo: Casilla;
}

export const ESPINAS_6M = ['mano_de_obra', 'maquinaria', 'materiales', 'metodo', 'medicion', 'medio_ambiente'] as const;
export type Espina6M = (typeof ESPINAS_6M)[number];
export type Espina = Espina6M | CasillaWeisbord;

// Causa posible, colocada en una espina del Ishikawa. `evidencia`: afirmaciones que muestran
// que el hecho ocurrió (de ahí sale su nivel). `origen`: filas o casillas de las que se deriva.
export interface Causa {
  id: string; // C1, C2…
  enunciado: string;
  espina: Espina;
  origen: string[];
  evidencia: string[];
}

export type Veredicto = 'explica' | 'no_explica' | 'sin_datos';

// Kepner y Tregoe, paso 5: ¿la causa explica a la vez lo que es y lo que no es en esta fila?
export interface Juicio {
  causa: string;
  fila: string; // R1… o W-…
  veredicto: Veredicto;
  razon: string;
  evidencia: string[];
}

// Plan de verificación de una causa (ciclo PDSA de Deming): qué revisar y qué resultado decide.
export interface Verificacion {
  causa: string;
  queRevisar: string;
  conQuien: string;
  confirmaSi: string;
  descartaSi: string;
}

// En F4 es una dirección de intervención; el plan completo en carriles llega en F5.
export interface Intervencion {
  causa: string;
  accion: string;
  evidencia: string[];
}

export interface SolicitudDocumento {
  id: string; // S1…
  descripcion: string;
  motivo: string;
}

export interface LecturaFuente {
  turnos: Turno[];
  oraciones: Oracion[];
  rechazos: Rechazo[];
  costoUsd: number;
  ms: number;
  demo: boolean;
}

export interface Presupuesto {
  pasosMax: number;
  pasos: number;
  usdMax: number;
  usd: number;
  diasMax: number; // días de campo: pedir un documento cuesta uno
  dias: number;
}

export type MotivoGuarda =
  | 'fase_previa' // falta un paso anterior del método
  | 'nivel_insuficiente' // la evidencia no alcanza para esa acción
  | 'repetida' // ya se hizo y nada cambió desde entonces
  | 'parametro_invalido'
  | 'herramienta_no_elegida' // la regla de selección no la eligió para este caso
  | 'criterio_no_cumplido' // quiso detenerse antes de tiempo
  | 'presupuesto';

export type MotivoEvidencia =
  | 'casilla_sin_evidencia'
  | 'juicio_sin_evidencia'
  | 'causa_sin_evidencia'
  | 'evidencia_ajena' // apunta a una afirmación que no existe o de una fuente no leída
  | 'relacion_invalida'; // corroboración entre afirmaciones de una misma fuente o repetida

export type OrigenRechazo = 'guarda' | 'evidencia' | 'verificador';

// Traza visible: cada decisión con su justificación y punteros; cada rechazo con su motivo.
export type EventoTraza =
  // Lo que el consultor le pidió al agente para ese paso. El código revisa el movimiento igual.
  | { n: number; paso: number; tipo: 'indicacion'; texto: string }
  | { n: number; paso: number; tipo: 'decision'; accion: Accion; justificacion: string; punteros: string[]; parametros: string }
  | { n: number; paso: number; tipo: 'rechazo'; origen: OrigenRechazo; accion: Accion | null; motivo: MotivoGuarda | MotivoEvidencia | Rechazo['motivo']; detalle: string }
  | { n: number; paso: number; tipo: 'resultado'; accion: Accion; resumen: string; costoUsd: number; ms: number; demo: boolean }
  | { n: number; paso: number; tipo: 'fin'; motivo: Terminado['motivo']; detalle: string }
  | { n: number; paso: number; tipo: 'error'; accion: Accion | null; detalle: string };

// 'espera': entrega parcial; solo falta lo que el consultor puede dar (confirmar una
// corroboración o aportar un documento pedido). Si confirma, el caso se reanuda.
export interface Terminado {
  motivo: 'criterio' | 'espera' | 'presupuesto' | 'error';
  detalle: string;
}

export interface EstadoAgente {
  version: 1;
  id: string;
  titulo: string;
  objetivo: string;
  fuentes: FuenteEntrada[];
  lecturas: Record<string, LecturaFuente>; // por id de fuente leída
  afirmaciones: Afirmacion[];
  confirmadas: string[]; // claves de par (clavePar) que el consultor confirmó
  desviacion: Desviacion | null;
  seleccion: Seleccion | null;
  esNoEs: FilaEsNoEs[] | null;
  weisbord: HallazgoWeisbord[] | null;
  causas: Causa[];
  juicios: Juicio[];
  verificaciones: Verificacion[];
  intervenciones: Intervencion[];
  solicitudes: SolicitudDocumento[];
  presupuesto: Presupuesto;
  // Firma de cada acción ejecutada con el número de fuentes leídas en ese momento (sin repetir).
  hechas: { firma: string; leidas: number }[];
  traza: EventoTraza[];
  terminado: Terminado | null;
}

export type EstadoCausa = 'sin_probar' | 'explica_todo' | 'descartada' | 'incompleta';

// Lo que el código calcula sobre cada causa. Nunca lo escribe el modelo.
export interface CausaEvaluada {
  id: string;
  nivel: Nivel; // el mayor nivel entre su evidencia
  estado: EstadoCausa;
  filasExplicadas: number;
  filasTotales: number;
  descartadaPor: string[]; // filas con "no explica" y evidencia
  contradicciones: string[]; // afirmaciones de su evidencia contradichas sin resolver
  verificacion: boolean;
  intervencion: boolean;
  principal: boolean;
}

export interface EstadoCriterio {
  cumplido: boolean;
  principal: string | null;
  cumplidos: string[];
  faltantes: string[];
}

// Respuesta de las rutas /api/agente: el estado más lo que calcula el código.
export interface VistaAgente {
  estado: EstadoAgente;
  niveles: Record<string, NivelCalculado>;
  causas: CausaEvaluada[];
  criterio: EstadoCriterio;
  gasto: { sesionUsd: number; globalUsd: number; llamadasSesion: number };
}

export interface RespuestaPaso {
  vista: VistaAgente;
  nuevos: EventoTraza[]; // eventos de este paso, para la consola en vivo
}
