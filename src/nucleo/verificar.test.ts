import { describe, expect, it } from 'vitest';
import { segmentar } from './segmentar';
import type { FuenteEntrada, Previa } from './tipos';
import { verificar, type AfirmacionModelo } from './verificar';

const fuente: FuenteEntrada = {
  id: 'E2',
  tipo: 'entrevista',
  rol: 'Jefe de taller',
  modalidad: 'transcripcion',
  titulo: 'Entrevista 2',
  entrevistador: 'Consultora',
  texto: [
    'Consultora: ¿Desde cuándo se atrasan las entregas?',
    'Jefe de taller: Desde febrero esperamos el herraje nueve días. Antes llegaba en tres. Las mesas salen a tiempo.',
    'Consultora: ¿Y la gente?',
    'Jefe de taller: Dicen que el taller es flojo, pero no es cierto.',
    'Ayudante: Yo nunca he visto que falte gente.',
    'Ayudante: Eso sí.',
  ].join('\n'),
};
const { oraciones } = segmentar(fuente);
// E2-001 pregunta; E2-002 herraje; E2-003 antes; E2-004 mesas; E2-005 pregunta;
// E2-006 dicen que; E2-007 ayudante; E2-008 ayudante.
const previas: Previa[] = [
  { id: 'E3-A01', fuente: 'E3', rol: 'Encargada de compras', resumen: 'El proveedor cambió en febrero.' },
  { id: 'E2-A09', fuente: 'E2', rol: 'Jefe de taller', resumen: 'Otra de la misma entrevista.' },
];

const af = (extra: Partial<AfirmacionModelo>): AfirmacionModelo => ({
  oraciones: [{ id: 'E2-002', ancla: 'esperamos el herraje nueve días' }],
  resumen: 'El herraje tarda más desde febrero.',
  tema: 'herraje',
  tipo: 'testimonio_especifico',
  primera_mano: true,
  rasgos: [],
  corrobora: [],
  contradice: [],
  ...extra,
});

