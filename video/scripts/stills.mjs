// Fotogramas de prueba: node scripts/stills.mjs <cuadro> [cuadro ...]  → .tomas-tmp/stills/f<cuadro>.png
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
mkdirSync('.tomas-tmp/stills', { recursive: true });
for (const f of process.argv.slice(2)) {
  const r = spawnSync('npx', ['remotion', 'still', 'IndagoraDemo', `.tomas-tmp/stills/f${f}.png`, `--frame=${f}`], { shell: true, encoding: 'utf8' });
  console.log(f, r.status === 0 ? 'ok' : 'FALLÓ ' + (r.stderr || r.stdout).slice(-600));
}
