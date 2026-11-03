// Hoja de contacto: node scripts/hoja.mjs <carpeta-de-fotogramas> <salida.png> <segundos-por-fotograma>
import { chromium } from 'playwright';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const [dir, out, paso] = [resolve(process.argv[2]), resolve(process.argv[3]), Number(process.argv[4] ?? 8)];
const archivos = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
const html = `<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(6,480px);gap:4px">${archivos
  .map((f, i) => `<div style="position:relative"><img src="file:///${dir.split(String.fromCharCode(92)).join('/')}/${f}" width=480><b style="position:absolute;left:4px;top:4px;background:#000c;color:#fff;font:bold 16px monospace;padding:2px 6px">${i * paso}s</b></div>`)
  .join('')}</body>`;
const n = await chromium.launch();
const p = await n.newPage({ viewport: { width: 2900, height: 1000 } });
const html1 = resolve(dir, "_hoja.html"); (await import("node:fs")).writeFileSync(html1, html); await p.goto("file:///" + html1.split(String.fromCharCode(92)).join("/"));
await p.waitForTimeout(800);
await p.screenshot({ path: out, fullPage: true });
await n.close();
