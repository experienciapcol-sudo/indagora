// Contrato del núcleo de evidencia. Lo comparten el Worker, la interfaz y los casos.
// Todo lo que vive en src/nucleo es código puro: sin red, sin D1 y sin APIs del navegador.

export type TipoFuente = 'entrevista' | 'documento';
// "notas": apuntes del consultor, no literales. El nivel máximo de sus afirmaciones es N2.
export type Modalidad = 'transcripcion' | 'notas';

// Lo que el consultor entrega por cada fuente. En una entrevista, cada turno va en una
// línea que empieza con la etiqueta del hablante: "Consultora: ¿Desde cuándo…?".
export interface FuenteEntrada {
  id: string; // E1, E2… para entrevistas; D1, D2… para documentos
  tipo: TipoFuente;
  rol: string; // rol de la persona entrevistada o tipo de documento: "Dueña", "Jefe de taller"
  modalidad: Modalidad;
  titulo: string;
  // Etiqueta del entrevistador en el texto; null = se detecta (Consultor/a, Entrevistador/a…).
  entrevistador: string | null;
  texto: string;
  // Etiquetas que asignó el consultor: valen como hablante aunque intervengan una sola vez.
  hablantesConocidos?: string[];
}

export interface Turno {
  numero: number; // desde 1
  hablante: string; // etiqueta tal como aparece en el texto
  esEntrevistador: boolean;
  texto: string;
}

export interface Oracion {
  id: string; // E1-007: fuente y número de oración dentro de la fuente
  fuente: string;
  turno: number;
  hablante: string;
  esEntrevistador: boolean; // las preguntas del entrevistador nunca son evidencia
  texto: string;
}

export type TipoAfirmacion = 'opinion' | 'testimonio_especifico';
// Rasgos que propone el modelo. Son señales sobre la afirmación, nunca sobre la persona.
export type Rasgo = 'deseabilidad' | 'defensa';
// Alertas que detecta el código con un léxico fijo.
export type TipoAlerta = 'generalizacion' | 'de_oidas' | 'recencia' | 'atribucion_externa';

export interface Alerta {
  tipo: TipoAlerta;
  marcador: string; // la expresión encontrada, tal como aparece en la cita
}

// Afirmación ya verificada por el código. La cita la reconstruye el servidor a partir de
// los identificadores; el modelo nunca la escribe.
export interface Afirmacion {
  id: string; // E1-A03
  fuente: string;
  tipoFuente: TipoFuente;
  rol: string;
  modalidad: Modalidad;
  hablante: string;
  turnos: number[];
  oraciones: string[];
  cita: string;
  resumen: string; // paráfrasis del modelo; no es cita
  tema: string;
  tipo: TipoAfirmacion;
  primeraMano: boolean;
  rasgos: Rasgo[];
  alertas: Alerta[];
  especificidad: string[]; // datos concretos que encontró el código: cifras, fechas, plazos
  corrobora: string[]; // ids de afirmaciones previas que el modelo propone como corroboración
  contradice: string[];
}

export type MotivoRechazo =
  | 'id_inexistente'
  | 'oracion_del_entrevistador'
  | 'ancla_no_coincide'
  | 'hablantes_distintos'
  | 'sin_oraciones_validas'
  | 'referencia_invalida'
  | 'cifra_sin_origen'; // la paráfrasis trae una cifra que no está en la cita

// Cada movimiento del modelo que el código no aceptó, con su motivo.
export interface Rechazo {
  afirmacion: number; // posición en la salida del modelo, desde 0
  motivo: MotivoRechazo;
  detalle: string;
}

// N0 sin explorar, N1 opinión, N2 testimonio específico, N3 corroborado entre roles,
// N4 documentado. Regla del producto; la calcula src/nucleo/niveles.ts.
export type Nivel = 0 | 1 | 2 | 3 | 4;

export interface NivelCalculado {
  nivel: Nivel;
  razones: string[];
  // Corroboraciones que cumplen las condiciones y esperan el clic del consultor.
  pendientes: string[]; // claves de par, ver clavePar() en niveles.ts
  contradicha: boolean;
}

// Resumen de una afirmación previa que el analista puede marcar como corroborada o contradicha.
export interface Previa {
  id: string;
  fuente: string;
  rol: string;
  resumen: string;
}

// POST /api/analizar
export interface PeticionAnalisis {
  fuente: FuenteEntrada;
  previas: Previa[];
}

export interface RespuestaAnalisis {
  fuente: FuenteEntrada;
  turnos: Turno[];
  oraciones: Oracion[];
  afirmaciones: Afirmacion[];
  rechazos: Rechazo[];
  modelo: string;
  costoUsd: number;
  ms: number;
  demo: boolean;
  gasto: { sesionUsd: number; globalUsd: number; llamadasSesion: number };
}
