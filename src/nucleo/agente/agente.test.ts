import { describe, expect, it } from 'vitest';
import { clavePar } from '../niveles';
import type { Afirmacion, FuenteEntrada } from '../tipos';
import { aplicarCausas, aplicarDesviacion, aplicarEsNoEs, aplicarJuicios, aplicarRelaciones, aplicarWeisbord, type CasillaModelo } from './aplicar';
import { criterioDeParo, esperaDelConsultor, evaluarCausas } from './criterio';
import { crearEstado, firmaDe, invalidarDesde, nivelesDe, vistaDe } from './estado';
import { revisarDecision } from './guardas';
import { seleccionar } from './seleccion';
import type { Decision, Desviacion, EstadoAgente } from './tipos';

const fuente = (id: string, rol: string, tipo: FuenteEntrada['tipo'] = 'entrevista'): FuenteEntrada => ({
  id,
  tipo,
  rol,
  modalidad: 'transcripcion',
  titulo: id,
  entrevistador: null,
  texto: 'x',
});

const afirmacion = (id: string, rol: string, x: Partial<Afirmacion> = {}): Afirmacion => ({
  id,
  fuente: id.split('-')[0],
  tipoFuente: id.startsWith('D') ? 'documento' : 'entrevista',
  rol,
  modalidad: 'transcripcion',
  hablante: rol,
  turnos: [1],
  oraciones: [`${id.split('-')[0]}-001`],
  cita: 'cita',
  resumen: 'resumen',
  tema: 'tema',
  tipo: 'testimonio_especifico',
  primeraMano: true,
  rasgos: [],
  alertas: [],
  especificidad: ['9.4 días'],
  corrobora: [],
  contradice: [],
  ...x,
});

const c = (texto: string, ...evidencia: string[]): CasillaModelo => ({ texto, evidencia });

// Caso mínimo inspirado en el taller: dueña (opinión), jefe de taller (N2) y un registro (N4).
function base(): EstadoAgente {
  const e = crearEstado({
    id: 'a1',
    titulo: 'Taller',
    objetivo: 'Entender los atrasos',
    fuentes: [fuente('E1', 'Dueña'), fuente('E2', 'Jefe de taller'), fuente('D1', 'Registro', 'documento')],
  });
  for (const id of ['E1', 'E2', 'D1']) e.lecturas[id] = { turnos: [], oraciones: [], rechazos: [], costoUsd: 0, ms: 0, demo: false };
  e.afirmaciones = [
    afirmacion('E1-A01', 'Dueña', { tipo: 'opinion', especificidad: [] }), // el taller es flojo
    afirmacion('E2-A01', 'Jefe de taller'), // desde marzo se atrasan
    afirmacion('E2-A02', 'Jefe de taller'), // closets esperan herraje
    afirmacion('E2-A03', 'Jefe de taller'), // mesas sin herraje salen a tiempo
    afirmacion('D1-A01', 'Registro'), // Brevánez 9.4 días contra 3.1
  ];
  return e;
}

const desviacion = (x: Partial<Record<'desde' | 'contraste', CasillaModelo>> = {}) => ({
  esperado: c('Entregar en la fecha prometida', 'E2-A01'),
  ocurre: c('Closets y cómodas salen tarde', 'E2-A02'),
  desde_cuando: x.desde ?? c('Desde marzo', 'E2-A01'),
  cuanto: c('', ),
  contraste: x.contraste ?? c('Las mesas salen a tiempo', 'E2-A03'),
  ambito: 'operacion_fisica' as const,
});

const decision = (accion: Decision['accion'], x: Partial<Decision> = {}): Decision => ({
  accion,
  fuentes: [],
  causa: null,
  documento: '',
  justificacion: '',
  punteros: [],
  ...x,
});

