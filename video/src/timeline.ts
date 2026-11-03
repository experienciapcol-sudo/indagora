// Línea de tiempo del video: 9 bloques de narración, cada uno con un "pad" de aire antes de que hable
// y la última escena con la cola que completa exactamente 180 s (5400 cuadros a 30 fps).
import bloques from './bloques.json';
import caps from './subtitulos.json';

export const FPS = 30;
export const TOTAL_FRAMES = 5400;

// Segundos de silencio antes de cada bloque (dan tiempo a ver la pantalla antes de la voz).
const PAD = [0.3, 0.5, 0.5, 2.5, 2.5, 1.5, 2.0, 2.0, 1.5];

export type Caption = { text: string; startMs: number; endMs: number; timestampMs: number | null; confidence: number | null; pageBreakAfter?: boolean };
export const CAPTIONS = caps as Caption[];

const segStartS = bloques.map((b) => b.inicioMs / 1000);
const segEndS = bloques.map((b, i) => (i + 1 < bloques.length ? bloques[i + 1].inicioMs / 1000 : b.finMs / 1000));

// Inicio de cada escena en cuadros (redondeado acumulado) y duración.
const brutas = PAD.map((p, i) => p + (segEndS[i] - segStartS[i]));
const suma = brutas.reduce((a, b) => a + b, 0);
brutas[brutas.length - 1] += TOTAL_FRAMES / FPS - suma; // la cola va a la escena final

export const SCENES = (() => {
  let acc = 0;
  return brutas.map((d, i) => {
    const from = Math.round(acc * FPS);
    acc += d;
    const end = i === brutas.length - 1 ? TOTAL_FRAMES : Math.round(acc * FPS);
    return { id: i + 1, from, dur: end - from, padFrames: Math.round(PAD[i] * FPS), segFrom: Math.round(segStartS[i] * FPS), segDur: Math.round((segEndS[i] - segStartS[i]) * FPS) };
  });
})();

// Segundo de narración (del MP3) → cuadro global.
export function narrFrame(tS: number): number {
  const i = Math.max(0, segEndS.findIndex((e) => tS < e));
  const idx = tS >= segEndS[segEndS.length - 1] ? segEndS.length - 1 : i;
  const s = SCENES[idx];
  return Math.round(s.from + s.padFrames + (tS - segStartS[idx]) * FPS);
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
