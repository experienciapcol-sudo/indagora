// Arma UNA pista de narración continua a partir del MP3 de ElevenLabs:
//  - separa los 9 bloques (por la primera palabra de cada uno, de .tomas-tmp/bloques-orig.json),
//  - si existe public/narracion-bloque7.mp3, ese reemplaza al bloque 7 original,
//  - recorta cada pausa larga (> 0.6 s → 0.4 s) y los silencios de los extremos de cada bloque,
//  - une los bloques con un respiro de ~1 s (donde cambia la escena), agrega 0.8 s al inicio,
//  - baja la velocidad a 0.92x con atempo (no cambia el tono).
// Salida: public/narracion-final.mp3. Después: subtitulos.mjs y alinear.mjs.
//   node scripts/montar-audio.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const SR = 44100, FRAME = SR / 100; // ventanas de 10 ms
const UMBRAL = 413;                 // ≈ -38 dB
const LARGA = 0.6, QUEDA = 0.4;
const PAD_S = 0.8, LEAD_S = 0.8, TEMPO = 0.95;

const ff = (args) => spawnSync('npx', ['remotion', 'ffmpeg', '-y', ...args], { shell: true, encoding: 'utf8' });

function leerWav(ruta) {
  const wav = readFileSync(ruta);
  let off = 12;
  while (off + 8 <= wav.length) {
    const id = wav.toString('ascii', off, off + 4), n = wav.readUInt32LE(off + 4);
    if (id === 'data') return new Int16Array(wav.buffer.slice(wav.byteOffset + off + 8, wav.byteOffset + off + 8 + n));
    off += 8 + n + (n % 2);
  }
  throw new Error('WAV sin datos: ' + ruta);
}

// Recorta pausas largas y los silencios de los extremos.
function comprimir(x) {
  const nF = Math.floor(x.length / FRAME);
  const sil = [];
  for (let f = 0; f < nF; f++) { let s = 0; for (let i = f * FRAME; i < (f + 1) * FRAME; i++) s += x[i] * x[i]; sil.push(Math.sqrt(s / FRAME) < UMBRAL); }
  const runs = []; for (let f = 0; f < nF; ) { let g = f; while (g < nF && sil[g] === sil[f]) g++; runs.push({ sil: sil[f], a: f, b: g }); f = g; }
  const out = []; let ahorro = 0, n = 0;
  runs.forEach((r, i) => {
    const sub = (a, b) => x.subarray(a * FRAME, b * FRAME);
    if (!r.sil) { out.push(sub(r.a, r.b)); return; }
    const extremo = i === 0 || i === runs.length - 1;
    if (extremo) { const keep = Math.min(r.b - r.a, 5); out.push(i === 0 ? sub(r.b - keep, r.b) : sub(r.a, r.a + keep)); return; }
    const len = (r.b - r.a) / 100;
    if (len > LARGA) { const m = Math.round(QUEDA * 50); out.push(sub(r.a, r.a + m), sub(r.b - m, r.b)); ahorro += len - QUEDA; n++; }
    else out.push(sub(r.a, r.b));
  });
  const total = out.reduce((s, a) => s + a.length, 0); const y = new Int16Array(total); let p = 0; for (const a of out) { y.set(a, p); p += a.length; }
  return { pcm: y, ahorro, n };
}

