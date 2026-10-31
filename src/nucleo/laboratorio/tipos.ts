// Tipos puros del Laboratorio y de hablantes. Sin red ni D1.
import type { FuenteEntrada } from '../tipos';

export interface ParametrosLaboratorio {
  giro: string;
  tamano: 'micro' | 'pequena' | 'mediana';
  sintoma: string;
  distractores: 0 | 1 | 2 | 3 | 4;
  documentoClave: boolean;
}

export type OrigenCaso = 'descripcion' | 'preparado' | 'grabado';
export type TipoHecho = 'causa' | 'distractor' | 'sintoma' | 'contexto';
export type Revelacion = 'siempre' | 'incidente' | 'cuantitativa' | 'contraste' | 'temporal' | 'documental' | 'nunca';

export interface Hecho {
  id: string;
  tipo: TipoHecho;
  texto: string;
  dueno: string;
  revelacion: Revelacion;
  distractor: string | null;
  // Un término que empieza con "=" es frase exacta: basta una aparición para fugar.
  terminos: string[];
}

export interface PersonaSimulada { id: string; rol: string; presentacion: string }
export interface DocumentoSimulado { id: string; titulo: string; esClave: boolean; disponible: boolean }
export interface Distractor { id: string; enunciado: string; porQueEngana: string }

export interface VerdadLaboratorio {
  causa: { enunciado: string; mecanismo: string; marcadores: string[] };
  hechos: Hecho[];
  distractores: Distractor[];
  duenosCausa: string[];
  documentoClave: string | null;
}

export interface CasoLaboratorio {
  id: string;
  origen: OrigenCaso;
  parametros: ParametrosLaboratorio;
  empresa: { nombre: string; descripcion: string };
  objetivo: string;
  personas: PersonaSimulada[];
  documentos: DocumentoSimulado[];
}

// Entrada cruda del modelo: sin ids; dueño por rol de persona o título de documento;
// distractor por enunciado exacto de la lista de distractores.
export interface HechoCrudo {
  tipo: TipoHecho;
  texto: string;
  dueno: string;
  revelacion: Revelacion;
  distractor: string | null;
  terminos: string[];
}
export interface CasoCrudo {
  id: string;
  origen?: OrigenCaso;
  empresa: { nombre: string; descripcion: string };
  objetivo: string;
  personas: { rol: string; presentacion: string }[];
  documentos: { titulo: string; esClave: boolean }[];
  causa: { enunciado: string; mecanismo: string; marcadores: string[]; duenos: string[] };
  distractores: { enunciado: string; porQueEngana: string }[];
  hechos: HechoCrudo[];
}

export type TipoPregunta = 'abierta' | 'temporal' | 'contraste' | 'incidente' | 'cuantitativa' | 'documental';

export interface Intercambio {
  n: number;
  persona: string;
  tipoPregunta: TipoPregunta;
  pregunta: string;
  respuesta: string;
  hechosRevelados: string[];
  fuga: boolean;
}

export interface ResultadoComparacion {
  veredicto: 'encontrada' | 'parcial' | 'no_encontrada';
  causaPrincipalAgente: string | null;
  marcadoresEnCausa: string[];
  marcadoresEnEvidencia: string[];
  distractorPrincipal: string | null;
  detalle: string[];
}

export interface SegmentoDiarizado { hablante: string; inicioS: number; finS: number; texto: string }
export interface InfoWav { valida: boolean; motivo: string | null; duracionS: number; canales: number; muestraHz: number; bits: number }
export interface HablanteDetectado { etiqueta: string; intervenciones: number; muestra: string }
export interface AsignacionHablante {
  etiqueta: string;
  rol: string;
  esEntrevistador: boolean;
  esPrincipal: boolean;
}

export interface CasoPreparado {
  caso: CasoLaboratorio;
  verdad: VerdadLaboratorio;
  intercambios: Intercambio[];
  fuentes: FuenteEntrada[];
  comparacionReferencia: ResultadoComparacion;
}