// Lleva el caso hasta causas probadas: C1 herraje (N4) explica todo, C2 personal (N1) descartada.
function probado(): EstadoAgente {
  const e = base();
  e.desviacion = aplicarDesviacion(e, desviacion()).desviacion;
  e.seleccion = seleccionar(e.desviacion);
  e.esNoEs = aplicarEsNoEs(e, [
    { dimension: 'que', pregunta: 'Qué muebles', es: c('Closets', 'E2-A02'), no_es: c('Mesas', 'E2-A03'), distincion: c('Llevan herraje', 'E2-A03'), cambio: c('Proveedor nuevo', 'D1-A01') },
    { dimension: 'cuando', pregunta: 'Desde cuándo', es: c('Desde marzo', 'E2-A01'), no_es: c('Antes de febrero', 'D1-A01'), distincion: c('', ), cambio: c('', ) },
  ]).esNoEs;
  e.causas = aplicarCausas(
    e,
    [
      { enunciado: 'El herraje del proveedor nuevo tarda 9.4 días', espina: 'materiales', origen: ['R1'], evidencia: ['D1-A01'] },
      { enunciado: 'El personal es flojo', espina: 'mano_de_obra', origen: [], evidencia: ['E1-A01'] },
    ],
    ['R1', 'R2'],
  ).causas;
  e.juicios = aplicarJuicios(
    e,
    [
      { causa: 'C1', fila: 'R1', veredicto: 'explica', razon: 'solo lo que lleva herraje', evidencia: ['E2-A02', 'E2-A03'] },
      { causa: 'C1', fila: 'R2', veredicto: 'explica', razon: 'cambio en febrero', evidencia: ['D1-A01'] },
      { causa: 'C2', fila: 'R1', veredicto: 'no_explica', razon: 'las mesas salen', evidencia: ['E2-A03'] },
      { causa: 'C2', fila: 'R2', veredicto: 'sin_datos', razon: '', evidencia: [] },
    ],
    ['R1', 'R2'],
  ).juicios;
  return e;
}

describe('regla de selección', () => {
  it('con fecha de inicio y contraste elige la ruta aguda y las 6M en una operación física', () => {
    const e = base();
    const s = seleccionar(aplicarDesviacion(e, desviacion()).desviacion);
    expect(s.ruta).toBe('aguda');
    expect(s.espinas).toBe('seis_m');
    expect(s.herramientas.filter((h) => h.elegida).map((h) => h.herramienta)).toEqual(['es_no_es', 'ishikawa']);
    expect(s.herramientas).toHaveLength(6);
  });

  it('sin contraste elige la ruta crónica con Weisbord', () => {
    const e = base();
    const d: Desviacion = { ...aplicarDesviacion(e, desviacion({ contraste: c('') })).desviacion, ambito: 'organizacional' };
    const s = seleccionar(d);
    expect(s.ruta).toBe('cronica');
    expect(s.espinas).toBe('weisbord');
    expect(s.herramientas.filter((h) => h.elegida).map((h) => h.herramienta)).toEqual(['ishikawa', 'weisbord']);
  });
});

