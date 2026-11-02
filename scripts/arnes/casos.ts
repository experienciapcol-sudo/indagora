/// <reference types="vite/client" />
// Carga de casos: el taller es el caso 0; el resto vive en
// src/nucleo/casos/evaluacion/*.ts (los escribe otra familia de modelos).
import { CASO_TALLER } from '../../src/nucleo/casos/taller';
import { VERDAD_TALLER } from '../../src/nucleo/casos/taller.verdad';
import { normal } from '../../src/nucleo/verificar';
import type { CasoEvaluacion } from './tipos';

export const CASO_TALLER_EVALUACION: CasoEvaluacion = {
  id: CASO_TALLER.id,
  titulo: CASO_TALLER.titulo,
  objetivo: CASO_TALLER.objetivo,
  fuentes: CASO_TALLER.fuentes,
  verdad: VERDAD_TALLER,
  patrones: {
    causa: /herraje|proveedor|Brev[aá]nez/i,
    distractores: /flojo|personal|ganas|sierra|nuevo|lijado|horas extra|supervis/i,
  },
};

const esCaso = (v: unknown): v is CasoEvaluacion =>
  typeof v === 'object' && v !== null && 'fuentes' in v && 'verdad' in v && 'patrones' in v && 'objetivo' in v;

// Valida el contrato de un caso nuevo; devuelve la lista de problemas (vacía si está bien).
export function validarCaso(c: CasoEvaluacion): string[] {
  const errores: string[] = [];
  const ids = new Set<string>();
  for (const f of c.fuentes) {
    if (ids.has(f.id)) errores.push(`Fuente duplicada: ${f.id}`);
    ids.add(f.id);
    if (!f.texto.trim()) errores.push(`Fuente sin texto: ${f.id}`);
  }
  const contar = (fuenteId: string, fragmento: string) => {
    const fuente = c.fuentes.find((f) => f.id === fuenteId);
    if (!fuente) return -1;
    const texto = normal(fuente.texto);
    const buscado = normal(fragmento);
    return buscado ? texto.split(buscado).length - 1 : 0;
  };
  for (const o of [...c.verdad.oracionesClave, ...c.verdad.distractores]) {
    const n = contar(o.fuente, o.fragmento);
    if (n !== 1) errores.push(`El fragmento "${o.fragmento}" aparece ${n} veces en ${o.fuente} (debe aparecer exactamente 1)`);
  }
  for (const corr of c.verdad.corroboraciones) {
    for (const ref of [corr.a, corr.b]) {
      if (contar(ref.fuente, ref.fragmento) !== 1) errores.push(`Fragmento de corroboración inválido en ${ref.fuente}: "${ref.fragmento}"`);
    }
  }
  if (!c.verdad.causa.trim()) errores.push('La verdad no enuncia la causa');
  return errores;
}

export function cargarCasos(): CasoEvaluacion[] {
  // Vite reemplaza import.meta.glob al transformar el archivo: va completo, sin alias.
  const modulos: Record<string, unknown> = import.meta.glob('../../src/nucleo/casos/evaluacion/*.ts', { eager: true });
  const casos: CasoEvaluacion[] = [CASO_TALLER_EVALUACION];
  for (const modulo of Object.values(modulos)) {
    for (const valor of Object.values(modulo as Record<string, unknown>)) {
      if (esCaso(valor) && !casos.some((c) => c.id === valor.id)) casos.push(valor);
    }
  }
  for (const c of casos) {
    const errores = validarCaso(c);
    if (errores.length) throw new Error(`Caso de evaluación inválido (${c.id}): ${errores.join('; ')}`);
  }
  return casos;
}
