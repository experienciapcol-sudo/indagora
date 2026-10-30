// Evalúa la corrida más reciente del agente (o la de CORRIDA=ruta) contra la verdad del taller.
//   npx vitest run --config vitest.eval.config.ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { VERDAD_TALLER } from '../src/nucleo/casos/taller.verdad';
import { evaluarCorrida } from '../src/nucleo/casos/evaluar';

const DIR = 'interno/corridas';

it('corrida del agente contra la verdad del taller', () => {
  const ruta = process.env.CORRIDA ?? join(DIR, readdirSync(DIR).filter((a) => a.startsWith('agente-')).sort().at(-1)!);
  const { vista, segundos } = JSON.parse(readFileSync(ruta, 'utf8'));
  const r = evaluarCorrida(vista, VERDAD_TALLER, { causa: /herraje|proveedor|Brev[aá]nez/i, distractores: /flojo|personal|ganas|sierra|nuevo|lijado|horas extra|supervis/i });
  console.log(ruta, `${segundos} s`);
  console.log(JSON.stringify({ ...r, corroboraciones: { ...r.corroboraciones, detalle: r.corroboraciones.detalle.filter((d) => !d.encontrada).map((d) => d.nota) } }, null, 2));
  expect(r.terminado?.motivo).toBe('criterio');
  expect(r.causaCorrecta).toBe(true);
  expect(r.distractorComoCausa).toBe(false);
});