describe('aplicar salidas del modelo', () => {
  it('vacía la casilla que no señala evidencia y la que apunta a una afirmación inexistente', () => {
    const e = base();
    const { desviacion: d, rechazos } = aplicarDesviacion(e, desviacion({ desde: c('Desde marzo'), contraste: c('Mesas', 'E9-A01') }));
    expect(d.desdeCuando).toEqual({ texto: '', evidencia: [] });
    expect(d.contraste).toEqual({ texto: '', evidencia: [] });
    expect(rechazos.map((r) => r.motivo)).toEqual(['casilla_sin_evidencia', 'evidencia_ajena', 'casilla_sin_evidencia']);
  });

  it('descarta filas del Es/No Es sin lo que es y numera las que quedan', () => {
    const e = base();
    const { esNoEs } = aplicarEsNoEs(e, [
      { dimension: 'que', pregunta: 'Qué', es: c('Closets'), no_es: c('Mesas', 'E2-A03'), distincion: c(''), cambio: c('') },
      { dimension: 'donde', pregunta: 'Dónde', es: c('En armado', 'E2-A02'), no_es: c(''), distincion: c(''), cambio: c('') },
    ]);
    expect(esNoEs.map((f) => [f.id, f.dimension])).toEqual([['R1', 'donde']]);
  });

  it('una casilla de Weisbord vacía queda sin datos aunque el modelo diga brecha', () => {
    const e = base();
    const { weisbord, rechazos } = aplicarWeisbord(e, [
      { casilla: 'estructura', estado: 'brecha', hallazgo: c('Compras decide sola') },
      { casilla: 'liderazgo', estado: 'brecha', hallazgo: c('La dueña culpa al taller', 'E1-A01') },
    ]);
    // Siempre salen las seis casillas; las omitidas quedan sin datos.
    expect(weisbord).toHaveLength(6);
    expect(weisbord.slice(0, 2).map((h) => [h.id, h.estado])).toEqual([
      ['W-estructura', 'sin_datos'],
      ['W-liderazgo', 'brecha'],
    ]);
    expect(weisbord.slice(2).every((h) => h.estado === 'sin_datos' && h.hallazgo.texto === '')).toBe(true);
    expect(rechazos[0].motivo).toBe('casilla_sin_evidencia');
  });

  it('rechaza la causa que no muestra que el hecho ocurrió', () => {
    const e = base();
    const { causas, rechazos } = aplicarCausas(e, [{ enunciado: 'La sierra', espina: 'maquinaria', origen: ['R9'], evidencia: [] }, { enunciado: 'Herraje', espina: 'materiales', origen: ['R1', 'R9'], evidencia: ['D1-A01'] }], ['R1']);
    expect(causas).toEqual([{ id: 'C1', enunciado: 'Herraje', espina: 'materiales', origen: ['R1'], evidencia: ['D1-A01'] }]);
    expect(rechazos[0].motivo).toBe('causa_sin_evidencia');
  });

  it('un juicio de la prueba sin evidencia cuenta como sin datos', () => {
    const e = probado();
    const { juicios, rechazos } = aplicarJuicios(e, [{ causa: 'C2', fila: 'R1', veredicto: 'explica', razon: 'porque sí', evidencia: [] }], ['R1']);
    expect(juicios[0].veredicto).toBe('sin_datos');
    expect(rechazos[0].motivo).toBe('juicio_sin_evidencia');
  });

  it('una contradicción gana a una corroboración del mismo par', () => {
    const e = base();
    const { afirmaciones, rechazos } = aplicarRelaciones(
      e.afirmaciones,
      [
        { a: 'E2-A02', b: 'D1-A01', tipo: 'corrobora' },
        { a: 'D1-A01', b: 'E2-A02', tipo: 'contradice' },
      ],
      new Set(['E2-A02']),
    );
    const por = new Map(afirmaciones.map((a) => [a.id, a]));
    expect(por.get('E2-A02')!.corrobora).toEqual([]);
    expect(por.get('D1-A01')!.contradice).toEqual(['E2-A02']);
    expect(rechazos.map((x) => x.motivo)).toEqual(['relacion_invalida']);
  });

  it('corroboraciones: rechaza la misma fuente y no duplica pares', () => {
    const e = base();
    const { afirmaciones, rechazos } = aplicarRelaciones(
      e.afirmaciones,
      [
        { a: 'E2-A01', b: 'E2-A02', tipo: 'corrobora' },
        { a: 'E2-A02', b: 'D1-A01', tipo: 'corrobora' },
        { a: 'D1-A01', b: 'E2-A02', tipo: 'corrobora' },
        { a: 'E1-A01', b: 'E2-A03', tipo: 'contradice' },
      ],
      new Set(['E2-A01', 'E2-A02', 'E2-A03']),
    );
    const por = new Map(afirmaciones.map((a) => [a.id, a]));
    expect(por.get('E2-A02')!.corrobora).toEqual(['D1-A01']);
    expect(por.get('D1-A01')!.corrobora).toEqual([]);
    expect(por.get('E1-A01')!.contradice).toEqual(['E2-A03']);
    expect(rechazos.map((r) => r.motivo)).toEqual(['relacion_invalida']);
    expect(e.afirmaciones[1].corrobora).toEqual([]); // no muta la entrada
  });
});

