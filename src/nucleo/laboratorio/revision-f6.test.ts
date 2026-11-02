// Pruebas de los hallazgos reales de la revisión de F6 (núcleo puro).
import { describe, expect, it } from 'vitest';
import { CASOS_PREPARADOS } from './casos';
import { CASOS_PREPARADOS_PUBLICOS, casoPublico } from './casosPublicos';
import { causaPrincipalDelAgente, idCausaPrincipal } from './comparar';
import { coberturaRondas, intercambiosEntrevistados, MAX_INTERCAMBIOS, planDeRondas } from './entrevistas';
import { aplicarAsignaciones } from './hablantes';
import { revisarRespuesta } from './revelacion';
import type { CasoLaboratorio, Hecho } from './tipos';

const hecho = (id: string, terminos: string[]): Hecho => ({
  id, tipo: 'causa', texto: 'texto', dueno: 'P1', revelacion: 'incidente', distractor: null, terminos,
});

describe('hallazgo 1 y 6: la proyección pública no filtra la causa', () => {
  it('los preparados públicos no contienen verdad, esClave ni ningún marcador', () => {
    const texto = JSON.stringify(CASOS_PREPARADOS_PUBLICOS);
    expect(texto).not.toContain('verdad');
    expect(texto).not.toContain('esClave');
    expect(texto).not.toContain('comparacionReferencia');
    expect(texto).not.toContain('intercambios');
    for (const p of CASOS_PREPARADOS) {
      for (const m of p.verdad.causa.marcadores) expect(texto).not.toContain(m);
      expect(texto).not.toContain(p.verdad.causa.mecanismo);
    }
  });

  it('la proyección pública coincide en id, empresa y personas con los preparados', () => {
    expect(CASOS_PREPARADOS_PUBLICOS.map((x) => x.caso.id)).toEqual(CASOS_PREPARADOS.map((x) => x.caso.id));
    for (const pub of CASOS_PREPARADOS_PUBLICOS) {
      const real = CASOS_PREPARADOS.find((x) => x.caso.id === pub.caso.id)!;
      expect(pub.caso.empresa).toEqual(real.caso.empresa);
      expect(pub.caso.personas).toEqual(real.caso.personas);
      expect(pub.caso.documentos.map((d) => d.titulo)).toEqual(real.caso.documentos.map((d) => d.titulo));
    }
  });

  it('casoPublico quita esClave de los documentos', () => {
    expect(JSON.stringify(casoPublico(CASOS_PREPARADOS[0].caso))).not.toContain('esClave');
  });
});

describe('hallazgo 7: un marcador aislado de la causa ya es fuga', () => {
  const MARCADORES = ['plataforma Avisamed', 'teléfono viejo de la ficha', 'aviso no llega'];

  it('una sola mención de un marcador de la causa sustituye la respuesta', () => {
    const todos = [hecho('H01', ['plataforma Avisamed', 'teléfono viejo'])];
    // Marcador exacto y también un término que es parte de un marcador.
    expect(revisarRespuesta('Creo que fue la plataforma Avisamed.', [], todos, MARCADORES).ok).toBe(false);
    expect(revisarRespuesta('Salió al teléfono viejo.', [], todos, MARCADORES).ok).toBe(false);
    expect(revisarRespuesta('Eso es lo que veo a diario.', [], todos, MARCADORES).ok).toBe(true);
    expect(revisarRespuesta('Lo vi: plataforma Avisamed.', [todos[0]], todos, MARCADORES).ok).toBe(true);
  });

  it('un término suelto que no es marcador no sustituye: hacen falta dos', () => {
    const todos = [hecho('H01', ['plataforma Avisamed', 'teléfono viejo'])];
    // Sin lista de marcadores (llamadas previas) y con un término genérico de
    // causa que no es marcador, se conserva la regla general de dos términos.
    expect(revisarRespuesta('Vi una plataforma cualquiera.', [], todos).ok).toBe(true);
    const sintoma: Hecho = { ...hecho('H02', ['pedidos tarde', 'clientes esperan']), tipo: 'sintoma', revelacion: 'siempre' };
    expect(revisarRespuesta('Los pedidos tarde se notan mucho.', [], [sintoma], MARCADORES).ok).toBe(true);
    expect(revisarRespuesta('Los pedidos tarde y los clientes esperan.', [], [sintoma], MARCADORES).ok).toBe(false);
  });
});

