// Elegibilidad por causa, duplicada a propósito sin tocar el núcleo del agente:
// N0–N2 o sin explicar todo solo admite verificación; intervención solo N3/N4,
// estado explica_todo y sin contradicciones abiertas.
import type { CausaEvaluada } from '../agente/tipos';

export function elegibleParaIntervencion(c: CausaEvaluada): boolean {
  return c.nivel >= 3 && c.estado === 'explica_todo' && c.contradicciones.length === 0;
}

export function elegibleParaVerificacion(c: CausaEvaluada): boolean {
  return c.estado !== 'descartada' && !elegibleParaIntervencion(c);
}

// Alias en el vocabulario de las tareas siguientes.
export const esElegibleIntervencion = elegibleParaIntervencion;
export const esElegibleVerificacion = elegibleParaVerificacion;

export function causasParaVerificacion(causas: readonly CausaEvaluada[]): CausaEvaluada[] {
  return causas.filter(elegibleParaVerificacion);
}

export function causasParaIntervencion(causas: readonly CausaEvaluada[]): CausaEvaluada[] {
  return causas.filter(elegibleParaIntervencion);
}

// Causa principal elegible: la marcada principal si puede intervenir; si no, la primera elegible.
export function causaPrincipalElegible(causas: readonly CausaEvaluada[]): CausaEvaluada | null {
  return causas.find((c) => c.principal && elegibleParaIntervencion(c)) ?? causas.find(elegibleParaIntervencion) ?? null;
}

export function motivoSinIntervencionPara(causas: readonly CausaEvaluada[]): string {
  if (causas.length === 0) return 'No hay causas probadas todavía: no se propone intervención.';
  const elegible = causaPrincipalElegible(causas);
  if (elegible) return '';
  const principal = causas.find((c) => c.principal) ?? causas[0];
  const razones: string[] = [];
  if (principal.nivel < 3) razones.push(`${principal.id} tiene N${principal.nivel}: intervenir pide N3 o N4`);
  if (principal.estado !== 'explica_todo') razones.push(`${principal.id} no explica todas las filas (estado: ${principal.estado})`);
  if (principal.contradicciones.length > 0) razones.push(`${principal.id} tiene contradicciones abiertas: ${principal.contradicciones.join(', ')}`);
  if (causas.every((c) => c.estado === 'descartada')) return 'Todas las causas están descartadas: no se propone intervención.';
  return `Sin causa elegible para intervenir: ${razones.join('; ') || 'ninguna causa cumple nivel, estado y ausencia de contradicciones'}. Solo se proponen acciones de verificación.`;
}
