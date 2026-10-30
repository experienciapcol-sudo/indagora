// Evaluación de causas y criterio de paro. Todo lo calcula el código a partir del estado:
// el modelo propone juicios con evidencia, pero el nivel de una causa, si queda descartada y
// si el diagnóstico es defendible se deciden aquí.
import type { Afirmacion, Nivel, NivelCalculado } from '../tipos';
import type { Casilla, CausaEvaluada, EstadoAgente, EstadoCriterio } from './tipos';

// Filas contra las que se prueba una causa: la especificación en la ruta aguda, las casillas
// con brecha en la crónica.
export function filasDePrueba(e: EstadoAgente): string[] {
  if (e.seleccion?.ruta === 'cronica') return (e.weisbord ?? []).filter((h) => h.estado === 'brecha').map((h) => h.id);
  return (e.esNoEs ?? []).map((f) => f.id);
}

const nivelDe = (niveles: ReadonlyMap<string, NivelCalculado>, id: string): Nivel => niveles.get(id)?.nivel ?? 0;

// Afirmaciones que contradicen a `id`, en cualquier dirección.
function opuestas(id: string, afirmaciones: readonly Afirmacion[]): string[] {
  const propia = afirmaciones.find((a) => a.id === id);
  const salida = new Set(propia?.contradice ?? []);
  for (const a of afirmaciones) if (a.contradice.includes(id)) salida.add(a.id);
  return [...salida];
}

export function evaluarCausas(e: EstadoAgente, niveles: ReadonlyMap<string, NivelCalculado>): CausaEvaluada[] {
  const filas = filasDePrueba(e);
  const evaluadas = e.causas.map((c): CausaEvaluada => {
    const nivel = c.evidencia.reduce<Nivel>((m, id) => Math.max(m, nivelDe(niveles, id)) as Nivel, 0);
    const juicios = e.juicios.filter((j) => j.causa === c.id && filas.includes(j.fila));
    const explicadas = new Set(juicios.filter((j) => j.veredicto === 'explica').map((j) => j.fila));
    const descartadaPor = juicios.filter((j) => j.veredicto === 'no_explica' && j.evidencia.length > 0).map((j) => j.fila);
    // Una contradicción queda resuelta si la causa tiene N3 o N4 y lo que la contradice pesa menos.
    const contradicciones = c.evidencia.filter((id) =>
      opuestas(id, e.afirmaciones).some((o) => !(nivel >= 3 && nivelDe(niveles, o) < nivel)),
    );
    const estado =
      juicios.length === 0 ? 'sin_probar' : descartadaPor.length > 0 ? 'descartada' : filas.length > 0 && explicadas.size === filas.length ? 'explica_todo' : 'incompleta';
    return {
      id: c.id,
      nivel,
      estado,
      filasExplicadas: explicadas.size,
      filasTotales: filas.length,
      descartadaPor,
      contradicciones,
      verificacion: e.verificaciones.some((v) => v.causa === c.id),
      intervencion: e.intervenciones.some((i) => i.causa === c.id),
      principal: false,
    };
  });
  // Principal: la que explica todo con el mayor nivel; a igual nivel, la primera.
  const candidata = evaluadas.filter((c) => c.estado === 'explica_todo').sort((a, b) => b.nivel - a.nivel)[0];
  if (candidata) candidata.principal = true;
  return evaluadas;
}

// Lo que solo el consultor puede destrabar cuando a la causa principal le falta nivel:
// confirmar corroboraciones propuestas sobre su evidencia o aportar los documentos pedidos.
// Vacío si falta algo más que el nivel de la principal.
export function esperaDelConsultor(e: EstadoAgente, causas: readonly CausaEvaluada[], niveles: ReadonlyMap<string, NivelCalculado>, criterio: EstadoCriterio): string[] {
  const p = causas.find((c) => c.principal);
  if (!p || criterio.cumplido || !criterio.faltantes.every((f) => f.startsWith(`${p.id} tiene N`))) return [];
  const evidencia = e.causas.find((c) => c.id === p.id)!.evidencia;
  const pares = new Set(evidencia.flatMap((id) => niveles.get(id)?.pendientes ?? []));
  return [
    ...[...pares].map((k) => `Confirmar la corroboración ${k.replace('|', ' con ')}`),
    ...e.solicitudes.map((s) => `Aportar el documento ${s.id}: ${s.descripcion}`),
  ];
}

