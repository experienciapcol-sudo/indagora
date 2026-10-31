// Las tres condiciones. Todas llaman a Meta solo vía llamarMeta (directa o a través
// del bucle/analista) y el modelo solo señala ids de oraciones reales.
import { z } from 'zod';
import { crearEstado, nivelesDe, vistaDe } from '../../src/nucleo/agente/estado';
import { criterioDeParo, evaluarCausas } from '../../src/nucleo/agente/criterio';
import type { Decision, EstadoAgente } from '../../src/nucleo/agente/tipos';
import { segmentar } from '../../src/nucleo/segmentar';
import { darPaso } from '../../src/worker/agente/bucle';
import { ejecutar, type Contexto, type Ejecucion } from '../../src/worker/agente/ejecutores';
import { llamarMeta, type Dependencias } from '../../src/worker/meta/cliente';
import { definirSalida, enumDe } from '../../src/worker/meta/esquema';
import { citasDeLaTraza, metricasDe, metricasDesdeVista, verificarCitas, type CitaLibre } from './metricas';
import type { CasoEvaluacion, Metricas } from './tipos';

export interface ResultadoFlujo {
  metricas: Metricas;
  usd: number;
}

const decision = (accion: Decision['accion'], extra: Partial<Decision> = {}): Decision => ({
  accion,
  fuentes: [],
  causa: null,
  documento: '',
  justificacion: 'arnés de evaluación',
  punteros: [],
  ...extra,
});

// A: agente completo, con bucle y guardas (darPaso es la única puerta).
export async function condicionA(deps: Dependencias, sesion: string, caso: CasoEvaluacion): Promise<ResultadoFlujo> {
  const e = crearEstado({ id: caso.id, titulo: caso.titulo, objetivo: caso.objetivo, fuentes: caso.fuentes });
  for (let i = 0; i < e.presupuesto.pasosMax + 2 && !e.terminado; i++) await darPaso(deps, sesion, e);
  const vista = vistaDe(e, { sesionUsd: e.presupuesto.usd, globalUsd: 0 });
  return { metricas: metricasDesdeVista(vista, caso, citasDeLaTraza(vista)), usd: e.presupuesto.usd };
}

function contexto(deps: Dependencias, sesion: string, e: EstadoAgente): Contexto {
  const niveles = nivelesDe(e);
  const causas = evaluarCausas(e, niveles);
  return { deps, sesion, e, niveles, causas, criterio: criterioDeParo(e, causas), indicacion: null };
}

// B: flujo fijo, sin bucle ni guardas de método: leer, desviación, especificación,
// causas, prueba y plan, en ese orden, proponga lo que proponga cada paso.
export async function condicionB(deps: Dependencias, sesion: string, caso: CasoEvaluacion): Promise<ResultadoFlujo> {
  const e = crearEstado({ id: caso.id, titulo: caso.titulo, objetivo: caso.objetivo, fuentes: caso.fuentes });
  let usd = 0;
  let citas = 0;
  const correr = async (d: Decision & { accion: Exclude<Decision['accion'], 'detenerse'> }) => {
    const r: Ejecucion = await ejecutar(contexto(deps, sesion, e), d);
    usd += r.costoUsd;
    citas += r.rechazos.filter((r2) => r2.origen === 'verificador' || r2.origen === 'evidencia').length;
  };
  await correr(decision('leer_fuentes', { fuentes: caso.fuentes.map((f) => f.id) }));
  await correr(decision('enunciar_desviacion'));
  await correr(decision(e.seleccion?.ruta === 'cronica' ? 'barrer_weisbord' : 'especificar_es_no_es'));
  await correr(decision('generar_causas'));
  if (e.causas.length) await correr(decision('probar_causas'));
  // Plan sin guarda de nivel: se interviene sobre la primera causa, sea cual sea su nivel.
  const primera = evaluarCausas(e, nivelesDe(e))[0];
  if (primera) await correr(decision('proponer_intervencion', { causa: primera.id }));
  const vista = vistaDe(e, { sesionUsd: usd, globalUsd: 0 });
  return { metricas: metricasDesdeVista(vista, caso, citas), usd };
}

// C: un solo prompt con todas las fuentes; pide desviación, diagnóstico y plan de una vez.
export async function condicionC(deps: Dependencias, sesion: string, caso: CasoEvaluacion): Promise<ResultadoFlujo> {
  const bloques: string[] = [`Objetivo: ${caso.objetivo}`, 'Fuentes (oraciones con id; señala solo esos ids, nunca escribas citas):'];
  const ids: string[] = [];
  for (const f of caso.fuentes) {
    const { oraciones } = segmentar(f);
    bloques.push(`\nFuente ${f.id} · ${f.rol} · ${f.titulo}`);
    for (const o of oraciones) if (!o.esEntrevistador) { ids.push(o.id); bloques.push(`${o.id} ${o.texto}`); }
  }
  const casilla = z.object({ texto: z.string(), evidencia: z.array(enumDe(ids, 'ninguna')) });
  const salida = definirSalida('diagnostico_unico', z.object({
    desviacion: casilla,
    causa_principal: z.string(),
    causas: z.array(z.object({ enunciado: z.string(), evidencia: z.array(enumDe(ids, 'ninguna')) })),
    intervenciones: z.array(z.object({ causa: z.string(), accion: z.string(), evidencia: z.array(enumDe(ids, 'ninguna')) })),
    citas: z.array(z.object({
      fuente: enumDe(caso.fuentes.map((f) => f.id), 'ninguna'),
      resumen: z.string(),
      oraciones: z.array(z.object({ id: enumDe(ids, 'ninguna'), ancla: z.string() })),
    })),
  }));
  const r = await llamarMeta(deps, {
    sesion,
    proposito: 'arnes:un_solo_prompt',
    rol: 'agente',
    esfuerzo: 'medium',
    maxTokens: 8000,
    mensajes: [
      { role: 'system', content: 'Eres un consultor en administración. Con las fuentes, enuncia la desviación, diagnostica la causa principal y propón un plan de intervención. Solo señala ids de oraciones reales; el ancla son 3 a 8 palabras copiadas exactamente de la oración.' },
      { role: 'user', content: bloques.join('\n') },
    ],
    salida,
  });
  const d = r.datos;
  const citasLibres: CitaLibre[] = d.citas
    .filter((c) => c.fuente !== 'ninguna')
    .map((c) => ({ fuente: c.fuente, resumen: c.resumen, oraciones: c.oraciones.filter((o) => o.id !== 'ninguna') }));
  const { invalidas } = verificarCitas(caso.fuentes, citasLibres);
  const sinEvidencia = (xs: { evidencia: string[] }[]) => xs.filter((x) => x.evidencia.filter((i) => i !== 'ninguna').length === 0).length;
  const casillas = (d.desviacion.texto.trim() ? sinEvidencia([d.desviacion]) : 0) + sinEvidencia(d.causas) + sinEvidencia(d.intervenciones);
  const metricas = metricasDe({
    caso,
    causaEncontrada: caso.patrones.causa.test(d.causa_principal),
    // Sin niveles calculados por código, toda intervención de C es prematura por definición.
    intervenciones: d.intervenciones.map((i) => ({ enunciadoCausa: i.causa, nivel: null })),
    citasInvalidasAtrapadas: invalidas,
    casillasSinOracion: casillas,
    textosSalida: [d.causa_principal, ...d.causas.map((c) => c.enunciado), ...d.intervenciones.map((i) => i.accion)],
  });
  return { metricas, usd: r.costoUsd };
}
