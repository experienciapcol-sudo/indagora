// Parte una fuente en turnos y oraciones con identificador estable (E1-007). Las oraciones
// son la única unidad a la que el modelo puede apuntar. Funciona en español y en inglés.
import type { FuenteEntrada, Oracion, Turno } from './tipos';

export const MAX_PALABRAS_ORACION = 30;
const MIN_PALABRAS_CORTE = 8;

// Palabras que terminan en punto sin cerrar oración (en minúsculas, sin el punto final).
const ABREVIATURAS = new Set([
  'sr', 'sra', 'srta', 'sres', 'dr', 'dra', 'lic', 'ing', 'mtro', 'mtra', 'arq', 'prof', 'ud', 'uds',
  'núm', 'ej', 'aprox', 'av', 'col', 'tel', 'pág', 'art', 'depto', 'gral', 'cía',
  'mr', 'mrs', 'ms', 'jr', 'st', 'vs', 'e.g', 'i.e', 'inc', 'ltd', 'approx',
]);

const ENTREVISTADOR_COMUN = /^(consultor|consultora|entrevistador|entrevistadora|interviewer|consultant)\b/i;
const LINEA_CON_ETIQUETA = /^\s*([^:\n]{1,40}?)\s*:\s*(.*)$/;

export interface OpcionesSegmentar {
  // Solo para texto de transcripción automática, que repite palabras ("porque porque").
  limpiarRepeticiones?: boolean;
}

export function segmentar(fuente: FuenteEntrada, opciones: OpcionesSegmentar = {}): { turnos: Turno[]; oraciones: Oracion[] } {
  const turnos = leerTurnos(fuente);
  const oraciones: Oracion[] = [];
  for (const t of turnos) {
    for (const linea of t.lineas) {
      const texto = opciones.limpiarRepeticiones ? limpiarRepeticiones(linea) : linea;
      for (const o of partirOraciones(texto)) {
        oraciones.push({
          id: `${fuente.id}-${String(oraciones.length + 1).padStart(3, '0')}`,
          fuente: fuente.id,
          turno: t.numero,
          hablante: t.hablante,
          esEntrevistador: t.esEntrevistador,
          texto: o,
        });
      }
    }
  }
  return { turnos: turnos.map(({ lineas, ...t }) => ({ ...t, texto: lineas.join(' ') })), oraciones };
}

type TurnoCrudo = Omit<Turno, 'texto'> & { lineas: string[] };

function leerTurnos(fuente: FuenteEntrada): TurnoCrudo[] {
  const lineas = fuente.texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const etiquetas = fuente.tipo === 'entrevista' ? etiquetasValidas(lineas, fuente) : new Set<string>();
  const turnos: TurnoCrudo[] = [];
  for (const linea of lineas) {
    const m = LINEA_CON_ETIQUETA.exec(linea);
    const etiqueta = m && etiquetas.has(normal(m[1])) ? m[1].trim() : null;
    if (etiqueta !== null) {
      turnos.push({ numero: turnos.length + 1, hablante: etiqueta, esEntrevistador: esEntrevistador(etiqueta, fuente), lineas: m![2].trim() ? [m![2].trim()] : [] });
    } else if (turnos.length > 0) {
      turnos[turnos.length - 1].lineas.push(linea);
    } else {
      turnos.push({ numero: 1, hablante: fuente.rol, esEntrevistador: false, lineas: [linea] });
    }
  }
  return turnos.filter((t) => t.lineas.length > 0).map((t, i) => ({ ...t, numero: i + 1 }));
}

