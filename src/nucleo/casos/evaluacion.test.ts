import { describe, expect, it } from 'vitest';
import { cargarCasos, validarCaso } from '../../../scripts/arnes/casos';
import { segmentar } from '../segmentar';

// Casos de F7 en ./evaluacion: el arnés los carga solos; aquí se revisa que sean resolubles.
const casos = cargarCasos();

describe('casos de evaluación F7', () => {
  it('hay seis casos además del taller, con ids únicos', () => {
    expect(casos.length).toBe(7);
    expect(new Set(casos.map((c) => c.id)).size).toBe(7);
  });

  describe.each(casos.map((c) => [c.id, c] as const))('%s', (_, caso) => {
    const segmentadas = new Map(caso.fuentes.map((f) => [f.id, segmentar(f)]));
    const fragmentos = [
      ...caso.verdad.oracionesClave,
      ...caso.verdad.distractores,
      ...caso.verdad.corroboraciones.flatMap((c) => [c.a, c.b]),
    ];

    it('cumple el contrato del arnés', () => {
      expect(validarCaso(caso)).toEqual([]);
    });

    it('cada entrevista tiene un entrevistador y un solo entrevistado', () => {
      for (const f of caso.fuentes.filter((x) => x.tipo === 'entrevista')) {
        const hablantes = new Set(segmentadas.get(f.id)!.turnos.map((t) => `${t.hablante}:${t.esEntrevistador}`));
        expect(hablantes.size, f.id).toBe(2);
        expect(hablantes.has(`${f.entrevistador}:true`), f.id).toBe(true);
      }
    });

    it.each(fragmentos.map((x) => [`${x.fuente}: ${x.fragmento}`, x] as const))('"%s" cae en una sola oración citable', (_, x) => {
      const oraciones = segmentadas.get(x.fuente)!.oraciones.filter((o) => o.texto.includes(x.fragmento));
      expect(oraciones).toHaveLength(1);
      expect(oraciones[0].esEntrevistador).toBe(false);
    });

    it('la causa plantada cumple el patrón y ningún distractor lo cumple', () => {
      expect(caso.patrones.causa.test(caso.verdad.causa)).toBe(true);
      for (const d of caso.verdad.distractores) expect(caso.patrones.causa.test(d.fragmento), d.fragmento).toBe(false);
    });

    it('los fragmentos prohibidos del Laboratorio no están en las fuentes', () => {
      const todo = caso.fuentes.map((f) => f.texto).join('\n');
      for (const p of caso.laboratorio?.fragmentosProhibidos ?? []) expect(todo).not.toContain(p);
    });
  });
});
