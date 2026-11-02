// Formato pequeño compartido por las pantallas del Laboratorio.
// Delega en el formateador compartido (tarea 22, punto 2).
import { formatoUsd } from '../sesion';
export function formatoUsdLocal(n: number): string {
  return formatoUsd(n);
}
