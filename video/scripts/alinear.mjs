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

const caps = guion.map((g, i) => {
  const finFrase = /[.?!]$/.test(g.x);
  const siguienteEsOtroBloque = guion[i + 1] && guion[i + 1].b !== g.b;
  return { text: (i === 0 ? '' : ' ') + g.x, startMs: tiempos[i].s, endMs: Math.max(tiempos[i].e, tiempos[i].s + 80), timestampMs: Math.round((tiempos[i].s + tiempos[i].e) / 2), confidence: null,
    ...((finFrase || siguienteEsOtroBloque) ? { pageBreakAfter: true } : {}) };
});
writeFileSync('src/subtitulos.json', JSON.stringify(caps));
const bloques = parrafos.map((_, b) => { const k = guion.findIndex((g) => g.b === b); const l = guion.map((g) => g.b).lastIndexOf(b); return { bloque: b + 1, inicioMs: tiempos[k].s, finMs: tiempos[l].e, texto: parrafos[b].slice(0, 40) }; });
writeFileSync('src/bloques.json', JSON.stringify(bloques, null, 2));
console.log(bloques.map((b) => `${b.bloque}: ${(b.inicioMs / 1000).toFixed(1)}–${(b.finMs / 1000).toFixed(1)} ${b.texto}`).join('\n'));
