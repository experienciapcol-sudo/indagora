// Arma UNA pista de narración continua: recorta las pausas largas del MP3 de ElevenLabs (>0.6 s → 0.4 s),
// inserta un respiro entre bloques (donde cambia la escena), agrega 0.8 s al inicio y la baja a 0.92x
// (atempo conserva el tono). Salida: public/narracion-final.mp3. Después: subtitulos.mjs y alinear.mjs.
//   node scripts/montar-audio.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const SR = 44100, FRAME = SR / 100; // ventanas de 10 ms
const UMBRAL = 413;          // ≈ -38 dB
const LARGA = 0.6, QUEDA = 0.4; // pausas > 0.6 s se dejan en 0.4 s
const PAD_S = 1.6, LEAD_S = 0.8, TEMPO = 0.92;

const wav = readFileSync('.tomas-tmp/n44.wav');
let off = 12; let datos = null;
while (off + 8 <= wav.length) { const id = wav.toString('ascii', off, off + 4), n = wav.readUInt32LE(off + 4); if (id === 'data') { datos = wav.subarray(off + 8, off + 8 + n); break; } off += 8 + n + (n % 2); }
const x = new Int16Array(datos.buffer, datos.byteOffset, datos.length >> 1);
const nF = Math.floor(x.length / FRAME);
const sil = new Array(nF);
for (let f = 0; f < nF; f++) { let s = 0; for (let i = f * FRAME; i < (f + 1) * FRAME; i++) s += x[i] * x[i]; sil[f] = Math.sqrt(s / FRAME) < UMBRAL; }
// Runs [ini, fin) en cuadros de 10 ms
const runs = []; for (let f = 0; f < nF; ) { let g = f; while (g < nF && sil[g] === sil[f]) g++; runs.push({ sil: sil[f], a: f, b: g }); f = g; }

const bloques = JSON.parse(readFileSync('.tomas-tmp/bloques-orig.json', 'utf8'));
const fronteras = bloques.slice(1).map((b) => Math.round(b.inicioMs / 10) - 10); // 100 ms antes de la primera palabra

// Cada frontera de bloque se asigna a la última pausa que termina cerca (hasta 0.8 s) de la primera palabra.
const frontRun = new Map();
for (const f of fronteras) { const c = runs.filter((r) => r.sil && r.b <= f + 15 && r.b >= f - 80).at(-1); if (c) frontRun.set(c, f); else console.log('sin pausa cerca de la frontera', f / 100, 's'); }
const out = [new Int16Array(Math.round(LEAD_S * SR))];
const tomar = (a, b) => out.push(x.subarray(a * FRAME, b * FRAME));
const silencio = (s) => out.push(new Int16Array(Math.round(s * SR)));
let ahorro = 0, nRec = 0, nPad = 0;
for (const r of runs) {
  const len = (r.b - r.a) / 100;
  const fr = frontRun.get(r);
  if (!r.sil) { tomar(r.a, r.b); continue; }
  const larga = len > LARGA;
  const mitad = larga ? Math.round(QUEDA * 50) : Math.floor((r.b - r.a) / 2); // cuadros a cada lado
  if (larga) { tomar(r.a, r.a + mitad); if (fr !== undefined) { silencio(PAD_S); nPad++; } tomar(r.b - mitad, r.b); ahorro += len - QUEDA; nRec++; }
  else if (fr !== undefined) { tomar(r.a, r.a + mitad); silencio(PAD_S); nPad++; tomar(r.a + mitad, r.b); }
  else tomar(r.a, r.b);
}
const total = out.reduce((s, a) => s + a.length, 0);
const pcm = new Int16Array(total); let p = 0; for (const a of out) { pcm.set(a, p); p += a.length; }
const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + total * 2, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(total * 2, 40);
writeFileSync('.tomas-tmp/n-final.wav', Buffer.concat([h, Buffer.from(pcm.buffer)]));
console.log(`pausas recortadas: ${nRec} (−${ahorro.toFixed(1)} s) · respiros entre bloques: ${nPad} (de ${fronteras.length}) · duración antes del tempo: ${(total / SR).toFixed(1)} s`);
const r = spawnSync('npx', ['remotion', 'ffmpeg', '-y', '-i', '.tomas-tmp/n-final.wav', '-af', `atempo=${TEMPO}`, '-c:a', 'libmp3lame', '-q:a', '2', 'public/narracion-final.mp3'], { shell: true, encoding: 'utf8' });
console.log(r.status === 0 ? 'public/narracion-final.mp3 listo' : r.stderr.slice(-400));