// ── bloques del MP3 original
ff(['-i', 'public/narracion.mp3', '-ar', String(SR), '-ac', '1', '-c:a', 'pcm_s16le', '.tomas-tmp/n44.wav']);
const x = leerWav('.tomas-tmp/n44.wav');
const orig = JSON.parse(readFileSync('.tomas-tmp/bloques-orig.json', 'utf8'));
// Corte de bloque: mitad de la última pausa (≥ 0.25 s) que termina cerca de la primera palabra. Whisper a veces ancla el
// inicio de una palabra tarde, y cortar "150 ms antes" podía dejar el pedazo de la palabra pegado al bloque anterior.
const nFx = Math.floor(x.length / FRAME);
const silX = []; for (let f = 0; f < nFx; f++) { let e = 0; for (let i = f * FRAME; i < (f + 1) * FRAME; i++) e += x[i] * x[i]; silX.push(Math.sqrt(e / FRAME) < UMBRAL); }
const runsX = []; for (let f = 0; f < nFx; ) { let g = f; while (g < nFx && silX[g] === silX[f]) g++; if (silX[f]) runsX.push([f, g]); f = g; }
const corte = (ms) => {
  const t = Math.round(ms / 10);
  const c = runsX.filter(([a, b]) => b - a >= 25 && b <= t + 30 && b >= t - 150).at(-1);
  const viejo = Math.max(0, Math.round((ms / 1000 - 0.15) * SR));
  if (!c) { console.log('sin pausa cerca de', ms / 1000, 's: corte a 150 ms'); return viejo; }
  const nuevo = Math.floor((c[0] + c[1]) / 2) * FRAME;
  console.log('corte en', (nuevo / SR).toFixed(2), 's (antes', (viejo / SR).toFixed(2) + ')');
  return nuevo;
};
const limites = orig.map((b, i) => [i === 0 ? 0 : corte(b.inicioMs), i + 1 < orig.length ? corte(orig[i + 1].inicioMs) : x.length]);
const bloques = limites.map(([a, b]) => comprimir(x.subarray(a, b)));

if (existsSync('public/narracion-bloque7.mp3')) {
  ff(['-i', 'public/narracion-bloque7.mp3', '-ar', String(SR), '-ac', '1', '-c:a', 'pcm_s16le', '.tomas-tmp/b7-44.wav']);
  bloques[6] = comprimir(leerWav('.tomas-tmp/b7-44.wav'));
  console.log('bloque 7: se usa public/narracion-bloque7.mp3');
} else console.log('bloque 7: el del MP3 original (no hay narracion-bloque7.mp3)');

// Frase extra al final del bloque 3 (la del método), si existe public/narracion-bloque3b.mp3.
if (existsSync('public/narracion-bloque3b.mp3')) {
  ff(['-i', 'public/narracion-bloque3b.mp3', '-ar', String(SR), '-ac', '1', '-c:a', 'pcm_s16le', '.tomas-tmp/b3b-44.wav']);
  const extra = comprimir(leerWav('.tomas-tmp/b3b-44.wav'));
  const union = new Int16Array(bloques[2].pcm.length + Math.round(0.45 * SR) + extra.pcm.length);
  union.set(bloques[2].pcm, 0); union.set(extra.pcm, bloques[2].pcm.length + Math.round(0.45 * SR));
  bloques[2] = { pcm: union, ahorro: bloques[2].ahorro + extra.ahorro, n: bloques[2].n + extra.n };
  console.log('bloque 3: se agrega public/narracion-bloque3b.mp3');
}
const partes = [new Int16Array(Math.round(LEAD_S * SR))];
bloques.forEach((b, i) => { if (i > 0) partes.push(new Int16Array(Math.round(PAD_S * SR))); partes.push(b.pcm); });
const total = partes.reduce((s, a) => s + a.length, 0);
const pcm = new Int16Array(total); let p = 0; for (const a of partes) { pcm.set(a, p); p += a.length; }
const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + total * 2, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(total * 2, 40);
writeFileSync('.tomas-tmp/n-final.wav', Buffer.concat([h, Buffer.from(pcm.buffer)]));
console.log(`pausas recortadas: ${bloques.reduce((s, b) => s + b.n, 0)} (−${bloques.reduce((s, b) => s + b.ahorro, 0).toFixed(1)} s) · duración antes del tempo: ${(total / SR).toFixed(1)} s · después: ${(total / SR / TEMPO).toFixed(1)} s`);
const r = ff(['-i', '.tomas-tmp/n-final.wav', '-af', `atempo=${TEMPO}`, '-c:a', 'libmp3lame', '-q:a', '2', 'public/narracion-final.mp3']);
console.log(r.status === 0 ? 'public/narracion-final.mp3 listo' : r.stderr.slice(-400));
