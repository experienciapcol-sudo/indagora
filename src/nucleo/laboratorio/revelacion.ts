// Reglas de revelación por tipo de pregunta y detección de fugas en código.
import type { Hecho, TipoPregunta, VerdadLaboratorio } from './tipos';
import { PLANTILLAS, RESPUESTAS_RESPALDO } from './textos';
import { contieneTermino, normalizarTexto } from './normalizar';

export { PLANTILLAS };

const AUTORIZADAS: Record<TipoPregunta, string[]> = {
  abierta: ['siempre'],
  temporal: ['siempre', 'temporal'],
  contraste: ['siempre', 'contraste'],
  incidente: ['siempre', 'temporal', 'incidente'],
  cuantitativa: ['siempre', 'cuantitativa', 'incidente'],
  documental: [],
};

export function hechosAutorizados(v: VerdadLaboratorio, persona: string, tipo: TipoPregunta): Hecho[] {
  if (tipo === 'documental') return [];
  const permitidas = AUTORIZADAS[tipo];
  // Aislamiento por construcción: primero el dueño, después la revelación.
  return v.hechos.filter((h) => h.dueno === persona && permitidas.includes(h.revelacion));
}
export const hechosDelPrompt = hechosAutorizados;

// Un término suelto es ambiguo (puede ser síntoma público): en general hacen
// falta dos, o una frase exacta "=". La excepción es el marcador aislado de
// la causa: si el único término encontrado ES un marcador (o parte de uno),
// la respuesta revela la causa y fuga con un solo término. Sin el cuarto
// argumento se conserva el comportamiento general. Revisión léxica: no
// detecta paráfrasis sin esos términos.
function esMarcador(termino: string, marcadoresNorm: string[]): boolean {
  const t = normalizarTexto(termino.replace(/^=/, ''));
  return t.length > 0 && marcadoresNorm.some((m) => m === t || m.includes(t) || t.includes(m));
}

export function revisarRespuesta(
  texto: string,
  autorizados: Hecho[],
  todos: Hecho[],
  marcadoresCausa: string[] = [],
): { ok: true } | { ok: false; hechosFugados: string[] } {
  const norm = normalizarTexto(texto);
  const marcadoresNorm = marcadoresCausa.map((m) => normalizarTexto(m)).filter(Boolean);
  const idsAutorizados = new Set(autorizados.map((h) => h.id));
  const fugados: string[] = [];
  for (const h of todos) {
    if (idsAutorizados.has(h.id)) continue;
    let encontrados = 0;
    let fraseExacta = false;
    let marcadorAislado = false;
    for (const termino of h.terminos) {
      if (!contieneTermino(norm, termino)) continue;
      if (termino.startsWith('=')) fraseExacta = true;
      else encontrados++;
      if (esMarcador(termino, marcadoresNorm)) marcadorAislado = true;
    }
    if (fraseExacta || encontrados >= 2 || marcadorAislado) fugados.push(h.id);
  }
  return fugados.length ? { ok: false, hechosFugados: fugados } : { ok: true };
}

export function respuestaRespaldo(tipo: TipoPregunta): string {
  return RESPUESTAS_RESPALDO[tipo];
}

export function preguntaPara(tipo: TipoPregunta, sintoma: string): string {
  return PLANTILLAS[tipo].replace('{sintoma}', sintoma);
}
