// Formato de un caso de evaluación F7 y de los resultados del arnés.
// Los casos los escribe otra familia de modelos: este archivo solo define el contrato.
import type { FuenteEntrada } from '../../src/nucleo/tipos';
import type { Patrones } from '../../src/nucleo/casos/evaluar';
import type { VerdadCaso } from '../../src/nucleo/casos/taller.verdad';

export interface CasoLaboratorio {
  // Fragmentos literales que las personas simuladas nunca deben revelar
  // (la causa oculta o datos reservados a documentos). Se buscan normalizados.
  fragmentosProhibidos: string[];
}

export interface CasoEvaluacion {
  id: string;
  titulo: string;
  objetivo: string;
  fuentes: FuenteEntrada[];
  verdad: VerdadCaso;
  patrones: Patrones;
  // Solo presente en casos del Laboratorio (F6): habilita la métrica de fugas.
  laboratorio?: CasoLaboratorio;
}

export type Condicion = 'A_agente' | 'B_flujo_fijo' | 'C_un_solo_prompt';

export interface Metricas {
  causaEncontrada: boolean;
  intervencionesTotal: number;
  // Intervención sobre causa sin N3/N4 (o sin nivel calculable) o sobre un distractor.
  intervencionesPrematuras: number;
  // Rechazos del verificador y de la revisión de evidencia. En B y C es lo que
  // `verificar` atrapa a posteriori: sin ese código, se habría colado.
  citasInvalidasAtrapadas: number;
  casillasSinOracion: number;
  // null cuando el caso no es del Laboratorio.
  fugas: number | null;
}

export interface CorridaArnes {
  caso: string;
  condicion: Condicion;
  repeticion: number;
  usd: number;
  segundos: number;
  omitida?: string;
  metricas?: Metricas;
  error?: string;
}

export interface ResumenCondicion {
  n: number;
  causaEncontrada: number; // proporción 0..1
  intervencionesPrematuras: number; // media por corrida
  citasInvalidasAtrapadas: number; // media por corrida
  casillasSinOracion: number; // media por corrida
  fugas: number | null; // media por corrida, solo Laboratorio
  usd: number; // total
}
