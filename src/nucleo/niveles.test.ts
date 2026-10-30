import { describe, expect, it } from 'vitest';
import { calcularNiveles, clavePar, NOMBRE_NIVEL } from './niveles';
import type { Afirmacion } from './tipos';

const af = (id: string, extra: Partial<Afirmacion> = {}): Afirmacion => ({
  id,
  fuente: id.split('-')[0],
  tipoFuente: 'entrevista',
  rol: 'Jefe de taller',
  modalidad: 'transcripcion',
  hablante: 'Jefe de taller',
  turnos: [2],
  oraciones: [`${id.split('-')[0]}-002`],
  cita: 'Desde febrero esperamos el herraje nueve días.',
  resumen: 'El herraje tarda más.',
  tema: 'herraje',
  tipo: 'testimonio_especifico',
  primeraMano: true,
  rasgos: [],
  alertas: [],
  especificidad: ['febrero', 'nueve'],
  corrobora: [],
  contradice: [],
  ...extra,
});

const nivel = (afs: Afirmacion[], confirmadas: string[] = []) => {
  const m = calcularNiveles(afs, new Set(confirmadas));
  return Object.fromEntries(afs.map((a) => [a.id, m.get(a.id)!.nivel]));
};

describe('nivel de una afirmación sola', () => {
  it('testimonio específico de primera mano con un dato concreto: N2', () => {
    expect(nivel([af('E2-A01')])).toEqual({ 'E2-A01': 2 });
  });

  it('opinión: N1', () => {
    expect(nivel([af('E1-A01', { tipo: 'opinion', especificidad: [] })])).toEqual({ 'E1-A01': 1 });
  });

  it('de oídas, por el modelo o por el léxico: N1', () => {
    expect(nivel([af('E1-A01', { primeraMano: false }), af('E1-A02', { alertas: [{ tipo: 'de_oidas', marcador: 'dicen que' }] })])).toEqual({ 'E1-A01': 1, 'E1-A02': 1 });
  });

  it('testimonio concreto sin cifras ni fechas: sigue en N2', () => {
    expect(nivel([af('E2-A01', { cita: 'Las mesas de comedor salen en su fecha.', especificidad: [] })])).toEqual({ 'E2-A01': 2 });
  });

  it('testimonio que generaliza sin un dato concreto: N1 con la razón', () => {
    const m = calcularNiveles([af('E1-A01', { especificidad: [], alertas: [{ tipo: 'generalizacion', marcador: 'siempre' }] })], new Set());
    expect(m.get('E1-A01')!.nivel).toBe(1);
    expect(m.get('E1-A01')!.razones.join(' ')).toMatch(/generaliza.*siempre/);
    expect(nivel([af('E1-A02', { alertas: [{ tipo: 'generalizacion', marcador: 'nunca' }] })])).toEqual({ 'E1-A02': 2 });
  });

  it('"todos" en un testimonio concreto no lo baja de N2', () => {
    expect(nivel([af('E2-A01', { especificidad: [], alertas: [{ tipo: 'generalizacion', marcador: 'Todos' }] })])).toEqual({ 'E2-A01': 2 });
  });

  it('registro documental con dato concreto: N4; sin dato: N1', () => {
    const doc = { tipoFuente: 'documento' as const, rol: 'Registro de recepciones' };
    expect(nivel([af('D1-A01', doc), af('D1-A02', { ...doc, especificidad: [] })])).toEqual({ 'D1-A01': 4, 'D1-A02': 1 });
  });

  it('nombra los niveles sin decir "verificado"', () => {
    expect(NOMBRE_NIVEL).toEqual({ 0: 'sin explorar', 1: 'opinión', 2: 'testimonio específico', 3: 'corroborado entre roles', 4: 'documentado' });
  });
});

