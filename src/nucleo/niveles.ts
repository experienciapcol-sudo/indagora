// Niveles de evidencia, calculados por código (regla del producto, editable):
// N1 opinión, de oídas o generalización sin dato concreto; N2 testimonio específico de primera mano;
// N3 dos testimonios N2 de fuentes y roles distintos que se corroboran; N4 documentado.
// El modelo solo propone corroboraciones; el consultor las confirma con un clic. Con una sola
// fuente nada pasa de N2.
import type { Afirmacion, Nivel, NivelCalculado } from './tipos';

export const NOMBRE_NIVEL: Record<Nivel, string> = {
  0: 'sin explorar',
  1: 'opinión',
  2: 'testimonio específico',
  3: 'corroborado entre roles',
  4: 'documentado',
};

export const clavePar = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

const normalRol = (r: string) => r.trim().toLowerCase().replace(/\s+/g, ' ');

export function nivelBase(a: Afirmacion): { nivel: Nivel; razones: string[] } {
  if (a.tipoFuente === 'documento') {
    return a.tipo === 'testimonio_especifico' && a.especificidad.length > 0
      ? { nivel: 4, razones: [`registro documental con dato concreto (${a.especificidad.join(', ')})`] }
      : { nivel: 1, razones: ['documento sin un dato concreto'] };
  }
  const oidas = a.alertas.find((x) => x.tipo === 'de_oidas');
  if (!a.primeraMano || oidas) {
    return { nivel: 1, razones: [oidas ? `de oídas ("${oidas.marcador}"): lo sabe por otros` : 'de oídas: no lo vivió de primera mano'] };
  }
  if (a.tipo === 'opinion') return { nivel: 1, razones: ['opinión: juicio general sin hechos narrados'] };
  // "todos" y "todas" aparecen en testimonios concretos ("todos los closets esperan el herraje"): no bajan el nivel.
  const generaliza = a.alertas.find((x) => x.tipo === 'generalizacion' && !/^tod[oa]s$/i.test(x.marcador));
  if (generaliza && a.especificidad.length === 0) {
    return { nivel: 1, razones: [`generaliza ("${generaliza.marcador}") sin un dato concreto (cuándo, cuánto)`] };
  }
  const razones = [a.especificidad.length ? `testimonio de primera mano con dato concreto (${a.especificidad.join(', ')})` : 'testimonio de primera mano de un hecho concreto'];
  if (a.modalidad === 'notas') razones.push('notas del consultor, no literales: máximo N2');
  return { nivel: 2, razones };
}

export function calcularNiveles(afirmaciones: readonly Afirmacion[], confirmadas: ReadonlySet<string>): Map<string, NivelCalculado> {
  const porId = new Map(afirmaciones.map((a) => [a.id, a]));
  const base = new Map(afirmaciones.map((a) => [a.id, nivelBase(a)]));
  const res = new Map<string, NivelCalculado>(
    afirmaciones.map((a) => {
      const b = base.get(a.id)!;
      return [a.id, { nivel: b.nivel, razones: [...b.razones], pendientes: [], contradicha: false }];
    }),
  );

  for (const [clave, [a, b]] of pares(afirmaciones, porId, 'corrobora')) {
    const na = base.get(a.id)!.nivel;
    const nb = base.get(b.id)!.nivel;
    // Sube solo el testimonio N2 de entrevista; a qué nivel, según la otra fuente.
    const destino = (x: Afirmacion, nx: Nivel, y: Afirmacion, ny: Nivel): Nivel | null => {
      if (x.tipoFuente !== 'entrevista' || nx !== 2) return null;
      if (y.tipoFuente === 'documento') return ny === 4 ? 4 : null;
      return ny === 2 && x.fuente !== y.fuente && normalRol(x.rol) !== normalRol(y.rol) ? 3 : null;
    };
    const subeA = destino(a, na, b, nb);
    const subeB = destino(b, nb, a, na);
    if (subeA === null && subeB === null) continue;
    const confirmada = confirmadas.has(clave);
    for (const [x, y, sube] of [[a, b, subeA], [b, a, subeB]] as const) {
      const r = res.get(x.id)!;
      if (!confirmada) {
        r.pendientes.push(clave);
      } else if (sube !== null && sube > r.nivel) {
        r.nivel = sube;
        r.razones.push(sube === 4 ? `documentado por ${y.id} (confirmado por el consultor)` : `corroborado por ${y.id}, de otro rol (confirmado por el consultor)`);
      }
    }
  }

  for (const [, [a, b]] of pares(afirmaciones, porId, 'contradice')) {
    for (const [x, y] of [[a, b], [b, a]] as const) {
      const r = res.get(x.id)!;
      r.contradicha = true;
      r.razones.push(`contradicha por ${y.id}`);
    }
  }

  for (const r of res.values()) {
    const n = r.pendientes.length;
    if (n === 1) r.razones.push('1 corroboración propuesta espera la confirmación del consultor');
    if (n > 1) r.razones.push(`${n} corroboraciones propuestas esperan la confirmación del consultor`);
  }
  return res;
}

// Pares únicos (sin importar quién señaló a quién) entre afirmaciones que existen.
function pares(afirmaciones: readonly Afirmacion[], porId: Map<string, Afirmacion>, campo: 'corrobora' | 'contradice'): Map<string, [Afirmacion, Afirmacion]> {
  const salida = new Map<string, [Afirmacion, Afirmacion]>();
  for (const a of afirmaciones) {
    for (const id of a[campo]) {
      const b = porId.get(id);
      if (!b || b.id === a.id) continue;
      const clave = clavePar(a.id, b.id);
      if (!salida.has(clave)) salida.set(clave, a.id < b.id ? [a, b] : [b, a]);
    }
  }
  return salida;
}
