import { describe, expect, it } from 'vitest';
import { validarCaso } from './validar';
import type { CasoCrudo, ParametrosLaboratorio } from './tipos';

const PARAMS: ParametrosLaboratorio = { giro: 'taller ficticio', tamano: 'micro', sintoma: 'los pedidos llegan tarde', distractores: 1, documentoClave: true };

function crudoBase(): CasoCrudo {
  return {
    id: 'lab-prueba',
    empresa: { nombre: 'Empresa Ficticia', descripcion: 'Empresa inventada con pedidos que llegan tarde.' },
    objetivo: 'Entender por qué los pedidos llegan tarde.',
    personas: [
      { rol: 'Operaria', presentacion: 'Trabaja en producción.' },
      { rol: 'Encargada', presentacion: 'Lleva los registros.' },
    ],
    documentos: [{ titulo: 'Registro de pedidos', esClave: true }],
    causa: {
      enunciado: 'El insumo clave llega con una semana de retraso.',
      mecanismo: 'El proveedor nuevo despacha cada semana en vez de cada dos días.',
      marcadores: ['insumo clave con retraso', 'despacha cada semana', 'proveedor nuevo lento'],
      duenos: ['Operaria', 'Registro de pedidos'],
    },
    distractores: [{ enunciado: 'La gente trabaja despacio', porQueEngana: 'Es lo que se dice en el pasillo.' }],
    hechos: [
      { tipo: 'sintoma', texto: 'Todos los días quedan pedidos sin terminar.', dueno: 'Operaria', revelacion: 'siempre', distractor: null, terminos: ['pedidos sin terminar', 'todos los días'] },
      { tipo: 'causa', texto: 'El insumo clave con retraso nos deja parados porque el proveedor nuevo lento despacha cada semana.', dueno: 'Operaria', revelacion: 'incidente', distractor: null, terminos: ['insumo clave', 'despacha cada semana'] },
      { tipo: 'causa', texto: 'El registro muestra que el insumo clave con retraso se despacha cada semana desde febrero.', dueno: 'Registro de pedidos', revelacion: 'documental', distractor: null, terminos: ['registro de pedidos', 'desde febrero'] },
      { tipo: 'sintoma', texto: 'Yo veo la fila de pedidos crecer cada semana.', dueno: 'Encargada', revelacion: 'siempre', distractor: null, terminos: ['fila de pedidos', 'crecer cada semana'] },
      { tipo: 'distractor', texto: 'Para mí la gente trabaja despacio desde que cambió el turno.', dueno: 'Encargada', revelacion: 'siempre', distractor: 'La gente trabaja despacio', terminos: ['trabaja despacio', 'cambió el turno'] },
    ],
  };
}

describe('validarCaso', () => {
  it('acepta un caso válido y asigna ids estables', () => {
    const r = validarCaso(crudoBase(), PARAMS);
    if ('errores' in r) throw new Error(r.errores.join(' '));
    expect(r.verdad.hechos.map((h) => h.id)).toEqual(['H01', 'H02', 'H03', 'H04', 'H05']);
    expect(r.caso.personas.map((p) => p.id)).toEqual(['P1', 'P2']);
    expect(r.verdad.duenosCausa).toEqual(['P1', 'D1']);
    expect(r.verdad.documentoClave).toBe('D1');
    expect(r.caso.documentos[0].disponible).toBe(false);
  });

  it('rechaza un hecho de causa en una persona no designada', () => {
    const c = crudoBase();
    c.hechos.push({ tipo: 'causa', texto: 'Yo también sé que el insumo clave con retraso tarda mucho.', dueno: 'Encargada', revelacion: 'incidente', distractor: null, terminos: ['yo también sé', 'tarda mucho'] });
    const r = validarCaso(c, PARAMS);
    expect('errores' in r && r.errores.join(' ')).toContain('no designado');
  });

  it('rechaza un marcador de la causa colado en un hecho ajeno', () => {
    const c = crudoBase();
    c.hechos[4].texto = 'La gente trabaja despacio y además el insumo clave con retraso no es mi tema.';
    const r = validarCaso(c, PARAMS);
    expect('errores' in r && r.errores.join(' ')).toContain('marcador');
  });

  it('rechaza menos distractores de los pedidos', () => {
    const r = validarCaso(crudoBase(), { ...PARAMS, distractores: 3 });
    expect('errores' in r && r.errores.join(' ')).toContain('distractores');
  });

  it('rechaza documento clave sin hecho de causa', () => {
    const c = crudoBase();
    c.hechos = c.hechos.filter((h) => h.dueno !== 'Registro de pedidos');
    const r = validarCaso(c, PARAMS);
    expect('errores' in r && r.errores.join(' ')).toContain('documento clave');
  });

  it('rechaza término compartido entre causa y distractor', () => {
    const c = crudoBase();
    c.hechos[4].terminos = ['trabaja despacio', 'insumo clave'];
    const r = validarCaso(c, PARAMS);
    expect('errores' in r && r.errores.join(' ')).toContain('compartido');
  });

  it('descarta hechos con revelación nunca y lo registra', () => {
    const c = crudoBase();
    c.hechos.push({ tipo: 'contexto', texto: 'Esto jamás debe salir.', dueno: 'Operaria', revelacion: 'nunca', distractor: null, terminos: ['jamás debe', 'salir nunca'] });
    const r = validarCaso(c, PARAMS);
    if ('errores' in r) throw new Error(r.errores.join(' '));
    expect(r.verdad.hechos.some((h) => h.texto.includes('jamás'))).toBe(false);
    expect(r.avisos.join(' ')).toContain('nunca');
  });
});