describe('corroboración entre roles', () => {
  const jefe = af('E2-A01', { corrobora: ['E3-A02'] });
  const compras = af('E3-A02', { rol: 'Encargada de compras', hablante: 'Encargada de compras' });
  const par = clavePar('E3-A02', 'E2-A01');

  it('la clave del par no depende del orden', () => {
    expect(par).toBe('E2-A01|E3-A02');
    expect(clavePar('E2-A01', 'E3-A02')).toBe(par);
  });

  it('propone el par y no sube de N2 sin la confirmación del consultor', () => {
    const m = calcularNiveles([jefe, compras], new Set());
    expect(m.get('E2-A01')).toMatchObject({ nivel: 2, pendientes: [par] });
    expect(m.get('E3-A02')).toMatchObject({ nivel: 2, pendientes: [par] });
    expect(m.get('E2-A01')!.razones.at(-1)).toBe('1 corroboración propuesta espera la confirmación del consultor');
  });

  it('resume en una sola razón varias corroboraciones pendientes', () => {
    const m = calcularNiveles([af('E2-A01', { corrobora: ['E3-A02', 'E4-A01'] }), compras, af('E4-A01', { rol: 'Ventas' })], new Set());
    expect(m.get('E2-A01')!.razones.filter((r) => /propuesta/.test(r))).toEqual(['2 corroboraciones propuestas esperan la confirmación del consultor']);
  });

  it('con la confirmación, las dos quedan en N3', () => {
    const m = calcularNiveles([jefe, compras], new Set([par]));
    expect(m.get('E2-A01')).toMatchObject({ nivel: 3, pendientes: [] });
    expect(m.get('E3-A02')!.nivel).toBe(3);
    expect(m.get('E2-A01')!.razones.join(' ')).toMatch(/E3-A02/);
  });

  it('no cuenta si el rol es el mismo, aunque se confirme', () => {
    const otroJefe = af('E3-A02', { rol: ' jefe de  TALLER ' });
    expect(nivel([jefe, otroJefe], [par])).toEqual({ 'E2-A01': 2, 'E3-A02': 2 });
    expect(calcularNiveles([jefe, otroJefe], new Set()).get('E2-A01')!.pendientes).toEqual([]);
  });

  it('no cuenta si la otra afirmación es opinión o de oídas', () => {
    expect(nivel([jefe, af('E3-A02', { rol: 'Dueña', tipo: 'opinion' })], [par])).toEqual({ 'E2-A01': 2, 'E3-A02': 1 });
    expect(nivel([jefe, af('E3-A02', { rol: 'Dueña', primeraMano: false })], [par])).toEqual({ 'E2-A01': 2, 'E3-A02': 1 });
  });

  it('no cuenta dentro de la misma fuente', () => {
    expect(nivel([af('E2-A01', { corrobora: ['E2-A02'] }), af('E2-A02', { rol: 'Ayudante' })], [clavePar('E2-A01', 'E2-A02')])).toEqual({ 'E2-A01': 2, 'E2-A02': 2 });
  });

  it('un documento con dato concreto lleva a N4 el testimonio que corrobora, con confirmación', () => {
    const doc = af('D1-A01', { tipoFuente: 'documento', rol: 'Registro de recepciones', corrobora: ['E2-A01'] });
    const clave = clavePar('D1-A01', 'E2-A01');
    expect(nivel([af('E2-A01'), doc])).toEqual({ 'E2-A01': 2, 'D1-A01': 4 });
    expect(nivel([af('E2-A01'), doc], [clave])).toEqual({ 'E2-A01': 4, 'D1-A01': 4 });
  });

  it('ignora referencias a afirmaciones que no están', () => {
    expect(nivel([af('E2-A01', { corrobora: ['E9-A01'] })], [clavePar('E2-A01', 'E9-A01')])).toEqual({ 'E2-A01': 2 });
  });

  it('con una sola fuente nada pasa de N2', () => {
    const afs = [af('E2-A01', { corrobora: ['E2-A02'] }), af('E2-A02', { rol: 'Otro' })];
    const m = calcularNiveles(afs, new Set([clavePar('E2-A01', 'E2-A02')]));
    expect(Math.max(...[...m.values()].map((n) => n.nivel))).toBe(2);
  });
});

describe('contradicciones', () => {
  it('marca a las dos afirmaciones sin cambiar su nivel', () => {
    const m = calcularNiveles([af('E1-A01', { contradice: ['E2-A01'], tipo: 'opinion', especificidad: [] }), af('E2-A01')], new Set());
    expect(m.get('E1-A01')).toMatchObject({ nivel: 1, contradicha: true });
    expect(m.get('E2-A01')).toMatchObject({ nivel: 2, contradicha: true });
  });
});
