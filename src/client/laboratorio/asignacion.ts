// Lógica pura de asignación de hablantes: envuelve el núcleo para la pantalla, sin DOM.
import type { FuenteEntrada } from '../../nucleo/tipos';
import { aplicarAsignaciones, detectarHablantes } from '../../nucleo/laboratorio/hablantes';
import type { AsignacionHablante, HablanteDetectado } from '../../nucleo/laboratorio/tipos';

export function asignacionesIniciales(detectados: HablanteDetectado[]): AsignacionHablante[] {
  return detectados.map((d, i) => ({
    etiqueta: d.etiqueta,
    // En texto pegado la etiqueta suele ser ya un nombre útil; en voz («Hablante 1») queda vacío.
    rol: /^hablante\s+\d+$/i.test(d.etiqueta) ? '' : d.etiqueta,
    esEntrevistador: i === 0,
    esPrincipal: i === 1,
  }));
}

export function detectarYAsignar(texto: string): { detectados: HablanteDetectado[]; asignaciones: AsignacionHablante[] } {
  const detectados = detectarHablantes(texto);
  return { detectados, asignaciones: asignacionesIniciales(detectados) };
}

// Crea la fuente normalizada. El texto ya trae cada hablante reescrito con su rol,
// incluido el de una sola intervención.
// Nota: falta el campo opcional `hablantesConocidos` en `FuenteEntrada`
// (src/nucleo/tipos.ts) y su uso en `etiquetasValidas` (src/nucleo/segmentar.ts),
// previsto en el diseño F6 §2.5, para que `segmentar` conserve como turno propio
// al hablante de una sola intervención; véase la nota al revisor.
export function crearFuenteDeTexto(
  texto: string,
  asignaciones: AsignacionHablante[],
  opciones: { limpiar?: boolean; id?: string; titulo?: string } = {},
): { fuente: FuenteEntrada | null; avisos: string[] } {
  return aplicarAsignaciones(texto, asignaciones, opciones);
}

export function asignacionCompleta(asignaciones: AsignacionHablante[]): boolean {
  return (
    asignaciones.length >= 2 &&
    asignaciones.every((a) => a.rol.trim() !== '') &&
    asignaciones.filter((a) => a.esEntrevistador).length === 1 &&
    asignaciones.filter((a) => a.esPrincipal).length === 1
  );
}
