import { describe, expect, it } from 'vitest';
import { datosEspecificos, detectarAlertas } from './lexico';

const tipos = (t: string) => detectarAlertas(t).map((a) => `${a.tipo}:${a.marcador}`);

describe('detectarAlertas', () => {
  it('marca generalizaciones en español e inglés', () => {
    expect(tipos('El taller nunca cumple, siempre es lo mismo.')).toEqual(['generalizacion:nunca', 'generalizacion:siempre']);
    expect(tipos('Everyone knows they are always late.')).toEqual(['generalizacion:Everyone', 'generalizacion:always']);
  });

  it('marca lo dicho de oídas', () => {
    expect(tipos('Dicen que el proveedor quebró.')).toEqual(['de_oidas:Dicen que']);
    expect(tipos('I heard the supplier changed.')).toEqual(['de_oidas:I heard']);
  });

  it('marca recencia y atribución a otra área', () => {
    expect(tipos('La semana pasada fue culpa de los de ventas.')).toEqual(['recencia:La semana pasada', 'atribucion_externa:culpa de', 'atribucion_externa:los de ventas']);
    expect(tipos("Lately it's their fault.")).toEqual(['recencia:Lately', "atribucion_externa:it's their fault"]);
    expect(tipos('I’ve heard it’s their fault.')).toEqual(['de_oidas:I’ve heard', 'atribucion_externa:it’s their fault']);
  });

  it('ignora acentos y mayúsculas, pero no partes de palabras', () => {
    expect(tipos('JAMAS pasó eso.')).toEqual(['generalizacion:JAMAS']);
    expect(tipos('Los todoterreno y el nadador llegaron.')).toEqual([]);
  });

  it('no repite el mismo marcador', () => {
    expect(tipos('Nunca, nunca llega.')).toEqual(['generalizacion:Nunca']);
  });
});

describe('datosEspecificos', () => {
  it('encuentra cifras, porcentajes, meses, días y plazos', () => {
    expect(datosEspecificos('Desde febrero el herraje tarda 9.4 días, un 30 % más; el lunes faltaron dos cajas.')).toEqual([
      'febrero',
      '9.4',
      '30 %',
      'lunes',
      'dos',
    ]);
  });

  it('cuenta "once" y "la última semana" en español', () => {
    expect(datosEspecificos('En la última semana tenía once muebles parados.')).toEqual(['la última semana', 'once']);
  });

  it('encuentra referencias de tiempo concretas en inglés', () => {
    expect(datosEspecificos('Since March, three orders last week.')).toEqual(['March', 'three', 'last week']);
  });

  it('no encuentra nada en una opinión general', () => {
    expect(datosEspecificos('El taller es flojo y no le echa ganas.')).toEqual([]);
  });
});