// Una etiqueta cuenta si es la del entrevistador, el rol de la fuente o aparece al menos dos
// veces. Así una frase con dos puntos que sale una vez no se confunde con un hablante.
function etiquetasValidas(lineas: string[], fuente: FuenteEntrada): Set<string> {
  const cuenta = new Map<string, number>();
  for (const l of lineas) {
    const m = LINEA_CON_ETIQUETA.exec(l);
    if (!m || !pareceEtiqueta(m[1])) continue;
    const e = normal(m[1]);
    cuenta.set(e, (cuenta.get(e) ?? 0) + 1);
  }
  const validas = new Set<string>();
  for (const [e, n] of cuenta) {
    if (n >= 2 || e === normal(fuente.rol) || (fuente.entrevistador && e === normal(fuente.entrevistador)) || ENTREVISTADOR_COMUN.test(e)) validas.add(e);
  }
  return validas;
}

function pareceEtiqueta(e: string): boolean {
  const t = e.trim();
  return t.split(/\s+/).length <= 4 && /^\p{L}/u.test(t) && !/[.?!¿¡…]/.test(t);
}

function esEntrevistador(etiqueta: string, fuente: FuenteEntrada): boolean {
  if (fuente.entrevistador?.trim() && normal(etiqueta) === normal(fuente.entrevistador)) return true;
  // Aunque se indique otra etiqueta, Consultor/a o Entrevistador/a siempre pregunta, salvo que sea el rol entrevistado.
  return ENTREVISTADOR_COMUN.test(etiqueta.trim()) && normal(etiqueta) !== normal(fuente.rol);
}

const normal = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

// Parte un texto en oraciones por su puntuación; lo que queda muy largo (transcripciones sin
// puntos) se corta en trozos de hasta MAX_PALABRAS_ORACION palabras.
export function partirOraciones(texto: string): string[] {
  const t = texto.replace(/\s+/g, ' ').trim();
  if (!t) return [];
  const partes: string[] = [];
  const fin = /[.!?…]+["”»)]?(?= )/g;
  let desde = 0;
  for (let m = fin.exec(t); m; m = fin.exec(t)) {
    const corte = m.index + m[0].length;
    const siguiente = t[corte + 1];
    if (!siguiente || !/[\p{Lu}\p{N}¿¡"“«(]/u.test(siguiente)) continue;
    if (m[0].startsWith('.') && !cierraOracion(t.slice(desde, m.index))) continue;
    partes.push(t.slice(desde, corte));
    desde = corte + 1;
  }
  partes.push(t.slice(desde));
  return partes.flatMap(partirLargas);
}

// ¿El punto después de este texto cierra la oración? No si sigue a una abreviatura o una inicial.
function cierraOracion(antes: string): boolean {
  const palabra = /(\S+)$/.exec(antes)?.[1] ?? '';
  if (/^\p{Lu}$/u.test(palabra)) return false;
  return !ABREVIATURAS.has(palabra.toLowerCase().replace(/^[("“«¿¡]+/, ''));
}

function partirLargas(oracion: string): string[] {
  let palabras = oracion.split(' ');
  const trozos: string[] = [];
  while (palabras.length > MAX_PALABRAS_ORACION) {
    let corte = MAX_PALABRAS_ORACION;
    for (let i = MAX_PALABRAS_ORACION - 1; i >= MIN_PALABRAS_CORTE - 1; i--) {
      if (/[,;:]$/.test(palabras[i])) {
        corte = i + 1;
        break;
      }
    }
    trozos.push(palabras.slice(0, corte).join(' '));
    palabras = palabras.slice(corte);
  }
  trozos.push(palabras.join(' '));
  return trozos;
}

// Quita repeticiones inmediatas de una a tres palabras ("ruta norte ruta norte"). No toca las
// que separa la puntuación ("no, no").
export function limpiarRepeticiones(texto: string): string {
  const repetida = /(?<![\p{L}\p{N}])([\p{L}\p{N}]+(?:[ \t]+[\p{L}\p{N}]+){0,2})[ \t]+\1(?![\p{L}\p{N}])/giu;
  let antes: string;
  let ahora = texto;
  do {
    antes = ahora;
    ahora = ahora.replace(repetida, '$1');
  } while (ahora !== antes);
  return ahora;
}
