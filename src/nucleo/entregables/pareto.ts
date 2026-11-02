// Pareto solo con cifras literales en la cita y presentes en la especificidad que detecta el código.
// Reglas de código: una cita con dos cifras distintas aptas es ambigua (¿la antigua o la vigente?)
// y no aporta; un mismo hecho corroborado entre fuentes cuenta una sola vez; y solo se suman
// cifras de la misma unidad y de la misma clase de magnitud conocida (plazo/entrega frente a
// duración puntual de un retrabajo). Una cita sin clase conocida no bloquea: es comodín.
import type { Afirmacion, NivelCalculado } from '../tipos';
import type { BarraPareto, MotivoSinPareto, Pareto } from './tipos';

const numerosDe = (s: string): number[] =>
  [...s.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(',', '.'))).filter((n) => Number.isFinite(n));

interface Cifra { valor: number; unidad: string; magnitud: string }

// Clase de magnitud reconocible en la cita completa, no en la frase exacta tras la cifra:
// las citas válidas del caso ("tardó 6 días", "6 días de retraso", "llegó 2 días tarde")
// comparten clase aunque redacten distinto. Solo se separan clases conocidas y distintas;
// sin clase conocida ('') la cifra actúa como comodín y no impide agrupar.
function claseMagnitud(cita: string): string {
  const t = cita.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ' ');
  if (/\b(retrabajo|duracion|duro|duraron|dura|duran)\b/.test(t)) return 'duracion_puntual';
  if (/\b(entrega|entregar|entregan|entregado|espera|esperan|esperar|plazo|plazos|tarda|tardan|tardo|tardaron|demora|demoran|demoro|demoraron|retraso|retrasos|atraso|atrasos|llega|llegan|llego|llegaron|perdido|perdidos|perdida|perdidas|tarde)\b/.test(t)) return 'tiempo_entrega';
  return '';
}

function extraerInterna(a: Afirmacion, nivel: number): Cifra | null {
  if (nivel < 2) return null;
  const enEspecificidad = new Set(a.especificidad.flatMap(numerosDe));
  if (enEspecificidad.size === 0) return null;
  const halladas: Cifra[] = [];
  for (const m of a.cita.matchAll(/\d+(?:[.,]\d+)?%?/g)) {
    const crudo = m[0];
    const valor = Number(crudo.replace('%', '').replace(',', '.'));
    if (!enEspecificidad.has(valor)) continue;
    let unidad = '';
    const fin = (m.index ?? 0) + crudo.length;
    if (crudo.endsWith('%')) unidad = '%';
    else {
      const resto = a.cita.slice(fin);
      const token = resto.trimStart().match(/^([^\s,.;:()]+)/)?.[1] ?? '';
      unidad = token.toLowerCase();
    }
    halladas.push({ valor, unidad, magnitud: claseMagnitud(a.cita) });
  }
  if (halladas.length === 0) return null;
  // Ambigüedad: dos valores distintos aptos en la misma cita (p. ej. el antiguo y el vigente).
  // El código no puede saber cuál es el actual: no aporta ninguna cifra al Pareto.
  if (new Set(halladas.map((h) => h.valor)).size > 1) return null;
  return halladas[0];
}

export function extraerCifras(a: Afirmacion, nivel: number): { valor: number; unidad: string } | null {
  const c = extraerInterna(a, nivel);
  return c ? { valor: c.valor, unidad: c.unidad } : null;
}

const normalTema = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ');
const redondear1 = (n: number) => Math.round(n * 10) / 10;

