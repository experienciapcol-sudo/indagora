import { describe, expect, it } from 'vitest';
import { segmentar } from '../segmentar';
import { CASOS_PREPARADOS } from './casos';
import { fuenteDocumento, fuentesDeIntercambios, planDeRondas } from './entrevistas';
import type { Intercambio } from './tipos';

describe('planDeRondas y fuentesDeIntercambios', () => {
  it('nunca supera 12, entrevista a cada persona y las fuentes se segmentan con ambos hablantes', () => {
    for (const prep of CASOS_PREPARADOS) {
      const plan = planDeRondas(prep.caso);
      expect(plan.length).toBeLessThanOrEqual(12);
      for (const persona of prep.caso.personas) expect(plan.some((r) => r.persona === persona.id)).toBe(true);
      const xs: Intercambio[] = plan.filter((r) => r.tipo !== 'documental').map((r, i) => {
        const persona = prep.caso.personas.find((p) => p.id === r.persona)!;
        return { n: i + 1, persona: r.persona, tipoPregunta: r.tipo, pregunta: '¿Qué está pasando?', respuesta: `Respuesta de ${persona.rol} en ronda ${r.tipo}, con detalle suficiente.`, hechosRevelados: [], fuga: false };
      });
      const fuentes = fuentesDeIntercambios(prep.caso, xs, []);
      expect(fuentes.length).toBe(prep.caso.personas.length);
      for (const f of fuentes) {
        const { oraciones } = segmentar(f);
        expect(oraciones.some((o) => o.esEntrevistador)).toBe(true);
        expect(oraciones.some((o) => !o.esEntrevistador)).toBe(true);
      }
    }
  });

  it('la ronda documental entrega el documento como fuente D solo al pedirlo', () => {
    const prep = CASOS_PREPARADOS[0];
    const doc = fuenteDocumento(prep.caso, prep.verdad, 'D1', 1);
    expect(doc?.id).toBe('D1');
    expect(doc?.tipo).toBe('documento');
    expect(prep.caso.documentos[0].disponible).toBe(false);
    expect(fuenteDocumento(prep.caso, prep.verdad, 'D9', 1)).toBeNull();
  });
});
