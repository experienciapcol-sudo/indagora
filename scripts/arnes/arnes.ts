// Orquestación: corre las tres condiciones por caso y repetición, con tope duro
// de gasto, y escribe JSON + tabla Markdown en interno/evaluacion/.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { d1Falsa } from '../../src/worker/gasto/d1-falsa';
import type { Dependencias } from '../../src/worker/meta/cliente';
import { cargarCasos } from './casos';
import { condicionA, condicionB, condicionC } from './flujos';
import { resumir } from './metricas';
import type { Condicion, CorridaArnes, CasoEvaluacion } from './tipos';

export const CONDICIONES: Condicion[] = ['A_agente', 'B_flujo_fijo', 'C_un_solo_prompt'];
const FLUJOS = { A_agente: condicionA, B_flujo_fijo: condicionB, C_un_solo_prompt: condicionC } as const;

// Lee .dev.vars sin imprimir ningún valor.
export function leerDevVars(ruta = '.dev.vars'): Record<string, string> {
  const salida: Record<string, string> = {};
  try {
    for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(linea);
      if (m) salida[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* sin archivo: el llamador decide si omite */ }
  return salida;
}

export function dependenciasDesde(vars: Record<string, string>): Dependencias | null {
  if (!vars.META_API_KEY || !vars.META_API_BASE_URL) return null;
  return { env: { META_API_KEY: vars.META_API_KEY, META_API_BASE_URL: vars.META_API_BASE_URL }, db: d1Falsa() };
}

export interface OpcionesArnes {
  repeticiones: number;
  topeUsd: number;
  deps: Dependencias;
  casos?: CasoEvaluacion[];
  escribir?: boolean;
}

export async function correrArnes(o: OpcionesArnes): Promise<{ corridas: CorridaArnes[]; json: string; tabla: string }> {
  const casos = o.casos ?? cargarCasos();
  const corridas: CorridaArnes[] = [];
  let gastado = 0;
  for (const caso of casos) {
    for (const condicion of CONDICIONES) {
      for (let rep = 1; rep <= o.repeticiones; rep++) {
        if (gastado >= o.topeUsd) {
          corridas.push({ caso: caso.id, condicion, repeticion: rep, usd: 0, segundos: 0, omitida: `Tope del arnés alcanzado (${o.topeUsd} USD)` });
          continue;
        }
        const inicio = Date.now();
        try {
          const r = await FLUJOS[condicion](o.deps, `arnes-${caso.id}-${condicion}-${rep}-${Date.now()}`, caso);
          gastado += r.usd;
          corridas.push({ caso: caso.id, condicion, repeticion: rep, usd: r.usd, segundos: (Date.now() - inicio) / 1000, metricas: r.metricas });
        } catch (err) {
          corridas.push({ caso: caso.id, condicion, repeticion: rep, usd: 0, segundos: (Date.now() - inicio) / 1000, error: err instanceof Error ? err.message : String(err) });
        }
      }
    }
  }
  const fecha = new Date().toISOString().replace(/[:.]/g, '-');
  const json = JSON.stringify({ fecha, repeticiones: o.repeticiones, topeUsd: o.topeUsd, gastadoUsd: gastado, corridas }, null, 2);
  const tabla = tablaMarkdown(corridas, casos.map((c) => c.id));
  if (o.escribir ?? true) {
    mkdirSync(join('interno', 'evaluacion'), { recursive: true });
    writeFileSync(join('interno', 'evaluacion', `resultados-${fecha}.json`), json);
    writeFileSync(join('interno', 'evaluacion', `resultados-${fecha}.md`), tabla);
  }
  return { corridas, json, tabla };
}

const fmt = (n: number | null, d = 2) => (n === null ? '—' : n.toFixed(d));
const celda = (s: string) => s.replace(/\|/g, '\\|');

export function tablaMarkdown(corridas: readonly CorridaArnes[], casos: readonly string[]): string {
  const lineas = [
    '# Evaluación F7 — resultados del arnés',
    '',
    '| Caso | Condición | n | Causa encontrada | Intervenciones prematuras/corrida | Citas inválidas atrapadas/corrida | Casillas sin oración/corrida | Fugas/corrida | USD |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|',
  ];
  for (const caso of casos) {
    for (const condicion of CONDICIONES) {
      const delGrupo = corridas.filter((c) => c.caso === caso && c.condicion === condicion && c.metricas);
      const usd = delGrupo.reduce((a, c) => a + c.usd, 0);
      const r = resumir(delGrupo.map((c) => c.metricas!), usd);
      lineas.push(`| ${celda(caso)} | ${condicion} | ${r.n} | ${fmt(r.causaEncontrada)} | ${fmt(r.intervencionesPrematuras)} | ${fmt(r.citasInvalidasAtrapadas)} | ${fmt(r.casillasSinOracion)} | ${fmt(r.fugas)} | ${fmt(r.usd, 4)} |`);
    }
  }
  lineas.push('', 'Fugas: solo casos del Laboratorio (— en el resto). Causa encontrada: proporción sobre n.');
  return lineas.join('\n');
}
