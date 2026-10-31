// Comparación determinista entre la causa oculta y la causa principal del agente.
import type { ResultadoComparacion, VerdadLaboratorio } from './tipos';
import { contieneTermino, normalizarTexto } from './normalizar';

function palabrasClave(texto: string): string[] {
  const stop = new Set(['porque', 'cuando', 'desde', 'hasta', 'sobre', 'entre', 'tiene', 'tienen', 'haber', 'fueron', 'estas', 'estos', 'aquella', 'problema', 'empresa', 'causa']);
  return [...new Set(normalizarTexto(texto).split(/[^a-z0-9]+/).filter((w) => w.length >= 5 && !stop.has(w)))];
}

export function comparar(
  v: VerdadLaboratorio,
  causaPrincipalAgente: string | null,
  textosEvidencia: string[] = [],
): ResultadoComparacion {
  const causa = causaPrincipalAgente ?? '';
  const normCausa = normalizarTexto(causa);
  const normEvidencia = normalizarTexto(textosEvidencia.join(' '));
  const marcadoresEnCausa = v.causa.marcadores.filter((m) => contieneTermino(normCausa, m));
  const marcadoresEnEvidencia = v.causa.marcadores.filter(
    (m) => !marcadoresEnCausa.includes(m) && contieneTermino(normEvidencia, m),
  );

  let distractorPrincipal: string | null = null;
  let mejor = 0;
  for (const d of v.distractores) {
    if (normCausa.includes(normalizarTexto(d.enunciado))) { distractorPrincipal = d.id; mejor = 99; break; }
    const claves = palabrasClave(d.enunciado);
    const aciertos = claves.filter((w) => normCausa.includes(w)).length;
    if (claves.length && aciertos >= 3 && aciertos / claves.length >= 0.5 && aciertos > mejor) {
      mejor = aciertos;
      distractorPrincipal = d.id;
    }
  }

  const detalle: string[] = [];
  let veredicto: ResultadoComparacion['veredicto'];
  if (!causa.trim()) {
    veredicto = 'no_encontrada';
    detalle.push('El agente no enunció una causa principal.');
  } else if (distractorPrincipal && marcadoresEnCausa.length < 2) {
    veredicto = 'no_encontrada';
    detalle.push('La causa principal del agente coincide con un distractor.');
  } else if (marcadoresEnCausa.length >= 2) {
    veredicto = 'encontrada';
    detalle.push(`La causa del agente contiene ${marcadoresEnCausa.length} marcadores de la causa oculta.`);
  } else if (marcadoresEnCausa.length === 1 || marcadoresEnEvidencia.length >= 2) {
    veredicto = 'parcial';
    detalle.push('Parte de la causa aparece en la conclusión o en la evidencia, pero no completa.');
  } else {
    veredicto = 'no_encontrada';
    detalle.push('La causa del agente no contiene marcadores de la causa oculta.');
  }
  if (marcadoresEnEvidencia.length) detalle.push(`${marcadoresEnEvidencia.length} marcador(es) aparecen solo en la evidencia reunida.`);

  return { veredicto, causaPrincipalAgente, marcadoresEnCausa, marcadoresEnEvidencia, distractorPrincipal, detalle };
}