export function calcularPareto(
  afirmaciones: readonly Afirmacion[],
  niveles: ReadonlyMap<string, NivelCalculado>,
): { pareto: Pareto | null; motivo: MotivoSinPareto | null } {
  interface Dato { categoria: string; valor: number; unidad: string; magnitud: string; id: string }
  const datos: Dato[] = [];
  for (const a of afirmaciones) {
    const nivel = niveles.get(a.id)?.nivel ?? 0;
    const elegible =
      nivel >= 2 &&
      ((a.tipoFuente === 'documento' && nivel === 4) || (a.tipo === 'testimonio_especifico' && nivel >= 2));
    if (!elegible) continue;
    const cifra = extraerInterna(a, nivel);
    if (!cifra) continue;
    datos.push({ categoria: normalTema(a.tema), valor: cifra.valor, unidad: cifra.unidad, magnitud: cifra.magnitud, id: a.id });
  }
  if (datos.length === 0) return { pareto: null, motivo: 'sin_cifras_en_citas' };

  // Deduplicación del hecho corroborado: afirmaciones enlazadas por `corrobora` (directa o en
  // cadena) que repiten categoría, valor, unidad y magnitud son UN hecho: cuenta una vez y la
  // barra conserva todos los ids que lo sostienen.
  const porIdDato = new Map(datos.map((d) => [d.id, d]));
  const padre = new Map(datos.map((d) => [d.id, d.id]));
  const raiz = (x: string): string => {
    let r = x;
    while (padre.get(r) !== r) r = padre.get(r)!;
    return r;
  };
  const porIdAfirmacion = new Map(afirmaciones.map((a) => [a.id, a]));
  for (const d of datos) {
    for (const otro of porIdAfirmacion.get(d.id)?.corrobora ?? []) {
      if (porIdDato.has(otro)) padre.set(raiz(d.id), raiz(otro));
    }
  }
  const hechos = new Map<string, { dato: Dato; ids: string[] }>();
  for (const d of datos) {
    const clave = `${raiz(d.id)}|${d.categoria}|${d.valor}|${d.unidad}|${d.magnitud}`;
    const actual = hechos.get(clave);
    if (actual) { if (!actual.ids.includes(d.id)) actual.ids.push(d.id); }
    else hechos.set(clave, { dato: d, ids: [d.id] });
  }
  const unicos: { dato: Dato; ids: string[] }[] = [...hechos.values()];

  // Agrupar solo dentro de la misma unidad y la misma magnitud conocida. Las cifras sin
  // clase conocida ('') son comodín: acompañan a cualquier grupo de su unidad.
  const porClave = new Map<string, { dato: Dato; ids: string[] }[]>();
  for (const h of unicos) {
    const clave = `${h.dato.unidad}|${h.dato.magnitud}`;
    porClave.set(clave, [...(porClave.get(clave) ?? []), h]);
  }
  const comodinPorUnidad = new Map<string, { dato: Dato; ids: string[] }[]>();
  for (const h of unicos) {
    if (h.dato.magnitud !== '') continue;
    comodinPorUnidad.set(h.dato.unidad, [...(comodinPorUnidad.get(h.dato.unidad) ?? []), h]);
  }
  const grupos = [...porClave.entries()].map(([clave, lista]) => {
    const unidad = lista[0].dato.unidad;
    const completa = lista[0].dato.magnitud === '' ? lista : [...lista, ...(comodinPorUnidad.get(unidad) ?? [])];
    return {
      clave,
      unidad,
      lista: completa,
      categorias: new Set(completa.map((h) => h.dato.categoria)).size,
    };
  });
  grupos.sort((x, y) => y.categorias - x.categorias || y.lista.length - x.lista.length || x.clave.localeCompare(y.clave));
  const elegido = grupos[0];
  const totalCategorias = new Set(unicos.map((h) => h.dato.categoria)).size;
  if (elegido.categorias < 2) {
    return { pareto: null, motivo: totalCategorias >= 2 ? 'unidades_incompatibles' : 'una_sola_categoria' };
  }

  const porCategoria = new Map<string, { valor: number; ids: string[] }>();
  for (const h of elegido.lista) {
    const actual = porCategoria.get(h.dato.categoria) ?? { valor: 0, ids: [] };
    actual.valor += h.dato.valor;
    for (const id of h.ids) if (!actual.ids.includes(id)) actual.ids.push(id);
    porCategoria.set(h.dato.categoria, actual);
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
    pareto: { barras, total: redondear1(total), unidad: elegido.unidad, afirmacionesUsadas: [...new Set(elegido.lista.flatMap((h) => h.ids))] },
    motivo: null,
  };
}
