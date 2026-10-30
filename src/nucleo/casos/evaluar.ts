// Compara una corrida del agente con la verdad plantada de un caso. Lo usan el script de
// corrida y, en F7, el arnés de evaluación. La interfaz nunca lo importa.
import type { Afirmacion } from '../tipos';
import type { VistaAgente } from '../agente/tipos';
import { normal } from '../verificar';
import type { VerdadCaso } from './taller.verdad';

const conFragmento = (afirmaciones: readonly Afirmacion[], fuente: string, fragmento: string) =>
  afirmaciones.filter((a) => a.fuente === fuente && normal(a.cita).includes(normal(fragmento))).map((a) => a.id);

// Cuántas corroboraciones esperadas propuso el modelo (en cualquier dirección).
export function corroboracionesEncontradas(afirmaciones: readonly Afirmacion[], verdad: VerdadCaso) {
  const relacion = new Set<string>();
  for (const a of afirmaciones) for (const b of a.corrobora) relacion.add(`${a.id}|${b}`).add(`${b}|${a.id}`);
  const detalle = verdad.corroboraciones.map((c) => {
    const as = conFragmento(afirmaciones, c.a.fuente, c.a.fragmento);
    const bs = conFragmento(afirmaciones, c.b.fuente, c.b.fragmento);
    return { nota: c.nota, encontrada: as.some((x) => bs.some((y) => relacion.has(`${x}|${y}`))), extraida: as.length > 0 && bs.length > 0 };
  });
  return { esperadas: detalle.length, encontradas: detalle.filter((d) => d.encontrada).length, posibles: detalle.filter((d) => d.extraida).length, detalle };
}

// Patrones de la causa real y de los distractores, propios de cada caso.
export interface Patrones {
  causa: RegExp;
  distractores: RegExp;
}

export function evaluarCorrida(v: VistaAgente, verdad: VerdadCaso, p: Patrones) {
  const { estado, causas, criterio } = v;
  const principal = estado.causas.find((c) => c.id === criterio.principal) ?? null;
  const rechazos = estado.traza.filter((ev) => ev.tipo === 'rechazo');
  const porOrigen: Record<string, number> = {};
  for (const r of rechazos) if (r.tipo === 'rechazo') porOrigen[`${r.origen}:${r.motivo}`] = (porOrigen[`${r.origen}:${r.motivo}`] ?? 0) + 1;
  const distractores = estado.causas.filter((c) => p.distractores.test(c.enunciado)).map((c) => ({ id: c.id, enunciado: c.enunciado, estado: causas.find((x) => x.id === c.id)!.estado }));
  return {
    terminado: estado.terminado,
    pasos: estado.presupuesto.pasos,
    usd: estado.presupuesto.usd,
    principal: principal ? { id: principal.id, enunciado: principal.enunciado, nivel: causas.find((c) => c.id === principal.id)!.nivel } : null,
    causaCorrecta: !!principal && p.causa.test(principal.enunciado),
    distractores,
    // Un distractor nunca debe ser la causa principal ni recibir una intervención.
    distractorComoCausa: distractores.some((d) => d.id === principal?.id) || estado.intervenciones.some((i) => distractores.some((d) => d.id === i.causa)),
    rechazos: porOrigen,
    corroboraciones: corroboracionesEncontradas(estado.afirmaciones, verdad),
    faltantes: criterio.faltantes,
  };
}
