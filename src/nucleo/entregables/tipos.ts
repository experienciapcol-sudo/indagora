// Tipos de los entregables F5. Código puro: sin red, sin D1, sin navegador.
import type { Nivel } from '../tipos';
import type { EstadoCausa } from '../agente/tipos';

// Categoría de esfuerzo que propone el modelo dentro de un enum cerrado.
// El código la convierte a puntos; nunca acepta texto libre como esfuerzo.
export type EsfuerzoPropuesto = 'bajo' | 'medio' | 'alto';
export type ClasePrioridad = 'alta' | 'media' | 'baja';
export type Carril = 'inmediato' | 'corto_plazo' | 'estructural';
export type Cuadrante = 'eliminar' | 'reducir' | 'incrementar' | 'crear';

export interface Prioridad {
  impacto: 1 | 2 | 3 | 4 | 5; // calculado por código
  esfuerzo: EsfuerzoPropuesto; // propuesto por el modelo (enum)
  esfuerzoPuntos: 1 | 2 | 3; // calculado por código
  puntaje: number; // impacto / esfuerzoPuntos, 2 decimales
  clase: ClasePrioridad;
  razones: string[]; // cómo derivó el código cada número
}

// Un paso del ciclo PDSA (Deming). `punteros`: afirmaciones que lo sostienen.
export interface PasoPDSA {
  fase: 'planear' | 'hacer' | 'estudiar' | 'actuar';
  texto: string;
  responsable: string; // rol, no nombre de persona
  punteros: string[];
}

export interface PlanVerificacion {
  causa: string; // C1…
  nivelAlGenerar: Nivel;
  estadoAlGenerar: EstadoCausa;
  queRevisar: string;
  conQuien: string;
  confirmaSi: string;
  descartaSi: string;
  pasos: PasoPDSA[]; // 4, uno por fase, en orden
}

export interface AccionIntervencion {
  id: string; // I1, I2… asignado por código en orden de prioridad
  causa: string;
  texto: string;
  cuadrante: Cuadrante; // propuesto por el modelo, agrupado por código
  carril: Carril; // derivado por código de la clase de prioridad
  prioridad: Prioridad;
  punteros: string[];
}

export interface PlanIntervencion {
  causa: string; // la causa principal elegible
  nivelAlGenerar: Nivel;
  acciones: AccionIntervencion[]; // ordenadas por prioridad descendente
  matriz: Record<Cuadrante, string[]>; // ids de acciones por cuadrante
  listasCambio: {
    // Lewin, Kotter y ADKAR como listas de verificación (texto fijo)
    descongelar: string[]; mover: string[]; recongelar: string[];
  };
}

export interface FichaIndicador {
  id: string; // K1…
  nombre: string;
  definicion: string;
  formula: string; // cómo se calcula, con numerador y denominador
  unidad: string;
  lineaBase: string | null; // null si ninguna afirmación la sostiene todavía
  meta: string;
  plazo: string;
  frecuencia: 'diaria' | 'semanal' | 'mensual';
  responsable: string; // rol
  causa: string;
  punteros: string[];
  smart: { completa: boolean; faltan: string[] }; // calculado por código
}

export interface BarraPareto {
  categoria: string; // tema de la afirmación, normalizado por código
  valor: number;
  unidad: string;
  porcentaje: number; // sobre el total, 1 decimal
  acumulado: number; // porcentaje acumulado, 1 decimal
  afirmaciones: string[];
}

export interface Pareto {
  barras: BarraPareto[]; // orden descendente por valor
  total: number;
  unidad: string;
  afirmacionesUsadas: string[];
}

export type MotivoSinPareto = 'sin_cifras_en_citas' | 'una_sola_categoria' | 'unidades_incompatibles';

export interface ItemGuia {
  tipo: 'vacio_criterio' | 'causa_abierta' | 'corroboracion_pendiente' | 'documento_pedido' | 'casilla_vacia';
  pregunta: string; // plantilla de incidente crítico (Flanagan 1954)
  paraQuien: string; // rol sugerido (muestreo teórico: quién puede cerrar el vacío)
  objetivo: string; // qué vacío del diagnóstico cierra
  punteros: string[];
}

export type MotivoRechazoEntregable =
  | 'puntero_inexistente' | 'sin_punteros' | 'causa_inexistente'
  | 'causa_no_elegible_intervencion' | 'causa_descartada'
  | 'campo_vacio' | 'cuadrante_invalido';

export interface RechazoEntregable { elemento: string; motivo: MotivoRechazoEntregable; detalle: string; }

export interface EntregablesCaso {
  version: 1;
  agenteId: string;
  huellaEstado: string; // huella determinista del estado al generar
  generadoEn: string; // ISO, lo pone el Worker
  costoUsd: number;
  demo: boolean;
  verificaciones: PlanVerificacion[];
  intervencion: PlanIntervencion | null; // null con motivo si no hay causa elegible
  motivoSinIntervencion: string | null;
  indicadores: FichaIndicador[];
  pareto: Pareto | null;
  motivoSinPareto: MotivoSinPareto | null;
  guia: ItemGuia[];
  informeMarkdown: string;
  rechazos: RechazoEntregable[];
}

// ---- Propuestas crudas del modelo (antes de aplicar.ts) ----
export interface AccionPropuesta {
  causa: string; texto: string; cuadrante: Cuadrante;
  esfuerzo: EsfuerzoPropuesto; punteros: string[];
}
export interface VerificacionPropuesta {
  causa: string; queRevisar: string; conQuien: string;
  confirmaSi: string; descartaSi: string; pasos: PasoPDSA[];
}
export interface IndicadorPropuesto {
  nombre: string; definicion: string; formula: string; unidad: string;
  lineaBase: string | null; meta: string; plazo: string;
  frecuencia: FichaIndicador['frecuencia']; responsable: string;
  causa: string; punteros: string[];
}
