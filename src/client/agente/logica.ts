// Lógica pura de la vista del agente: agrupar, contar y formatear. Sin React ni DOM.
import {
  CASILLAS_WEISBORD,
  DIMENSIONES,
  ESPINAS_6M,
  type Casilla,
  type Causa,
  type CausaEvaluada,
  type EventoTraza,
  type Espina,
  type FilaEsNoEs,
  type HallazgoWeisbord,
  type Juicio,
  type OrigenRechazo,
  type Presupuesto,
  type Seleccion,
} from '../../nucleo/agente/tipos';
import type { Nivel, NivelCalculado } from '../../nucleo/tipos';

// ---------- traza ----------

export function contarRechazos(traza: readonly EventoTraza[]): { total: number; porOrigen: Record<OrigenRechazo, number> } {
  const porOrigen: Record<OrigenRechazo, number> = { guarda: 0, evidencia: 0, verificador: 0 };
  for (const e of traza) if (e.tipo === 'rechazo') porOrigen[e.origen] += 1;
  return { total: porOrigen.guarda + porOrigen.evidencia + porOrigen.verificador, porOrigen };
}

// Número del paso que está por correr: el mayor visto en la traza o en el presupuesto, más uno.
export function pasoSiguiente(traza: readonly EventoTraza[], presupuesto: Pick<Presupuesto, 'pasos'> | null): number {
  let mayor = presupuesto?.pasos ?? 0;
  for (const e of traza) if (e.paso > mayor) mayor = e.paso;
  return mayor + 1;
}

// Los punteros del modelo son ids de afirmación (E2-A05); lo demás no abre el detalle.
export const esIdAfirmacion = (s: string) => /^[A-Z]+\d+-A\d+$/.test(s);

const sinVacios = (xs: readonly string[]) => xs.map((x) => x.trim()).filter((x) => x.length > 0);

// Los parámetros de una decisión llegan como texto; si son JSON se muestran como «clave: valor».
export function parametrosLegibles(parametros: string): string {
  const texto = parametros.trim();
  if (!texto) return '';
  let valor: unknown;
  try {
    valor = JSON.parse(texto);
  } catch {
    return texto;
  }
  if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) return texto;
  const partes: string[] = [];
  for (const [clave, v] of Object.entries(valor)) {
    if (v === null || v === undefined || v === '') continue;
    if (Array.isArray(v)) {
      const items = sinVacios(v.map(String));
      if (items.length > 0) partes.push(`${clave}: ${items.join(', ')}`);
    } else if (typeof v === 'object') {
      partes.push(`${clave}: ${JSON.stringify(v)}`);
    } else {
      partes.push(`${clave}: ${String(v)}`);
    }
  }
  return partes.join(' · ');
}

// ---------- niveles ----------

// Nivel de una casilla o causa: el mayor entre sus afirmaciones; N0 si no tiene o ninguna existe.
export function nivelMaximo(ids: readonly string[], niveles: Record<string, NivelCalculado>): Nivel {
  let mayor: Nivel = 0;
  for (const id of ids) {
    const n = niveles[id]?.nivel ?? 0;
    if (n > mayor) mayor = n;
  }
  return mayor;
}

export const casillaVacia = (c: Casilla | undefined | null) => !c || c.texto.trim() === '';

// ---------- Ishikawa ----------

export const ESPINAS_DE: Record<Seleccion['espinas'], readonly Espina[]> = {
  seis_m: ESPINAS_6M,
  weisbord: CASILLAS_WEISBORD,
};

export interface CausaEnEspina {
  causa: Causa;
  evaluada: CausaEvaluada | undefined;
}

export interface GrupoEspina {
  espina: Espina;
  causas: CausaEnEspina[];
}

