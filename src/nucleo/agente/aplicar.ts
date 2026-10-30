// Aplica al estado lo que devuelve cada herramienta, revisando la evidencia en código:
// ninguna casilla se llena sin afirmaciones verificadas, ningún juicio de la prueba de causas
// cuenta sin evidencia y ninguna causa entra sin mostrar que el hecho ocurrió.
import type { Afirmacion } from '../tipos';
import type {
  Ambito,
  Casilla,
  CasillaWeisbord,
  Causa,
  Desviacion,
  Dimension,
  Espina,
  EstadoAgente,
  FilaEsNoEs,
  HallazgoWeisbord,
  Juicio,
  MotivoEvidencia,
  Veredicto,
} from './tipos';

// Formas de salida del modelo (snake_case, como en el esquema).
export interface CasillaModelo {
  texto: string;
  evidencia: string[];
}
export interface DesviacionModelo {
  esperado: CasillaModelo;
  ocurre: CasillaModelo;
  desde_cuando: CasillaModelo;
  cuanto: CasillaModelo;
  contraste: CasillaModelo;
  ambito: Ambito;
}
export interface FilaModelo {
  dimension: Dimension;
  pregunta: string;
  es: CasillaModelo;
  no_es: CasillaModelo;
  distincion: CasillaModelo;
  cambio: CasillaModelo;
}
export interface HallazgoModelo {
  casilla: CasillaWeisbord;
  estado: HallazgoWeisbord['estado'];
  hallazgo: CasillaModelo;
}
export interface CausaModelo {
  enunciado: string;
  espina: Espina;
  origen: string[];
  evidencia: string[];
}
export interface JuicioModelo {
  causa: string;
  fila: string;
  veredicto: Veredicto;
  razon: string;
  evidencia: string[];
}
export interface RelacionModelo {
  a: string;
  b: string;
  tipo: 'corrobora' | 'contradice';
}

export interface RechazoEvidencia {
  motivo: MotivoEvidencia;
  detalle: string;
}

export const MAX_FILAS = 8;
export const MAX_CAUSAS = 7;

// Revisa punteros contra las afirmaciones del caso. Junta los rechazos en `rechazos`.
class Revisor {
  readonly rechazos: RechazoEvidencia[] = [];
  private readonly ids: Set<string>;
  constructor(afirmaciones: readonly Afirmacion[]) {
    this.ids = new Set(afirmaciones.map((a) => a.id));
  }
  rechazar(motivo: MotivoEvidencia, detalle: string) {
    this.rechazos.push({ motivo, detalle });
  }
  evidencia(ids: string[], donde: string): string[] {
    const validas = [...new Set(ids)].filter((id) => this.ids.has(id));
    const ajenas = ids.filter((id) => !this.ids.has(id));
    if (ajenas.length) this.rechazar('evidencia_ajena', `${donde}: ${[...new Set(ajenas)].join(', ')} no es una afirmación verificada del caso`);
    return validas;
  }
  // Casilla con texto y sin evidencia válida: se vacía y queda el rechazo.
  casilla(c: CasillaModelo, donde: string): Casilla {
    const texto = c.texto.trim();
    if (!texto) return { texto: '', evidencia: [] };
    const evidencia = this.evidencia(c.evidencia, donde);
    if (evidencia.length === 0) {
      this.rechazar('casilla_sin_evidencia', `${donde}: "${recortar(texto)}" no señala ninguna afirmación; la casilla queda vacía`);
      return { texto: '', evidencia: [] };
    }
    return { texto, evidencia };
  }
}

export const recortar = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function aplicarDesviacion(e: EstadoAgente, m: DesviacionModelo): { desviacion: Desviacion; rechazos: RechazoEvidencia[] } {
  const r = new Revisor(e.afirmaciones);
  const desviacion: Desviacion = {
    esperado: r.casilla(m.esperado, 'Qué se esperaba'),
    ocurre: r.casilla(m.ocurre, 'Qué ocurre'),
    desdeCuando: r.casilla(m.desde_cuando, 'Desde cuándo'),
    cuanto: r.casilla(m.cuanto, 'Cuánto'),
    contraste: r.casilla(m.contraste, 'Contraste'),
    ambito: m.ambito,
  };
  return { desviacion, rechazos: r.rechazos };
}

export function aplicarEsNoEs(e: EstadoAgente, filas: FilaModelo[]): { esNoEs: FilaEsNoEs[]; rechazos: RechazoEvidencia[] } {
  const r = new Revisor(e.afirmaciones);
  const salida: FilaEsNoEs[] = [];
  for (const f of filas.slice(0, MAX_FILAS)) {
    const donde = (col: string) => `Es/No Es, ${f.pregunta.trim() || f.dimension}, ${col}`;
    const fila = {
      dimension: f.dimension,
      pregunta: f.pregunta.trim(),
      es: r.casilla(f.es, donde('es')),
      noEs: r.casilla(f.no_es, donde('no es')),
      distincion: r.casilla(f.distincion, donde('distinción')),
      cambio: r.casilla(f.cambio, donde('cambio')),
    };
    // Una fila sin lo que es no especifica nada.
    if (fila.es.texto) salida.push({ id: `R${salida.length + 1}`, ...fila });
  }
  return { esNoEs: salida, rechazos: r.rechazos };
}

