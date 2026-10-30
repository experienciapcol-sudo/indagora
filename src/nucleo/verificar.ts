// Verificador: revisa en código cada movimiento del analista. El modelo solo señala ids de
// oraciones con un ancla literal; aquí se comprueba que la oración existe, que no es una
// pregunta del entrevistador, que el ancla está en ella y que todo es de un mismo hablante.
// La cita la reconstruye el código; lo que no pasa queda como rechazo con su motivo.
import { datosEspecificos, detectarAlertas } from './lexico';
import type { Afirmacion, FuenteEntrada, Oracion, Previa, Rasgo, Rechazo, TipoAfirmacion } from './tipos';

// Lo que devuelve el analista (src/worker/analista), ya con la forma del esquema.
export interface PunteroModelo {
  id: string;
  ancla: string; // palabras literales de esa oración
}

export interface AfirmacionModelo {
  oraciones: PunteroModelo[];
  resumen: string;
  tema: string;
  tipo: TipoAfirmacion;
  primera_mano: boolean;
  rasgos: Rasgo[];
  corrobora: string[];
  contradice: string[];
}

const MIN_PALABRAS_ANCLA = 3;

export function verificar(
  fuente: FuenteEntrada,
  oraciones: Oracion[],
  salida: AfirmacionModelo[],
  previas: Previa[],
): { afirmaciones: Afirmacion[]; rechazos: Rechazo[] } {
  const indice = new Map(oraciones.map((o, i) => [o.id, i]));
  const ajenas = new Set(previas.filter((p) => p.fuente !== fuente.id).map((p) => p.id));
  const afirmaciones: Afirmacion[] = [];
  const rechazos: Rechazo[] = [];

  salida.forEach((m, n) => {
    const rechazar = (motivo: Rechazo['motivo'], detalle: string) => rechazos.push({ afirmacion: n, motivo, detalle });

    const validas = new Set<number>();
    for (const p of m.oraciones) {
      const i = indice.get(p.id);
      if (i === undefined) {
        rechazar('id_inexistente', `${p.id} no existe en ${fuente.id}`);
      } else if (oraciones[i].esEntrevistador) {
        rechazar('oracion_del_entrevistador', `${p.id} es una pregunta del entrevistador`);
      } else if (!anclaCoincide(p.ancla, oraciones[i].texto)) {
        rechazar('ancla_no_coincide', `"${p.ancla}" no está en ${p.id}`);
      } else {
        validas.add(i);
      }
    }
    if (validas.size === 0) return rechazar('sin_oraciones_validas', 'Ninguna oración señalada pasó la revisión');

    const propias = [...validas].sort((a, b) => a - b).map((i) => oraciones[i]);
    const hablantes = new Set(propias.map((o) => o.hablante));
    if (hablantes.size > 1) return rechazar('hablantes_distintos', `Mezcla a ${[...hablantes].join(' y ')}`);

    const cita = reconstruir(propias, indice);
    const sinOrigen = cifras(m.resumen).filter((c) => !cifras(cita).includes(c));
    if (sinOrigen.length > 0) return rechazar('cifra_sin_origen', `La paráfrasis dice ${sinOrigen.join(', ')} y la cita no`);

    const referencias = (ids: string[]) =>
      [...new Set(ids)].filter((id) => {
        if (ajenas.has(id)) return true;
        rechazar('referencia_invalida', `${id} no es una afirmación previa de otra fuente`);
        return false;
      });

    afirmaciones.push({
      id: `${fuente.id}-A${String(afirmaciones.length + 1).padStart(2, '0')}`,
      fuente: fuente.id,
      tipoFuente: fuente.tipo,
      rol: fuente.rol,
      modalidad: fuente.modalidad,
      hablante: propias[0].hablante,
      turnos: [...new Set(propias.map((o) => o.turno))],
      oraciones: propias.map((o) => o.id),
      cita,
      resumen: m.resumen.trim(),
      tema: m.tema.trim(),
      tipo: m.tipo,
      primeraMano: m.primera_mano,
      rasgos: [...new Set(m.rasgos)],
      alertas: detectarAlertas(cita),
      especificidad: datosEspecificos(cita),
      corrobora: referencias(m.corrobora),
      contradice: referencias(m.contradice),
    });
  });

  return { afirmaciones, rechazos };
}

// Minúsculas, sin acentos ni puntuación, con espacios simples.
const normal = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

// El ancla debe estar completa en la oración y tener al menos tres palabras, o ser la oración entera.
function anclaCoincide(ancla: string, oracion: string): boolean {
  const a = normal(ancla);
  const o = normal(oracion);
  if (!a || !` ${o} `.includes(` ${a} `)) return false;
  return a.split(' ').length >= MIN_PALABRAS_ANCLA || a === o;
}

function reconstruir(propias: Oracion[], indice: Map<string, number>): string {
  return propias
    .map((o, k) => (k > 0 && indice.get(o.id)! - indice.get(propias[k - 1].id)! > 1 ? `[…] ${o.texto}` : o.texto))
    .join(' ');
}

// Coma o punto decimal da igual: 9,4 y 9.4 son la misma cifra.
const cifras = (s: string): string[] => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((c) => c.replace(',', '.'));
