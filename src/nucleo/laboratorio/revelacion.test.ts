import { describe, expect, it } from 'vitest';
import { CASOS_PREPARADOS } from './casos';
import { hechosAutorizados, revisarRespuesta } from './revelacion';
import type { Hecho, TipoPregunta, VerdadLaboratorio } from './tipos';

function hecho(id: string, revelacion: Hecho['revelacion'], dueno = 'P1'): Hecho {
  return { id, tipo: 'contexto', texto: `texto ${id}`, dueno, revelacion, distractor: null, terminos: [`termino-${id}-a`, `termino-${id}-b`] };
}
const VERDAD: VerdadLaboratorio = {
  causa: { enunciado: 'x', mecanismo: 'x', marcadores: ['m1', 'm2', 'm3'] },
  hechos: [hecho('H01', 'siempre'), hecho('H02', 'temporal'), hecho('H03', 'contraste'), hecho('H04', 'incidente'), hecho('H05', 'cuantitativa'), hecho('H06', 'siempre', 'P2')],
  distractores: [], duenosCausa: ['P1'], documentoClave: null,
};

describe('hechosAutorizados', () => {
  const esperado: Record<TipoPregunta, string[]> = {
    abierta: ['H01'], temporal: ['H01', 'H02'], contraste: ['H01', 'H03'],
    incidente: ['H01', 'H02', 'H04'], cuantitativa: ['H01', 'H04', 'H05'], documental: [],
  };
  for (const [tipo, ids] of Object.entries(esperado)) {
    it(`${tipo} autorizada solo lo suyo y solo de esa persona`, () => {
      expect(hechosAutorizados(VERDAD, 'P1', tipo as TipoPregunta).map((h) => h.id)).toEqual(ids);
    });
  }
});

describe('revisarRespuesta', () => {
  const autorizados = [VERDAD.hechos[0]];
  it('detecta fuga con 2 términos de un hecho no autorizado y da su id', () => {
    const r = revisarRespuesta('Pues pasó termino-H04-a y también termino-H04-b ayer.', autorizados, VERDAD.hechos);
    expect(r).toEqual({ ok: false, hechosFugados: ['H04'] });
  });
  it('detecta fuga con una frase exacta marcada con =', () => {
    const todos = [...VERDAD.hechos, { ...hecho('H09', 'incidente'), terminos: ['=frase secreta completa', 'otra cosa'] }];
    expect(revisarRespuesta('Mencionó la frase secreta completa sin querer.', autorizados, todos)).toEqual({ ok: false, hechosFugados: ['H09'] });
  });
  it('no marca fuga con un solo término suelto ni con el síntoma', () => {
    expect(revisarRespuesta('Los pedidos llegan tarde y vi termino-H04-a por ahí.', autorizados, VERDAD.hechos)).toEqual({ ok: true });
  });
  it('ningún preparado autoriza hechos de otra persona', () => {
    for (const prep of CASOS_PREPARADOS) {
      for (const persona of prep.caso.personas) {
        for (const tipo of ['abierta', 'temporal', 'contraste', 'incidente', 'cuantitativa'] as TipoPregunta[]) {
          expect(hechosAutorizados(prep.verdad, persona.id, tipo).every((h) => h.dueno === persona.id)).toBe(true);
        }
      }
    }
  });
});