describe('evaluación de causas y criterio de paro', () => {
  it('la causa documentada que explica todo es la principal; la opinión queda descartada', () => {
    const e = probado();
    const causas = evaluarCausas(e, nivelesDe(e));
    expect(causas.map((x) => [x.id, x.nivel, x.estado, x.principal])).toEqual([
      ['C1', 4, 'explica_todo', true],
      ['C2', 1, 'descartada', false],
    ]);
    const criterio = criterioDeParo(e, causas);
    expect(criterio.faltantes).toEqual([]);
    expect(criterio).toMatchObject({ cumplido: true, principal: 'C1' });
  });

  it('una principal con N2 no basta: falta corroborarla', () => {
    const e = probado();
    e.causas[0].evidencia = ['E2-A02'];
    const v = vistaDe(e, { sesionUsd: 0, globalUsd: 0, llamadasSesion: 0 });
    expect(v.criterio.cumplido).toBe(false);
    expect(v.criterio.principal).toBeNull();
    expect(v.criterio.faltantes.join(' ')).toContain('C1 tiene N2');
  });

  it('la confirmación del consultor sube la evidencia a N3 y cumple el criterio', () => {
    const e = probado();
    e.causas[0].evidencia = ['E2-A02'];
    e.afirmaciones = e.afirmaciones.map((a) => (a.id === 'E2-A02' ? { ...a, corrobora: ['E1-A02'] } : a));
    e.afirmaciones.push(afirmacion('E1-A02', 'Dueña'));
    expect(vistaDe(e, { sesionUsd: 0, globalUsd: 0, llamadasSesion: 0 }).criterio.cumplido).toBe(false);
    e.confirmadas = [clavePar('E2-A02', 'E1-A02')];
    expect(vistaDe(e, { sesionUsd: 0, globalUsd: 0, llamadasSesion: 0 }).criterio.cumplido).toBe(true);
  });

  it('una causa abierta sin verificación impide terminar', () => {
    const e = probado();
    e.juicios = e.juicios.filter((j) => !(j.causa === 'C2' && j.veredicto === 'no_explica'));
    const causas = evaluarCausas(e, nivelesDe(e));
    expect(causas[1].estado).toBe('incompleta');
    expect(criterioDeParo(e, causas).faltantes).toContain('Falta descartar o diseñar la verificación de: C2');
    e.verificaciones.push({ causa: 'C2', queRevisar: 'x', conQuien: 'x', confirmaSi: 'x', descartaSi: 'x' });
    expect(criterioDeParo(e, evaluarCausas(e, nivelesDe(e))).cumplido).toBe(true);
  });

  it('una contradicción de igual o mayor peso queda abierta; una opinión contra un documento no', () => {
    const e = probado();
    e.afirmaciones = e.afirmaciones.map((a) => (a.id === 'E1-A01' ? { ...a, contradice: ['D1-A01'] } : a));
    expect(evaluarCausas(e, nivelesDe(e))[0].contradicciones).toEqual([]);
    e.afirmaciones.push(afirmacion('D2-A01', 'Otro registro', { contradice: ['D1-A01'] }));
    expect(evaluarCausas(e, nivelesDe(e))[0].contradicciones).toEqual(['D1-A01']);
  });
});

describe('rehacer un paso del método', () => {
  it('rehacer la especificación borra causas y juicios y permite generarlas de nuevo', () => {
    const e = probado();
    e.hechas.push({ firma: 'especificar_es_no_es', leidas: 3 }, { firma: 'generar_causas', leidas: 3 }, { firma: 'leer_fuentes:E1,E2,D1', leidas: 3 });
    invalidarDesde(e, 'causas');
    expect([e.causas, e.juicios, e.verificaciones]).toEqual([[], [], []]);
    expect(e.esNoEs).toHaveLength(2);
    expect(e.hechas.map((h) => h.firma)).toEqual(['especificar_es_no_es', 'leer_fuentes:E1,E2,D1']);
    invalidarDesde(e, 'especificacion');
    expect(e.esNoEs).toBeNull();
    expect(e.hechas.map((h) => h.firma)).toEqual(['leer_fuentes:E1,E2,D1']);
  });
});

