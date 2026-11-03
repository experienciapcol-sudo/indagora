// Corta tramos de las tomas (tiempos del video de Playwright) → public/clips/*.mp4 (1728x972, 30 fps, 1x).
// La aceleración se aplica en Remotion con playbackRate (el ffmpeg de Remotion no trae setpts).
//   node scripts/clips.mjs [nombre-de-clip ...]   (sin argumentos: todos)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

// [nombre, toma, desde(s), hasta(s), velocidad]
export const CLIPS = [
  ['s4a', 'lab', 9, 12, 1],
  ['s4b', 'lab', 12, 66, 9],
  ['s4c', 'lab', 66, 80, 3],
  ['s4d', 'lab', 80, 100, 3.4],
  ['s5a', 'e1p', 136, 164, 9.3],
  ['s5b', 'e1p', 166, 182, 2.7],
  ['s5c', 'e1p', 182, 222, 5.7],
  ['s5d', 'e1p', 356, 380, 3.7],
  ['s6a', 'completo', 24, 112, 11],
  ['s6b', 'completo', 112, 216, 8],
  ['s6c', 'completo', 216, 242, 2.2],
    ['v7a', 'valor', 29, 38, 1],
  ['v7b', 'valor', 11, 21, 1],
  ['v7c', 'valor', 39, 48, 1],
  ['v7d', 'valor', 56, 64, 1],
  ['v7e', 'valor', 49, 56, 1],
];
mkdirSync('public/clips', { recursive: true });
const pedidos = process.argv.slice(2);
for (const [n, toma, a, b, v] of CLIPS) {
  if (pedidos.length && !pedidos.includes(n)) continue;
  const r = spawnSync('npx', ['remotion', 'ffmpeg', '-y', '-ss', String(a), '-t', String(b - a), '-i', `public/tomas/toma-${toma}.webm`, '-an',
    '-s', '1728x972', '-r', '30', '-c:v', 'libx264', '-crf', '23', '-preset', 'fast', '-pix_fmt', 'yuv420p', `public/clips/${n}.mp4`], { shell: true, encoding: 'utf8' });
  console.log(n, r.status === 0 && existsSync(`public/clips/${n}.mp4`) ? `ok (${(b - a)} s a ${v}x = ${((b - a) / v).toFixed(1)} s)` : 'FALLÓ\n' + r.stderr.slice(-400));
}