// Agrupa las causas por espina, en el orden de la espina; la principal va primero y luego por id.
// Las causas cuya espina no pertenece al tipo elegido quedan aparte en `otras`.
export function agruparPorEspina(
  causas: readonly Causa[],
  evaluadas: readonly CausaEvaluada[],
  tipo: Seleccion['espinas'],
): { grupos: GrupoEspina[]; otras: CausaEnEspina[] } {
  const porId = new Map(evaluadas.map((e) => [e.id, e]));
  const orden = (a: CausaEnEspina, b: CausaEnEspina) =>
    Number(b.evaluada?.principal ?? false) - Number(a.evaluada?.principal ?? false) || compararIds(a.causa.id, b.causa.id);
  const espinas = ESPINAS_DE[tipo];
  const grupos: GrupoEspina[] = espinas.map((espina) => ({ espina, causas: [] }));
  const otras: CausaEnEspina[] = [];
  for (const causa of causas) {
    const item = { causa, evaluada: porId.get(causa.id) };
    const grupo = grupos.find((g) => g.espina === causa.espina);
    (grupo ? grupo.causas : otras).push(item);
  }
  for (const g of grupos) g.causas.sort(orden);
  otras.sort(orden);
  return { grupos, otras };
}

// C2 antes que C10: compara el número cuando el id es letra + número.
export function compararIds(a: string, b: string): number {
  const na = Number.parseInt(a.replace(/^\D+/, ''), 10);
  const nb = Number.parseInt(b.replace(/^\D+/, ''), 10);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return a < b ? -1 : a > b ? 1 : 0;
}

// ---------- Es / No Es y prueba de causas ----------

export function ordenarFilas(filas: readonly FilaEsNoEs[]): FilaEsNoEs[] {
  return [...filas].sort((a, b) => DIMENSIONES.indexOf(a.dimension) - DIMENSIONES.indexOf(b.dimension) || compararIds(a.id, b.id));
}

// Qué secciones del método mostrar. Sin regla de selección aún, se muestra la del Es / No Es (vacía).
export function seccionesDelMetodo(
  seleccion: Seleccion | null,
  esNoEs: readonly FilaEsNoEs[] | null,
  weisbord: readonly HallazgoWeisbord[] | null,
): { esNoEs: boolean; weisbord: boolean } {
  const elegida = (h: 'es_no_es' | 'weisbord') => seleccion?.herramientas.some((x) => x.herramienta === h && x.elegida) ?? false;
  const mostrarWeisbord = weisbord !== null || elegida('weisbord');
  const mostrarEsNoEs = esNoEs !== null || elegida('es_no_es') || !mostrarWeisbord;
  return { esNoEs: mostrarEsNoEs, weisbord: mostrarWeisbord };
}

export interface ColumnaPrueba {
  id: string;
  etiqueta: string;
}

// Columnas de la matriz: las filas del Es / No Es y los hallazgos de Weisbord que tienen brecha
// o que algún juicio ya cita.
export function columnasDePrueba(
  esNoEs: readonly FilaEsNoEs[] | null,
  weisbord: readonly HallazgoWeisbord[] | null,
  juicios: readonly Juicio[],
  nombreDimension: (d: FilaEsNoEs['dimension']) => string,
  nombreCasilla: (c: HallazgoWeisbord['casilla']) => string,
): ColumnaPrueba[] {
  const citadas = new Set(juicios.map((j) => j.fila));
  const salida: ColumnaPrueba[] = [];
  for (const f of ordenarFilas(esNoEs ?? [])) salida.push({ id: f.id, etiqueta: `${nombreDimension(f.dimension)}: ${f.pregunta}` });
  for (const h of weisbord ?? []) {
    if (h.estado === 'brecha' || citadas.has(h.id)) salida.push({ id: h.id, etiqueta: nombreCasilla(h.casilla) });
  }
  return salida;
}

export const juicioDe = (juicios: readonly Juicio[], causa: string, fila: string) =>
  juicios.find((j) => j.causa === causa && j.fila === fila);

// ---------- presupuesto ----------

// Proporción usada entre 0 y 1; un máximo de cero cuenta como lleno solo si ya se usó algo.
export function proporcion(usado: number, max: number): number {
  if (!(max > 0)) return usado > 0 ? 1 : 0;
  return Math.min(1, Math.max(0, usado / max));
}