describe('guardas', () => {
  const revisar = (e: EstadoAgente, d: Decision) => revisarDecision(e, d, evaluarCausas(e, nivelesDe(e)));

  it('no deja especificar el Es/No Es antes de enunciar la desviación', () => {
    expect(revisar(base(), decision('especificar_es_no_es'))).toMatchObject({ ok: false, motivo: 'fase_previa' });
  });

  it('no deja aplicar una herramienta que la regla no eligió', () => {
    const e = base();
    e.desviacion = aplicarDesviacion(e, desviacion()).desviacion;
    e.seleccion = seleccionar(e.desviacion);
    expect(revisar(e, decision('barrer_weisbord'))).toMatchObject({ ok: false, motivo: 'herramienta_no_elegida' });
    expect(revisar(e, decision('especificar_es_no_es'))).toEqual({ ok: true });
  });

  it('con N1 o N2 solo admite verificación; con N4 admite intervención', () => {
    const e = probado();
    e.juicios = e.juicios.map((j) => (j.causa === 'C2' ? { ...j, veredicto: 'explica', evidencia: ['E1-A01'] } : j));
    expect(revisar(e, decision('proponer_intervencion', { causa: 'C2' }))).toMatchObject({ ok: false, motivo: 'nivel_insuficiente' });
    expect(revisar(e, decision('disenar_verificacion', { causa: 'C2' }))).toEqual({ ok: true });
    expect(revisar(e, decision('proponer_intervencion', { causa: 'C1' }))).toEqual({ ok: true });
  });

  it('no repite una acción si no hay fuentes nuevas desde entonces', () => {
    const e = probado();
    e.hechas.push({ firma: firmaDe(decision('generar_causas')), leidas: 3 });
    expect(revisar(e, decision('generar_causas'))).toMatchObject({ ok: false, motivo: 'repetida' });
    e.hechas[0].leidas = 2;
    expect(revisar(e, decision('generar_causas'))).toEqual({ ok: true });
  });

  it('una especificación vacía no deja generar causas', () => {
    const e = base();
    e.desviacion = aplicarDesviacion(e, desviacion()).desviacion;
    e.seleccion = seleccionar(e.desviacion);
    e.esNoEs = [];
    expect(revisar(e, decision('generar_causas'))).toMatchObject({ ok: false, motivo: 'fase_previa' });
  });

  it('no deja leer una fuente ya leída ni una que no existe', () => {
    const e = base();
    expect(revisar(e, decision('leer_fuentes', { fuentes: ['E1'] }))).toMatchObject({ ok: false, motivo: 'repetida' });
    expect(revisar(e, decision('leer_fuentes', { fuentes: ['E7'] }))).toMatchObject({ ok: false, motivo: 'parametro_invalido' });
  });

  it('no deja detenerse antes de cumplir el criterio de paro', () => {
    const r = revisar(base(), decision('detenerse'));
    expect(r).toMatchObject({ ok: false, motivo: 'criterio_no_cumplido' });
    expect(revisar(probado(), decision('detenerse'))).toEqual({ ok: true });
  });

  it('acepta detenerse como entrega parcial solo si lo que falta depende del consultor', () => {
    const e = probado();
    e.causas[0].evidencia = ['E2-A02']; // C1 queda en N2
    expect(revisar(e, decision('detenerse'))).toMatchObject({ ok: false, motivo: 'criterio_no_cumplido' });
    // Una corroboración propuesta con otro rol: el consultor puede confirmarla.
    e.afirmaciones = e.afirmaciones.map((a) => (a.id === 'E2-A02' ? { ...a, corrobora: ['E1-A02'] } : a));
    e.afirmaciones.push(afirmacion('E1-A02', 'Dueña'));
    const causas = evaluarCausas(e, nivelesDe(e));
    expect(esperaDelConsultor(e, causas, nivelesDe(e), criterioDeParo(e, causas))).toEqual(['Confirmar la corroboración E1-A02 con E2-A02']);
    expect(revisar(e, decision('detenerse'))).toEqual({ ok: true });
    // Si además falta probar una causa, ya no depende solo del consultor.
    e.juicios = e.juicios.filter((j) => j.causa !== 'C2');
    expect(revisar(e, decision('detenerse'))).toMatchObject({ ok: false, motivo: 'criterio_no_cumplido' });
  });

  it('acepta la entrega parcial con la desviación incompleta si ya pidió un documento', () => {
    const e = probado();
    e.causas[0].evidencia = ['E2-A02']; // C1 queda en N2
    e.desviacion!.esperado = { texto: '', evidencia: [] };
    expect(revisar(e, decision('detenerse'))).toMatchObject({ ok: false, motivo: 'criterio_no_cumplido' });
    // Sin fuentes nuevas no puede volver a enunciar: solo el documento pedido lo destraba.
    e.solicitudes.push({ id: 'S1', descripcion: 'Registro de citas', motivo: 'subir C1 a N4' });
    expect(revisar(e, decision('detenerse'))).toEqual({ ok: true });
  });

  it('no diseña verificación de una causa sin probar ni de una descartada', () => {
    const e = probado();
    expect(revisar(e, decision('disenar_verificacion', { causa: 'C2' }))).toMatchObject({ ok: false, motivo: 'parametro_invalido' });
    e.juicios = [];
    expect(revisar(e, decision('disenar_verificacion', { causa: 'C1' }))).toMatchObject({ ok: false, motivo: 'fase_previa' });
  });

  it('pedir un documento gasta días de campo hasta el tope', () => {
    const e = base();
    expect(revisar(e, decision('solicitar_documento', { documento: 'Órdenes de compra' }))).toEqual({ ok: true });
    e.presupuesto.dias = e.presupuesto.diasMax;
    expect(revisar(e, decision('solicitar_documento', { documento: 'Otro' }))).toMatchObject({ ok: false, motivo: 'presupuesto' });
  });
});
