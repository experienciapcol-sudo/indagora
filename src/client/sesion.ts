import type { Afirmacion, FuenteEntrada, NivelCalculado, Previa, RespuestaAnalisis, TipoFuente } from '../nucleo/tipos';

export type EstadoFuente =
  | { tipo: 'pendiente' }
  | { tipo: 'analizando' }
  | { tipo: 'lista'; resp: RespuestaAnalisis }
  | { tipo: 'error'; mensaje: string };

export type EstadosPorFuente = Record<string, EstadoFuente>;

// Seis decimales: una llamada cuesta fracciones de milésima de dólar.
export const formatoUsd = (n: number) => `${n.toFixed(6)} USD`;
export const formatoSegundos = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

// E1, E2… para entrevistas y D1, D2… para documentos. Se toma el mayor usado + 1,
// así que quitar una fuente nunca repite un id existente.
export function siguienteId(fuentes: readonly FuenteEntrada[], tipo: TipoFuente): string {
  const prefijo = tipo === 'entrevista' ? 'E' : 'D';
  let mayor = 0;
  for (const f of fuentes) {
    if (f.id.startsWith(prefijo)) {
      const n = Number.parseInt(f.id.slice(1), 10);
      if (Number.isFinite(n) && n > mayor) mayor = n;
    }
  }
  return `${prefijo}${mayor + 1}`;
}

export function previasDe(afirmaciones: readonly Afirmacion[]): Previa[] {
  return afirmaciones.map((a) => ({ id: a.id, fuente: a.fuente, rol: a.rol, resumen: a.resumen }));
}

export function afirmacionesListas(fuentes: readonly FuenteEntrada[], estados: EstadosPorFuente, excepto?: string): Afirmacion[] {
  const salida: Afirmacion[] = [];
  for (const f of fuentes) {
    if (f.id === excepto) continue;
    const e = estados[f.id];
    if (e?.tipo === 'lista') salida.push(...e.resp.afirmaciones);
  }
  return salida;
}

// Al quitar una fuente, su id puede volver a usarse: las referencias que otras fuentes tenían
// a sus afirmaciones se borran para que no apunten a las de la fuente nueva.
export function sinReferenciasA(estados: EstadosPorFuente, fuenteId: string): EstadosPorFuente {
  const ajena = (id: string) => !id.startsWith(`${fuenteId}-`);
  return Object.fromEntries(
    Object.entries(estados).map(([id, e]) => {
      if (e.tipo !== 'lista') return [id, e];
      const afirmaciones = e.resp.afirmaciones.map((a) => ({ ...a, corrobora: a.corrobora.filter(ajena), contradice: a.contradice.filter(ajena) }));
      return [id, { ...e, resp: { ...e.resp, afirmaciones } }];
    }),
  );
}

// Claves de par que involucran a una afirmación, ya sean pendientes o confirmadas.
export function clavesDe(id: string, calculado: NivelCalculado | undefined, confirmadas: ReadonlySet<string>): string[] {
  const claves = new Set<string>(calculado?.pendientes ?? []);
  for (const k of confirmadas) if (k.split('|').includes(id)) claves.add(k);
  return [...claves].sort();
}

export function descargarJson(nombre: string, datos: unknown): void {
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
