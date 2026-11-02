import { describe, expect, it } from 'vitest';
import { CASOS_PREPARADOS } from './casos';
import { validarCaso } from './validar';

describe('casos preparados', () => {
  it('son tres, de giros distintos, y pasan validarCaso', () => {
    expect(CASOS_PREPARADOS).toHaveLength(3);
    expect(new Set(CASOS_PREPARADOS.map((c) => c.caso.id)).size).toBe(3);
    for (const prep of CASOS_PREPARADOS) {
      // Reconstruir el crudo desde el resultado validado debe volver a pasar.
      const r = validarCaso(
        {
          id: prep.caso.id,
          origen: 'preparado',
          empresa: prep.caso.empresa,
          objetivo: prep.caso.objetivo,
          personas: prep.caso.personas.map((p) => ({ rol: p.rol, presentacion: p.presentacion })),
          documentos: prep.caso.documentos.map((d) => ({ titulo: d.titulo, esClave: d.esClave })),
          causa: {
            ...prep.verdad.causa,
            duenos: prep.verdad.duenosCausa.map((id) =>
              id.startsWith('P')
                ? prep.caso.personas[Number(id.slice(1)) - 1].rol
                : prep.caso.documentos[Number(id.slice(1)) - 1].titulo),
          },
          distractores: prep.verdad.distractores.map((d) => ({ enunciado: d.enunciado, porQueEngana: d.porQueEngana })),
          hechos: prep.verdad.hechos.map((h) => ({
            tipo: h.tipo, texto: h.texto, terminos: h.terminos, revelacion: h.revelacion,
            dueno: h.dueno.startsWith('P')
              ? prep.caso.personas[Number(h.dueno.slice(1)) - 1].rol
              : prep.caso.documentos[Number(h.dueno.slice(1)) - 1].titulo,
            distractor: h.distractor ? prep.verdad.distractores.find((d) => d.id === h.distractor)!.enunciado : null,
          })),
        },
        prep.caso.parametros,
      );
      expect('errores' in r ? r.errores : []).toEqual([]);
    }
  });

  it('cubren documento clave, causa entre dos personas y tres distractores sin clave', () => {
    const [dental, tienda] = CASOS_PREPARADOS;
    expect(dental.verdad.documentoClave).toBe('D1');
    expect(tienda.verdad.documentoClave).toBeNull();
    expect(tienda.verdad.distractores).toHaveLength(3);
    expect(new Set(tienda.verdad.hechos.filter((h) => h.tipo === 'causa').map((h) => h.dueno)).size).toBe(2);
    for (const prep of CASOS_PREPARADOS) expect(prep.comparacionReferencia.veredicto).toBe('encontrada');
  });

  it('cada persona responde de 4 a 7 oraciones sin filtrar marcadores en la ronda abierta', () => {
    for (const prep of CASOS_PREPARADOS) {
      for (const persona of prep.caso.personas) {
        const intercambio = prep.intercambios.find((x) => x.persona === persona.id);
        expect(intercambio).toBeDefined();
        const oraciones = intercambio!.respuesta.split(/(?<=\.)\s+/).filter((o) => o.trim().length > 0);
        expect(oraciones.length).toBeGreaterThanOrEqual(4);
        expect(oraciones.length).toBeLessThanOrEqual(7);
        expect(intercambio!.respuesta.length).toBeGreaterThan(250);
        for (const m of prep.verdad.causa.marcadores) {
          expect(intercambio!.respuesta.toLowerCase()).not.toContain(m.toLowerCase());
        }
        // Toda oración inicial viene de un hecho autorizado en la ronda abierta.
        for (const oracion of oraciones) {
          expect(prep.verdad.hechos.some((h) => h.dueno === persona.id && h.revelacion === 'siempre' && h.texto === oracion)).toBe(true);
        }
      }
      const fuentesEntrevista = prep.fuentes.filter((f) => f.tipo === 'entrevista');
      for (const fuente of fuentesEntrevista) expect(fuente.texto.length).toBeGreaterThan(250);
    }
  });

  it('la vista pública no contiene marcadores de la causa', () => {
    for (const prep of CASOS_PREPARADOS) {
      const publico = JSON.stringify(prep.caso).toLowerCase();
      for (const m of prep.verdad.causa.marcadores) expect(publico).not.toContain(m.toLowerCase());
    }
  });
});
