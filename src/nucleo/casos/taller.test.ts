import { describe, expect, it } from 'vitest';
import { segmentar } from '../segmentar';
import { CASO_TALLER } from './taller';
import { VERDAD_TALLER } from './taller.verdad';

const segmentadas = new Map(CASO_TALLER.fuentes.map((f) => [f.id, segmentar(f)]));

// El analista solo puede apuntar a oraciones enteras: cada fragmento de la verdad plantada
// debe caer dentro de una sola oración citable, o el caso no se podría resolver.
const fragmentos = [
  ...VERDAD_TALLER.oracionesClave,
  ...VERDAD_TALLER.distractores,
  ...VERDAD_TALLER.corroboraciones.flatMap((c) => [c.a, c.b]),
];

describe('caso del taller', () => {
  it('tiene tres entrevistas y un documento con ids únicos', () => {
    expect(CASO_TALLER.fuentes.map((f) => `${f.id}:${f.tipo}`)).toEqual(['E1:entrevista', 'E2:entrevista', 'E3:entrevista', 'D1:documento']);
  });

  it('la consultora queda como entrevistadora y cada entrevista tiene un solo entrevistado', () => {
    for (const f of CASO_TALLER.fuentes.filter((x) => x.tipo === 'entrevista')) {
      const hablantes = new Set(segmentadas.get(f.id)!.turnos.map((t) => `${t.hablante}:${t.esEntrevistador}`));
      expect(hablantes.size, f.id).toBe(2);
      expect(hablantes.has('Consultora:true'), f.id).toBe(true);
    }
  });

  it.each(fragmentos.map((x) => [`${x.fuente}: ${x.fragmento}`, x] as const))('"%s" cae en una sola oración citable', (_, x) => {
    const oraciones = segmentadas.get(x.fuente)!.oraciones.filter((o) => o.texto.includes(x.fragmento));
    expect(oraciones).toHaveLength(1);
    expect(oraciones[0].esEntrevistador).toBe(false);
  });

  it('cada fuente queda muy por debajo del máximo de oraciones citables', () => {
    for (const [id, s] of segmentadas) expect(s.oraciones.length, id).toBeLessThan(120);
  });
});