export function aplicarWeisbord(e: EstadoAgente, hallazgos: HallazgoModelo[]): { weisbord: HallazgoWeisbord[]; rechazos: RechazoEvidencia[] } {
  const r = new Revisor(e.afirmaciones);
  const vistas = new Set<CasillaWeisbord>();
  const salida: HallazgoWeisbord[] = [];
  for (const h of hallazgos) {
    if (vistas.has(h.casilla)) continue;
    vistas.add(h.casilla);
    const hallazgo = r.casilla(h.hallazgo, `Weisbord, ${h.casilla}`);
    salida.push({ id: `W-${h.casilla}`, casilla: h.casilla, estado: hallazgo.texto ? h.estado : 'sin_datos', hallazgo });
  }
  return { weisbord: salida, rechazos: r.rechazos };
}

// Las causas nuevas reemplazan a las anteriores y con ellas su prueba, verificación e intervención.
export function aplicarCausas(e: EstadoAgente, causas: CausaModelo[], origenesValidos: readonly string[]): { causas: Causa[]; rechazos: RechazoEvidencia[] } {
  const r = new Revisor(e.afirmaciones);
  const salida: Causa[] = [];
  for (const c of causas) {
    if (salida.length >= MAX_CAUSAS) break;
    const enunciado = c.enunciado.trim();
    if (!enunciado) continue;
    const evidencia = r.evidencia(c.evidencia, `Causa "${recortar(enunciado, 60)}"`);
    if (evidencia.length === 0) {
      r.rechazar('causa_sin_evidencia', `"${recortar(enunciado)}" no muestra con ninguna afirmación que el hecho ocurrió`);
      continue;
    }
    salida.push({ id: `C${salida.length + 1}`, enunciado, espina: c.espina, origen: [...new Set(c.origen.filter((o) => origenesValidos.includes(o)))], evidencia });
  }
  return { causas: salida, rechazos: r.rechazos };
}

export function aplicarJuicios(e: EstadoAgente, juicios: JuicioModelo[], filas: readonly string[]): { juicios: Juicio[]; rechazos: RechazoEvidencia[] } {
  const r = new Revisor(e.afirmaciones);
  const causas = new Set(e.causas.map((c) => c.id));
  const vistos = new Set<string>();
  const salida: Juicio[] = [];
  for (const j of juicios) {
    const clave = `${j.causa}|${j.fila}`;
    if (!causas.has(j.causa) || !filas.includes(j.fila) || vistos.has(clave)) continue;
    vistos.add(clave);
    const evidencia = r.evidencia(j.evidencia, `Prueba de ${j.causa} en ${j.fila}`);
    let veredicto = j.veredicto;
    if (veredicto !== 'sin_datos' && evidencia.length === 0) {
      r.rechazar('juicio_sin_evidencia', `${j.causa} en ${j.fila}: dijo "${veredicto === 'explica' ? 'explica' : 'no explica'}" sin evidencia; cuenta como sin datos`);
      veredicto = 'sin_datos';
    }
    salida.push({ causa: j.causa, fila: j.fila, veredicto, razon: j.razon.trim(), evidencia });
  }
  return { juicios: salida, rechazos: r.rechazos };
}

// Corroboraciones y contradicciones entre fuentes. Solo cuentan pares de fuentes distintas
// en los que participa al menos una afirmación nueva.
export function aplicarRelaciones(afirmaciones: readonly Afirmacion[], relaciones: RelacionModelo[], nuevas: ReadonlySet<string>): { afirmaciones: Afirmacion[]; aplicadas: number; rechazos: RechazoEvidencia[] } {
  const r = new Revisor(afirmaciones);
  const porId = new Map(afirmaciones.map((a) => [a.id, { ...a, corrobora: [...a.corrobora], contradice: [...a.contradice] }]));
  let aplicadas = 0;
  for (const rel of relaciones) {
    const a = porId.get(rel.a);
    const b = porId.get(rel.b);
    if (!a || !b) {
      r.rechazar('evidencia_ajena', `${rel.a} o ${rel.b} no es una afirmación verificada`);
      continue;
    }
    if (a.fuente === b.fuente) {
      r.rechazar('relacion_invalida', `${a.id} y ${b.id} son de la misma fuente: una persona no se corrobora a sí misma`);
      continue;
    }
    if (!nuevas.has(a.id) && !nuevas.has(b.id)) continue;
    const ya = a.corrobora.includes(b.id) || b.corrobora.includes(a.id) || a.contradice.includes(b.id) || b.contradice.includes(a.id);
    if (ya) continue;
    a[rel.tipo].push(b.id);
    aplicadas += 1;
  }
  return { afirmaciones: afirmaciones.map((x) => porId.get(x.id)!), aplicadas, rechazos: r.rechazos };
}
