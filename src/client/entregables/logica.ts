// Lógica pura de los entregables: sin React ni DOM. Se prueba aparte.
import type { AccionIntervencion, EntregablesCaso } from '../../nucleo/entregables/tipos';
import { agruparPorCarril } from '../../nucleo/entregables/matriz';
import type { Carril } from '../../nucleo/entregables/tipos';

export const CARRILES_ORDEN: readonly Carril[] = ['inmediato', 'corto_plazo', 'estructural'];

export function nombreArchivoInforme(titulo: string): string {
  const base = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `indagora-${base || 'informe'}.md`;
}

// Ancho de barra relativo a la barra mayor (100 = la mayor). Sin valores, 0.
export function anchoRelativo(valor: number, maximo: number): number {
  if (!(maximo > 0) || !(valor > 0)) return 0;
  return Math.round((valor / maximo) * 1000) / 10;
}

export function gruposPorCarril(acciones: readonly AccionIntervencion[]): { carril: Carril; acciones: AccionIntervencion[] }[] {
  const grupos = agruparPorCarril(acciones);
  return CARRILES_ORDEN.map((carril) => ({ carril, acciones: grupos[carril] }));
}

// «Solo verificación»: hay planes de verificación y ninguna intervención posible.
export const esSoloVerificacion = (e: EntregablesCaso): boolean => e.intervencion === null && e.verificaciones.length > 0;

export interface ResumenEntregables {
  verificaciones: number;
  acciones: number;
  indicadores: number;
  preguntasGuia: number;
  barrasPareto: number;
}
export function resumenDe(e: EntregablesCaso): ResumenEntregables {
  return {
    verificaciones: e.verificaciones.length,
    acciones: e.intervencion?.acciones.length ?? 0,
    indicadores: e.indicadores.length,
    preguntasGuia: e.guia.length,
    barrasPareto: e.pareto?.barras.length ?? 0,
  };
}

// ---- Markdown mínimo del informe (encabezados, listas y párrafos) ----

export type BloqueInforme =
  | { tipo: 'h1' | 'h2' | 'h3'; texto: string }
  | { tipo: 'li'; texto: string; anidado: boolean }
  | { tipo: 'p'; texto: string };

const sinNegritas = (s: string) => s.replace(/\*\*/g, '');

export function parseInformeMarkdown(md: string): BloqueInforme[] {
  const bloques: BloqueInforme[] = [];
  for (const cruda of md.split(/\r?\n/)) {
    const linea = cruda.trimEnd();
    if (!linea.trim()) continue;
    if (linea.startsWith('### ')) bloques.push({ tipo: 'h3', texto: sinNegritas(linea.slice(4).trim()) });
    else if (linea.startsWith('## ')) bloques.push({ tipo: 'h2', texto: sinNegritas(linea.slice(3).trim()) });
    else if (linea.startsWith('# ')) bloques.push({ tipo: 'h1', texto: sinNegritas(linea.slice(2).trim()) });
    else if (/^\s*- /.test(linea)) bloques.push({ tipo: 'li', texto: sinNegritas(linea.replace(/^\s*- /, '').trim()), anidado: linea.startsWith(' ') });
    else bloques.push({ tipo: 'p', texto: sinNegritas(linea.trim()) });
  }
  return bloques;
}
