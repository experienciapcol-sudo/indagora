import { describe, expect, it } from 'vitest';
import { limpiarRepeticiones, partirOraciones, segmentar } from './segmentar';
import type { FuenteEntrada } from './tipos';

const fuente = (texto: string, extra: Partial<FuenteEntrada> = {}): FuenteEntrada => ({
  id: 'E1',
  tipo: 'entrevista',
  rol: 'Jefe de taller',
  modalidad: 'transcripcion',
  titulo: 'Entrevista 1',
  entrevistador: null,
  texto,
  ...extra,
});

describe('partirOraciones', () => {
  it('parte por punto, interrogación y exclamación en español', () => {
    expect(partirOraciones('Llegó tarde. ¿Por qué? No sé. ¡Otra vez!')).toEqual(['Llegó tarde.', '¿Por qué?', 'No sé.', '¡Otra vez!']);
  });

  it('parte en inglés', () => {
    expect(partirOraciones('It was late again. Why? I have no idea.')).toEqual(['It was late again.', 'Why?', 'I have no idea.']);
  });

  it('no parte decimales, abreviaturas ni iniciales', () => {
    expect(partirOraciones('Tarda 9.4 días. Lo dijo el Sr. Pérez con la Ing. Ruiz. Habló J. López.')).toEqual([
      'Tarda 9.4 días.',
      'Lo dijo el Sr. Pérez con la Ing. Ruiz.',
      'Habló J. López.',
    ]);
    expect(partirOraciones('Mr. Smith said so, e.g. the hinges. Then we stopped.')).toEqual(['Mr. Smith said so, e.g. the hinges.', 'Then we stopped.']);
  });

  it('respeta los puntos suspensivos y las comillas de apertura', () => {
    expect(partirOraciones('Pues… no sé. "Eso dijo." Y ya.')).toEqual(['Pues… no sé.', '"Eso dijo."', 'Y ya.']);
  });

  it('parte en trozos de hasta 30 palabras un texto sin puntuación, de preferencia en comas', () => {
    const palabras = Array.from({ length: 50 }, (_, i) => `p${i}`);
    palabras[19] = 'p19,';
    const partes = partirOraciones(palabras.join(' '));
    expect(partes).toHaveLength(2);
    expect(partes[0].endsWith('p19,')).toBe(true);
    expect(partes.every((p) => p.split(' ').length <= 30)).toBe(true);
    expect(partes.join(' ')).toBe(palabras.join(' '));
  });
});

describe('limpiarRepeticiones', () => {
  it('quita repeticiones inmediatas de una a tres palabras', () => {
    expect(limpiarRepeticiones('la ruta norte ruta norte se tardó porque porque sí')).toBe('la ruta norte se tardó porque sí');
  });

  it('no toca repeticiones separadas por puntuación', () => {
    expect(limpiarRepeticiones('no, no lo sé')).toBe('no, no lo sé');
  });
});

describe('segmentar', () => {
  it('parte turnos por etiqueta y detecta a la consultora', () => {
    const r = segmentar(fuente('Consultora: ¿Desde cuándo pasa? ¿Siempre?\nJefe de taller: Desde febrero. Antes no.\nConsultora: Gracias.'));
    expect(r.turnos.map((t) => [t.numero, t.hablante, t.esEntrevistador])).toEqual([
      [1, 'Consultora', true],
      [2, 'Jefe de taller', false],
      [3, 'Consultora', true],
    ]);
    expect(r.oraciones.map((o) => [o.id, o.turno, o.esEntrevistador, o.texto])).toEqual([
      ['E1-001', 1, true, '¿Desde cuándo pasa?'],
      ['E1-002', 1, true, '¿Siempre?'],
      ['E1-003', 2, false, 'Desde febrero.'],
      ['E1-004', 2, false, 'Antes no.'],
      ['E1-005', 3, true, 'Gracias.'],
    ]);
  });

  it('usa la etiqueta de entrevistador indicada', () => {
    const r = segmentar(fuente('Ana: ¿Qué pasó?\nLuis: Se atrasó.\nAna: ¿Cuánto?\nLuis: Dos días.', { entrevistador: 'Ana' }));
    expect(r.turnos.map((t) => t.esEntrevistador)).toEqual([true, false, true, false]);
  });

  it('une al turno anterior las líneas sin etiqueta', () => {
    const r = segmentar(fuente('Consultora: Cuénteme.\nJefe de taller: Pasa algo.\nY sigue pasando.'));
    expect(r.turnos).toHaveLength(2);
    expect(r.turnos[1].texto).toBe('Pasa algo. Y sigue pasando.');
  });

  it('no toma por etiqueta una frase con dos puntos que aparece una sola vez', () => {
    const r = segmentar(fuente('Consultora: Cuénteme.\nJefe de taller: Pasa algo.\nLo que le digo es esto: no llega.\nConsultora: Entiendo.'));
    expect(r.turnos.map((t) => t.hablante)).toEqual(['Consultora', 'Jefe de taller', 'Consultora']);
    expect(r.turnos[1].texto).toBe('Pasa algo. Lo que le digo es esto: no llega.');
  });

  it('trata un texto sin etiquetas como un solo hablante con el rol de la fuente', () => {
    const r = segmentar(fuente('Pedido 118. Recibido el 14 de marzo.', { id: 'D1', tipo: 'documento', rol: 'Registro de recepciones' }));
    expect(r.turnos).toEqual([{ numero: 1, hablante: 'Registro de recepciones', esEntrevistador: false, texto: 'Pedido 118. Recibido el 14 de marzo.' }]);
    expect(r.oraciones.map((o) => o.id)).toEqual(['D1-001', 'D1-002']);
  });

  it('en un documento no busca etiquetas de hablante', () => {
    const r = segmentar(fuente('Proveedor: Ferretera Lince.\nProveedor: Ferretera Lince.', { id: 'D1', tipo: 'documento', rol: 'Registro' }));
    expect(r.turnos).toHaveLength(1);
  });

  it('limpia repeticiones solo si se pide', () => {
    const texto = 'Consultora: ¿Y?\nJefe de taller: porque porque no llega.';
    expect(segmentar(fuente(texto)).oraciones[1].texto).toBe('porque porque no llega.');
    expect(segmentar(fuente(texto), { limpiarRepeticiones: true }).oraciones[1].texto).toBe('porque no llega.');
  });
});
