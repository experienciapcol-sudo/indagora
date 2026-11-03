// Alinea el texto del guion (ortografía correcta) con los tiempos de whisper.
//   node scripts/alinear.mjs  → src/subtitulos.json (Caption[]) y src/bloques.json (inicio de cada bloque)
import { readFileSync, writeFileSync } from 'node:fs';

const tokens = JSON.parse(readFileSync('.tomas-tmp/whisper-tokens.json', 'utf8'));
// Piezas → palabras: una palabra nueva empieza con espacio.
const hab = [];
for (const t of tokens) {
  if (/^\s/.test(t.text) || hab.length === 0) hab.push({ t: t.text.trim(), s: t.startMs, e: t.endMs });
  else { const u = hab.at(-1); u.t += t.text; u.e = t.endMs; }
}
const w = hab.filter((x) => /[a-z0-9]/i.test(x.t));
const norm = (x) => x.toLowerCase().replace(/[^a-z0-9]/g, '');

// Inicio y fin reales de cada bloque: los respiros entre bloques son los silencios largos de la pista final.
const wav = readFileSync('.tomas-tmp/narracion-16k.wav');
let off = 12, pcm = null;
while (off + 8 <= wav.length) { const id = wav.toString('ascii', off, off + 4), n = wav.readUInt32LE(off + 4); if (id === 'data') { pcm = new Int16Array(wav.buffer.slice(wav.byteOffset + off + 8, wav.byteOffset + off + 8 + n)); break; } off += 8 + n + (n % 2); }
const V = 160, nV = Math.floor(pcm.length / V), calla = [];
for (let f = 0; f < nV; f++) { let e = 0; for (let i = f * V; i < (f + 1) * V; i++) e += pcm[i] * pcm[i]; calla.push(Math.sqrt(e / V) < 413); }
const largos = []; for (let f = 0; f < nV; ) { let g = f; while (g < nV && calla[g] === calla[f]) g++; if (calla[f] && g - f >= 75 && f > 0) largos.push([f * 10, g * 10]); f = g; }
const primero = calla.findIndex((c) => !c) * 10; let ultimo = nV - 1; while (calla[ultimo]) ultimo--; ultimo = (ultimo + 1) * 10;
console.log('respiros detectados (ms):', JSON.stringify(largos));
const parrafos = readFileSync('narracion-para-pegar.txt', 'utf8').trim().split(/\n\n+/);
const guion = [];
parrafos.forEach((p, b) => p.split(/\s+/).forEach((x) => guion.push({ x, b })));

// Alineación global (Needleman-Wunsch) por similitud de palabras.
const n = guion.length, m = w.length;
const sim = (a, b) => (norm(a) === norm(b) ? 2 : norm(a).slice(0, 3) === norm(b).slice(0, 3) ? 0.5 : -1);
const D = Array.from({ length: n + 1 }, () => new Float32Array(m + 1));
for (let i = 1; i <= n; i++) D[i][0] = -i;
for (let j = 1; j <= m; j++) D[0][j] = -j;
for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++)
  D[i][j] = Math.max(D[i - 1][j - 1] + sim(guion[i - 1].x, w[j - 1].t), D[i - 1][j] - 1, D[i][j - 1] - 1);
const par = new Array(n).fill(null);
for (let i = n, j = m; i > 0 && j > 0; ) {
  if (D[i][j] === D[i - 1][j - 1] + sim(guion[i - 1].x, w[j - 1].t)) { par[i - 1] = j - 1; i--; j--; }
  else if (D[i][j] === D[i - 1][j] - 1) i--;
  else j--;
}
// Palabras sin par: se interpolan entre vecinas.
const tiempos = guion.map((g, i) => (par[i] === null ? null : { s: w[par[i]].s, e: w[par[i]].e }));
for (let i = 0; i < n; i++) {
  if (tiempos[i]) continue;
  let a = i - 1; while (a >= 0 && !tiempos[a]) a--;
  let z = i + 1; while (z < n && !tiempos[z]) z++;
  const t0 = a >= 0 ? tiempos[a].e : 0, t1 = z < n ? tiempos[z].s : t0 + 300;
  const k = z - a, pos = i - a;
  tiempos[i] = { s: Math.round(t0 + ((t1 - t0) * (pos - 1)) / (k - 1 || 1)), e: Math.round(t0 + ((t1 - t0) * pos) / (k - 1 || 1)) };
}
console.log('palabras del guion sin par en whisper:', par.filter((p) => p === null).length, 'de', n);

const iniciosBloque = new Map(); parrafos.forEach((_, b) => iniciosBloque.set(guion.findIndex((g) => g.b === b), b === 0 ? primero : largos[b - 1][1]));
for (const [i, ini] of iniciosBloque) if (tiempos[i].s < ini) tiempos[i] = { s: ini, e: Math.max(tiempos[i].e, ini + 200) };
const caps = guion.map((g, i) => {
  const finFrase = /[.?!]$/.test(g.x);
  const siguienteEsOtroBloque = guion[i + 1] && guion[i + 1].b !== g.b;
  return { text: (i === 0 ? '' : ' ') + g.x, startMs: tiempos[i].s, endMs: Math.max(tiempos[i].e, tiempos[i].s + 80), timestampMs: Math.round((tiempos[i].s + tiempos[i].e) / 2), confidence: null,
    ...((finFrase || siguienteEsOtroBloque) ? { pageBreakAfter: true } : {}) };
});
writeFileSync('src/subtitulos.json', JSON.stringify(caps));
if (largos.length !== parrafos.length - 1) throw new Error('Se esperaban ' + (parrafos.length - 1) + ' respiros y hay ' + largos.length);
const bloques = parrafos.map((_, b) => ({ bloque: b + 1, inicioMs: b === 0 ? primero : largos[b - 1][1], finMs: b === parrafos.length - 1 ? ultimo : largos[b][0], texto: parrafos[b].slice(0, 40) }));
writeFileSync('src/bloques.json', JSON.stringify(bloques, null, 2));
console.log(bloques.map((b) => `${b.bloque}: ${(b.inicioMs / 1000).toFixed(1)}–${(b.finMs / 1000).toFixed(1)} ${b.texto}`).join('\n'));
