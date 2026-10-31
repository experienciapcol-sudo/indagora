// Matriz de las cuatro acciones (Kim y Mauborgne 2005) y carriles, agrupados por código.
import type { AccionIntervencion, Carril, Cuadrante } from './tipos';

export const CUADRANTES: readonly Cuadrante[] = ['eliminar', 'reducir', 'incrementar', 'crear'];
export const CARRILES: readonly Carril[] = ['inmediato', 'corto_plazo', 'estructural'];

export function construirMatriz(acciones: readonly AccionIntervencion[]): Record<Cuadrante, string[]> {
  const matriz: Record<Cuadrante, string[]> = { eliminar: [], reducir: [], incrementar: [], crear: [] };
  for (const a of acciones) if (CUADRANTES.includes(a.cuadrante)) matriz[a.cuadrante].push(a.id);
  return matriz;
}

export function agruparPorCarril(acciones: readonly AccionIntervencion[]): Record<Carril, AccionIntervencion[]> {
  const salida: Record<Carril, AccionIntervencion[]> = { inmediato: [], corto_plazo: [], estructural: [] };
  for (const a of acciones) salida[a.carril].push(a);
  return salida;
}

// Listas de verificación del cambio: Lewin (descongelar/mover/recongelar), Kotter y ADKAR resumidos.
export const LISTAS_CAMBIO: { descongelar: string[]; mover: string[]; recongelar: string[] } = {
  descongelar: [
    'Compartir la desviación y su evidencia con quienes operan el proceso (Lewin: descongelar).',
    'Crear sentido de urgencia con datos del caso, sin señalar personas (Kotter 1; ADKAR: conciencia).',
  ],
  mover: [
    'Nombrar responsables por rol y primeros pasos visibles (Kotter 2-6; ADKAR: deseo, conocimiento y habilidad).',
    'Retirar obstáculos del mecanismo de la causa y acompañar la práctica nueva.',
  ],
  recongelar: [
    'Convertir la práctica en rutina con indicadores y revisión periódica (Lewin: recongelar; Kotter 7-8).',
    'Reforzar con reconocimiento cuando el indicador mejore (ADKAR: refuerzo).',
  ],
};
