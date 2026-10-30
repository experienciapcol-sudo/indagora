// Léxico fijo en código, en español e inglés: alertas sobre cómo está dicha una afirmación y
// datos concretos que la vuelven específica. Las alertas son señales sobre la afirmación,
// nunca sobre la persona.
import type { Alerta, TipoAlerta } from './tipos';

// Patrones sobre el texto en minúsculas y sin acentos.
const ALERTAS: Record<TipoAlerta, string[]> = {
  generalizacion: [
    'siempre', 'nunca', 'jamas', 'todos', 'todas', 'todo el mundo', 'nadie', 'ninguno', 'ninguna', 'cada vez', 'todo el tiempo', 'a cada rato',
    'always', 'never', 'everyone', 'everybody', 'nobody', 'no one', 'all the time', 'every time',
  ],
  de_oidas: [
    'dicen que', 'me dijeron', 'me contaron', 'he oido', 'oi que', 'se dice que', 'se rumora', 'supuestamente', 'cuentan que', 'segun dicen',
    'they say', 'people say', 'i heard', "i've heard", 'i was told', 'supposedly', 'rumor has it', 'apparently',
  ],
  recencia: [
    'ultimamente', 'la semana pasada', 'ayer', 'anteayer', 'esta semana', 'hace unos dias', 'el otro dia', 'recientemente',
    'lately', 'recently', 'last week', 'yesterday', 'this week', 'the other day',
  ],
  atribucion_externa: [
    'es culpa de', 'la culpa es de', 'por culpa de', 'culpa de',
    'los de (?:ventas|compras|produccion|almacen|oficina|taller|diseno|calidad|arriba|abajo)', 'el otro turno', 'no es mi area', 'no depende de mi',
    "it's their fault", 'their fault', 'the other shift', 'not my department', 'those guys in',
  ],
};

const TIEMPO_RELATIVO = ['ayer', 'anteayer', 'la semana pasada', 'la ultima semana', 'esta semana', 'el mes pasado', 'el ultimo mes', 'el ano pasado', 'yesterday', 'last week', 'last month', 'last year'];
const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_ES = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
// "once" cuenta como once (11) aunque en inglés signifique "una vez": el español es la lengua principal.
const NUMEROS = [
  'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'cien', 'ciento', 'mil',
  'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'fifteen', 'twenty', 'thirty', 'forty', 'fifty', 'hundred', 'thousand',
];
// En inglés los meses y días van con mayúscula; así "may" (verbo) no cuenta.
const MESES_DIAS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

const B = '(?<![\\p{L}\\p{N}])';
const F = '(?![\\p{L}\\p{N}])';
const alternativa = (patrones: string[]) => new RegExp(`${B}(?:${patrones.join('|')})${F}`, 'gu');

const REGEX_ALERTAS = Object.entries(ALERTAS).map(([tipo, p]) => [tipo as TipoAlerta, alternativa(p)] as const);
const REGEX_ESPECIFICO = alternativa(['\\d+(?:[.,]\\d+)?\\s?%', '\\d+(?:[.,]\\d+)?', ...TIEMPO_RELATIVO, ...MESES_ES, ...DIAS_ES, ...NUMEROS]);
const REGEX_EN = alternativa(MESES_DIAS_EN);

// Minúsculas y sin acentos, carácter por carácter: los índices siguen valiendo en el original.
function plano(texto: string): string {
  return Array.from(texto, (c) => {
    if (c === '’') return "'";
    const p =c.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    return p.length === c.length ? p : c;
  }).join('');
}

interface Hallazgo {
  indice: number;
  texto: string;
}

function buscar(re: RegExp, donde: string, original: string): Hallazgo[] {
  return Array.from(donde.matchAll(re), (m) => ({ indice: m.index, texto: original.slice(m.index, m.index + m[0].length) }));
}

export function detectarAlertas(texto: string): Alerta[] {
  const p = plano(texto);
  const todas = REGEX_ALERTAS.flatMap(([tipo, re]) => buscar(re, p, texto).map((h) => ({ ...h, tipo })));
  // "es culpa de" y "culpa de" encuentran lo mismo: gana la coincidencia más larga.
  const sinTraslape = todas
    .sort((a, b) => a.indice - b.indice || b.texto.length - a.texto.length)
    .filter((h, i, arr) => !arr.slice(0, i).some((o) => h.indice < o.indice + o.texto.length));
  const vistos = new Set<string>();
  const alertas: Alerta[] = [];
  for (const h of sinTraslape) {
    const clave = `${h.tipo}:${plano(h.texto)}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    alertas.push({ tipo: h.tipo, marcador: h.texto });
  }
  return alertas;
}

// Cifras, porcentajes, meses, días y referencias de tiempo concretas, en orden de aparición.
export function datosEspecificos(texto: string): string[] {
  const hallazgos = [...buscar(REGEX_ESPECIFICO, plano(texto), texto), ...buscar(REGEX_EN, texto, texto)];
  return hallazgos.sort((a, b) => a.indice - b.indice).map((h) => h.texto);
}