const casillas = (e: EstadoAgente): Casilla[] => [
  ...(e.desviacion ? [e.desviacion.esperado, e.desviacion.ocurre, e.desviacion.desdeCuando, e.desviacion.cuanto, e.desviacion.contraste] : []),
  ...(e.esNoEs ?? []).flatMap((f) => [f.es, f.noEs, f.distincion, f.cambio]),
  ...(e.weisbord ?? []).map((h) => h.hallazgo),
];

const llena = (c: Casilla) => c.texto.trim() !== '';

export function criterioDeParo(e: EstadoAgente, causas: readonly CausaEvaluada[]): EstadoCriterio {
  const cumplidos: string[] = [];
  const faltantes: string[] = [];
  const revisar = (ok: boolean, si: string, no: string) => (ok ? cumplidos : faltantes).push(ok ? si : no);

  const sinLeer = e.fuentes.filter((f) => !e.lecturas[f.id]).map((f) => f.id);
  revisar(sinLeer.length === 0, 'Todas las fuentes entregadas están leídas', `Faltan fuentes por leer: ${sinLeer.join(', ')}`);

  const d = e.desviacion;
  revisar(!!d && llena(d.ocurre) && llena(d.esperado), 'La desviación está enunciada con evidencia', 'Falta enunciar la desviación (qué se esperaba y qué ocurre) con evidencia');

  if (e.seleccion?.ruta === 'cronica') {
    revisar((e.weisbord ?? []).some((h) => h.estado === 'brecha'), 'El barrido de Weisbord encontró brechas con evidencia', 'Falta barrer las seis casillas de Weisbord con evidencia');
  } else {
    const contrastadas = (e.esNoEs ?? []).filter((f) => llena(f.es) && llena(f.noEs)).length;
    revisar(contrastadas >= 2, `La especificación Es/No Es tiene ${contrastadas} filas con contraste`, 'Falta una especificación Es/No Es con al menos 2 filas que tengan lo que es y lo que no es');
  }

  revisar(causas.length > 0, `Hay ${causas.length} causas posibles`, 'Faltan causas posibles');
  const sinProbar = causas.filter((c) => c.estado === 'sin_probar').map((c) => c.id);
  if (causas.length > 0) revisar(sinProbar.length === 0, 'Todas las causas están probadas contra la especificación', `Faltan causas por probar: ${sinProbar.join(', ')}`);

  const p = causas.find((c) => c.principal) ?? null;
  revisar(!!p, `${p?.id} explica todas las filas con evidencia`, 'Ninguna causa explica todas las filas con evidencia');
  if (p) {
    revisar(
      p.nivel >= 3,
      `${p.id} tiene N${p.nivel}`,
      `${p.id} tiene N${p.nivel}: falta corroborarla con otro rol (N3) o con un documento (N4)`,
    );
    revisar(p.contradicciones.length === 0, `Sin contradicciones abiertas en la evidencia de ${p.id}`, `Contradicciones sin resolver en la evidencia de ${p.id}: ${p.contradicciones.join(', ')}`);
  }

  const abiertas = causas.filter((c) => !c.principal && c.estado !== 'descartada' && !c.verificacion).map((c) => c.id);
  if (causas.length > 0) {
    revisar(abiertas.length === 0, 'Las demás causas están descartadas o tienen verificación diseñada', `Falta descartar o diseñar la verificación de: ${abiertas.join(', ')}`);
  }

  const vacias = casillas(e).filter((c) => llena(c) && c.evidencia.length === 0).length;
  revisar(vacias === 0, 'Ninguna casilla llena sin oración', `${vacias} casillas llenas sin oración`);

  const principalValida = !!p && p.nivel >= 3 && p.contradicciones.length === 0;
  return { cumplido: faltantes.length === 0, principal: principalValida ? p!.id : null, cumplidos, faltantes };
}
