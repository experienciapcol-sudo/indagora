// Pareto solo con cifras literales en la cita y presentes en la especificidad que detecta el código.
import type { Afirmacion, NivelCalculado } from '../tipos';
import type { BarraPareto, MotivoSinPareto, Pareto } from './tipos';

const numerosDe = (s: string): number[] =>
  [...s.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(',', '.'))).filter((n) => Number.isFinite(n));

export function extraerCifras(a: Afirmacion, nivel: number): { valor: number; unidad: string } | null {
  if (nivel < 2) return null;
  const enEspecificidad = new Set(a.especificidad.flatMap(numerosDe));
  if (enEspecificidad.size === 0) return null;
  for (const m of a.cita.matchAll(/\d+(?:[.,]\d+)?%?/g)) {
    const crudo = m[0];
    const valor = Number(crudo.replace('%', '').replace(',', '.'));
    if (!enEspecificidad.has(valor)) continue;
    let unidad = '';
    if (crudo.endsWith('%')) unidad = '%';
    else {
      const resto = a.cita.slice((m.index ?? 0) + crudo.length);
      const token = resto.trimStart().match(/^([^\s,.;:()]+)/)?.[1] ?? '';
      unidad = token.toLowerCase();
    }
    return { valor, unidad };
  }
  return null;
}

const normalTema = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ');
const redondear1 = (n: number) => Math.round(n * 10) / 10;

export function calcularPareto(
  afirmaciones: readonly Afirmacion[],
  niveles: ReadonlyMap<string, NivelCalculado>,
): { pareto: Pareto | null; motivo: MotivoSinPareto | null } {
  interface Dato { categoria: string; valor: number; unidad: string; id: string }
  const datos: Dato[] = [];
  for (const a of afirmaciones) {
    const nivel = niveles.get(a.id)?.nivel ?? 0;
    const elegible =
      nivel >= 2 &&
      ((a.tipoFuente === 'documento' && nivel === 4) || (a.tipo === 'testimonio_especifico' && nivel >= 2));
    if (!elegible) continue;
    const cifra = extraerCifras(a, nivel);
    if (!cifra) continue;
    datos.push({ categoria: normalTema(a.tema), valor: cifra.valor, unidad: cifra.unidad, id: a.id });
  }
  if (datos.length === 0) return { pareto: null, motivo: 'sin_cifras_en_citas' };

  // Agrupar solo dentro de la misma unidad; elegir el grupo con más categorías.
  const porUnidad = new Map<string, Dato[]>();
  for (const d of datos) porUnidad.set(d.unidad, [...(porUnidad.get(d.unidad) ?? []), d]);
  const grupos = [...porUnidad.entries()].map(([unidad, lista]) => ({
    unidad,
    lista,
    categorias: new Set(lista.map((d) => d.categoria)).size,
  }));
  grupos.sort((x, y) => y.categorias - x.categorias || y.lista.length - x.lista.length || x.unidad.localeCompare(y.unidad));
  const elegido = grupos[0];
  const totalCategorias = new Set(datos.map((d) => d.categoria)).size;
  if (elegido.categorias < 2) {
    return { pareto: null, motivo: totalCategorias >= 2 ? 'unidades_incompatibles' : 'una_sola_categoria' };
  }

  const porCategoria = new Map<string, { valor: number; ids: string[] }>();
  for (const d of elegido.lista) {
    const actual = porCategoria.get(d.categoria) ?? { valor: 0, ids: [] };
    actual.valor += d.valor;
    if (!actual.ids.includes(d.id)) actual.ids.push(d.id);
    porCategoria.set(d.categoria, actual);
  }
  const total = [...porCategoria.values()].reduce((s, x) => s + x.valor, 0);
  if (total <= 0) return { pareto: null, motivo: 'sin_cifras_en_citas' };

  const ordenadas = [...porCategoria.entries()]
    .map(([categoria, x]) => ({ categoria, valor: x.valor, afirmaciones: x.ids }))
    .sort((a, b) => b.valor - a.valor || a.categoria.localeCompare(b.categoria));

  let acumuladoValor = 0;
  const barras: BarraPareto[] = ordenadas.map((b) => {
    acumuladoValor += b.valor;
    return {
      categoria: b.categoria,
      valor: b.valor,
      unidad: elegido.unidad,
      porcentaje: redondear1((b.valor / total) * 100),
      acumulado: redondear1((acumuladoValor / total) * 100),
      afirmaciones: b.afirmaciones,
    };
  });
  return {
    pareto: { barras, total, unidad: elegido.unidad, afirmacionesUsadas: [...new Set(elegido.lista.map((d) => d.id))] },
    motivo: null,
  };
}
