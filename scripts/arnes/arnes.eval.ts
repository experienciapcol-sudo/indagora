// Arnés F7 real (gasta créditos de Meta). Se omite si no hay llave en .dev.vars.
//   npx vitest run --config vitest.eval.config.ts scripts/arnes
// Variables: TOPE_ARNES_USD (20 por omisión), REPETICIONES (3 por omisión).
// META_API_BASE_URL sale de .dev.vars o, si no está ahí, de los vars de wrangler.jsonc.
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { correrArnes, dependenciasDesde, leerDevVars } from './arnes';

const baseDeWrangler = () => /"META_API_BASE_URL"\s*:\s*"([^"]+)"/.exec(readFileSync('wrangler.jsonc', 'utf8'))?.[1] ?? '';
const vars = leerDevVars();
const deps = dependenciasDesde({ ...vars, META_API_BASE_URL: vars.META_API_BASE_URL || baseDeWrangler() });

it.skipIf(!deps)('arnés: agente vs flujo fijo vs un solo prompt', async () => {
  const repeticiones = Math.max(1, Number(process.env.REPETICIONES ?? 3) || 3);
  const topeUsd = Math.max(0, Number(process.env.TOPE_ARNES_USD ?? 20) || 20);
  const { corridas, tabla } = await correrArnes({ deps: deps!, repeticiones, topeUsd });
  console.log(tabla);
  expect(corridas.length).toBeGreaterThan(0);
  expect(corridas.some((c) => c.metricas)).toBe(true);
}, 4 * 3_600_000);