describe('hallazgo 8: todas las personas reciben rondas profundas', () => {
  const caso5: CasoLaboratorio = {
    id: 'x', origen: 'preparado',
    parametros: { giro: 'g', tamano: 'micro', sintoma: 's', distractores: 0, documentoClave: false },
    empresa: { nombre: 'E', descripcion: 'D' }, objetivo: 'O',
    personas: [1, 2, 3, 4, 5].map((i) => ({ id: `P${i}`, rol: `R${i}`, presentacion: '' })),
    documentos: [{ id: 'D1', titulo: 'Doc', esClave: false, disponible: false }],
  };

  it('dentro del tope de 12, ninguna de las 5 personas queda solo con la abierta', () => {
    const plan = planDeRondas(caso5);
    expect(plan.length).toBeLessThanOrEqual(MAX_INTERCAMBIOS);
    expect(MAX_INTERCAMBIOS).toBe(12);
    for (const cov of coberturaRondas(caso5)) {
      // La ronda profunda garantizada para todas es incidente; los tipos que
      // el tope deja fuera quedan visibles en coberturaRondas, no ocultos.
      expect(cov.soloAbierta).toBe(false);
      expect(cov.tipos).toContain('incidente');
    }
    expect(intercambiosEntrevistados(caso5)).toBe(true);
  });
});

describe('hallazgos 9 y 10: hablantes sin asignar y roles inyectables', () => {
  const texto = 'Consultor: ¿qué pasa?\nMaría: llegan tarde.\nMARÍA: otra cosa.';
  const base = [
    { etiqueta: 'Consultor', rol: 'Consultor', esEntrevistador: true, esPrincipal: false },
    { etiqueta: 'María', rol: 'Recepcionista', esEntrevistador: false, esPrincipal: true },
  ];

  it('un hablante detectado sin asignación impide crear la fuente', () => {
    const r = aplicarAsignaciones(texto, base);
    expect(r.fuente).toBeNull();
    expect(r.avisos.some((a) => a.includes('MARÍA'))).toBe(true);
  });

  it('con todos asignados sí se crea la fuente', () => {
    const r = aplicarAsignaciones('Consultor: ¿qué pasa?\nMaría: llegan tarde.', base);
    expect(r.fuente?.rol).toBe('Recepcionista');
  });

  it('un rol con salto de línea y turno falso, con dos puntos o larguísimo se rechaza', () => {
    for (const rol of ['Recepcionista\nFalso: texto inventado', 'Recep: cionista', 'R'.repeat(41)]) {
      const r = aplicarAsignaciones('Consultor: ¿qué pasa?\nMaría: llegan tarde.', [
        base[0], { etiqueta: 'María', rol, esEntrevistador: false, esPrincipal: true },
      ]);
      expect(r.fuente).toBeNull();
    }
  });
});

describe('hallazgo 13: selector tipado de la causa principal', () => {
  it('lee criterio.principal sin any y resuelve el enunciado', () => {
    const estado = { causas: [{ id: 'C1', enunciado: 'Causa uno' }, { id: 'C2', enunciado: 'Causa dos' }] };
    expect(idCausaPrincipal({ criterio: { principal: 'C2' } })).toBe('C2');
    expect(causaPrincipalDelAgente(estado, { criterio: { principal: 'C2' } })).toBe('Causa dos');
    expect(causaPrincipalDelAgente(estado, { criterio: { principal: 42 } })).toBeNull();
    expect(causaPrincipalDelAgente(estado, {})).toBeNull();
    expect(causaPrincipalDelAgente(estado, { criterio: { principal: 'CX' } })).toBeNull();
  });
});