describe('verificar', () => {
  it('acepta un puntero válido y reconstruye la cita desde la fuente', () => {
    const r = verificar(fuente, oraciones, [af({ corrobora: ['E3-A01'] })], previas);
    expect(r.rechazos).toEqual([]);
    expect(r.afirmaciones).toHaveLength(1);
    const a = r.afirmaciones[0];
    expect(a).toMatchObject({
      id: 'E2-A01',
      fuente: 'E2',
      tipoFuente: 'entrevista',
      rol: 'Jefe de taller',
      hablante: 'Jefe de taller',
      turnos: [2],
      oraciones: ['E2-002'],
      cita: 'Desde febrero esperamos el herraje nueve días.',
      corrobora: ['E3-A01'],
    });
    expect(a.especificidad).toEqual(['febrero', 'nueve']);
  });

  it('une oraciones contiguas y marca el salto entre las que no lo son', () => {
    const r = verificar(fuente, oraciones, [af({ oraciones: [{ id: 'E2-004', ancla: 'mesas salen a tiempo' }, { id: 'E2-002', ancla: 'Desde febrero esperamos' }, { id: 'E2-003', ancla: 'antes llegaba en' }] })], previas);
    expect(r.afirmaciones[0].oraciones).toEqual(['E2-002', 'E2-003', 'E2-004']);
    expect(r.afirmaciones[0].cita).toBe('Desde febrero esperamos el herraje nueve días. Antes llegaba en tres. Las mesas salen a tiempo.');
    const salto = verificar(fuente, oraciones, [af({ oraciones: [{ id: 'E2-002', ancla: 'desde febrero esperamos' }, { id: 'E2-004', ancla: 'las mesas salen' }] })], previas);
    expect(salto.afirmaciones[0].cita).toBe('Desde febrero esperamos el herraje nueve días. […] Las mesas salen a tiempo.');
  });

  it('rechaza ids que no existen, preguntas del entrevistador y anclas que no coinciden', () => {
    const r = verificar(
      fuente,
      oraciones,
      [
        af({
          oraciones: [
            { id: 'E2-099', ancla: 'algo' },
            { id: 'E2-001', ancla: 'desde cuándo se atrasan' },
            { id: 'E2-003', ancla: 'llegaba en cinco días' },
            { id: 'E2-002', ancla: 'el herraje nueve' },
          ],
        }),
      ],
      previas,
    );
    expect(r.rechazos.map((x) => [x.afirmacion, x.motivo])).toEqual([
      [0, 'id_inexistente'],
      [0, 'oracion_del_entrevistador'],
      [0, 'ancla_no_coincide'],
    ]);
    expect(r.afirmaciones[0].oraciones).toEqual(['E2-002']);
  });

  it('pide un ancla de al menos tres palabras o la oración completa', () => {
    const r = verificar(fuente, oraciones, [af({ oraciones: [{ id: 'E2-002', ancla: 'herraje' }] }), af({ oraciones: [{ id: 'E2-008', ancla: 'eso sí' }] })], previas);
    expect(r.rechazos.map((x) => x.motivo)).toEqual(['ancla_no_coincide', 'sin_oraciones_validas']);
    expect(r.afirmaciones.map((a) => a.oraciones)).toEqual([['E2-008']]);
  });

  it('descarta una afirmación sin oraciones válidas o con hablantes distintos', () => {
    const r = verificar(
      fuente,
      oraciones,
      [af({ oraciones: [{ id: 'E2-001', ancla: '¿Desde cuándo se atrasan las entregas?' }] }), af({ oraciones: [{ id: 'E2-006', ancla: 'el taller es flojo' }, { id: 'E2-007', ancla: 'nunca he visto que' }] })],
      previas,
    );
    expect(r.afirmaciones).toEqual([]);
    expect(r.rechazos.map((x) => [x.afirmacion, x.motivo])).toEqual([
      [0, 'oracion_del_entrevistador'],
      [0, 'sin_oraciones_validas'],
      [1, 'hablantes_distintos'],
    ]);
  });

  it('quita referencias a afirmaciones desconocidas o de la misma fuente', () => {
    const r = verificar(fuente, oraciones, [af({ corrobora: ['E3-A01', 'E9-A01', 'E2-A09'], contradice: ['E3-A01', 'E3-A01'] })], previas);
    expect(r.afirmaciones[0].corrobora).toEqual(['E3-A01']);
    expect(r.afirmaciones[0].contradice).toEqual(['E3-A01']);
    expect(r.rechazos.map((x) => x.motivo)).toEqual(['referencia_invalida', 'referencia_invalida']);
  });

  it('rechaza una paráfrasis con una cifra que no está en la cita', () => {
    const r = verificar(fuente, oraciones, [af({ resumen: 'El herraje tarda 9.4 días.' })], previas);
    expect(r.afirmaciones).toEqual([]);
    expect(r.rechazos.map((x) => x.motivo)).toEqual(['cifra_sin_origen']);
  });

  it('no confunde coma y punto decimal al revisar las cifras', () => {
    const conDecimal = { ...fuente, texto: fuente.texto.replace('nueve días', '9.4 días') };
    const r = verificar(conDecimal, segmentar(conDecimal).oraciones, [af({ oraciones: [{ id: 'E2-002', ancla: 'esperamos el herraje 9.4' }], resumen: 'Tarda 9,4 días.' })], previas);
    expect(r.rechazos).toEqual([]);
  });

  it('agrega las alertas del léxico sobre la cita', () => {
    const r = verificar(fuente, oraciones, [af({ oraciones: [{ id: 'E2-006', ancla: 'dicen que el taller' }], tipo: 'opinion', resumen: 'Se dice que el taller es flojo.' })], previas);
    expect(r.afirmaciones[0].alertas.map((a) => a.tipo)).toEqual(['de_oidas']);
  });
});
