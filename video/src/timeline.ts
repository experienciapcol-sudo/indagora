// Línea de tiempo del video: 9 bloques de narración, cada uno con un "pad" de aire antes de que hable
// y la última escena con la cola que completa exactamente 180 s (5400 cuadros a 30 fps).
import bloques from './bloques.json';
import caps from './subtitulos.json';

export const FPS = 30;
export const TOTAL_FRAMES = 5400;

export type Caption = { text: string; startMs: number; endMs: number; timestampMs: number | null; confidence: number | null; pageBreakAfter?: boolean };
export const CAPTIONS = caps as Caption[];

// La narración es UNA pista continua (public/narracion-final.mp3, armada con scripts/montar-audio.mjs):
// entre bloques lleva un respiro de ~2 s. Cada escena cambia 0.4 s después de que termina el bloque anterior,
// así que la imagen nueva llega ~1.7 s antes de la voz.
const CAMBIO_S = 0.3;
export const SCENES = bloques.map((b, i) => {
  const from = i === 0 ? 0 : Math.round(((bloques[i - 1].finMs / 1000) + CAMBIO_S) * FPS);
  const end = i === bloques.length - 1 ? TOTAL_FRAMES : Math.round(((b.finMs / 1000) + CAMBIO_S) * FPS);
  return { id: i + 1, from, dur: end - from };
});

// Segundo de la narración → cuadro global.
export function narrFrame(tS: number): number {
  return Math.round(tS * FPS);
}

// Cuadro global en que se dice una frase (la primera palabra); null si no aparece.
export function fraseFrame(frase: string): number {
  const palabras = frase.toLowerCase().split(/\s+/);
  const t = CAPTIONS.map((c) => c.text.toLowerCase().replace(/[^a-z0-9']/g, ''));
  const limpia = palabras.map((p) => p.replace(/[^a-z0-9']/g, ''));
  for (let i = 0; i + limpia.length <= t.length; i++) {
    if (limpia.every((p, k) => (k === limpia.length - 1 ? t[i + k].startsWith(p) : t[i + k] === p))) return narrFrame(CAPTIONS[i].startMs / 1000);
  }
  throw new Error(`Frase no encontrada en la narración: ${frase}`);
}

// Páginas de subtítulos: máximo 11 palabras y cortes en puntuación.
export type Pagina = { inicio: number; fin: number; palabras: { t: string; desde: number; hasta: number }[] };
export const PAGINAS: Pagina[] = (() => {
  const out: Pagina[] = [];
  let cur: Pagina | null = null;
  CAPTIONS.forEach((c) => {
    const f0 = narrFrame(c.startMs / 1000);
    const f1 = Math.max(f0 + 3, narrFrame(c.endMs / 1000));
    if (!cur) cur = { inicio: f0, fin: f1, palabras: [] };
    cur.palabras.push({ t: c.text.trim(), desde: f0, hasta: f1 });
    cur.fin = f1;
    const corte = c.pageBreakAfter || (cur.palabras.length >= 7 && /[,;:]$/.test(c.text)) || cur.palabras.length >= 11;
    if (corte) { out.push(cur); cur = null; }
  });
  if (cur) out.push(cur);
  return out;
})();
