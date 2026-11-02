// Pruebas de los hallazgos reales de la revisión de F5: cada una falla sin su arreglo.
import { describe, expect, it } from 'vitest';
import { aplicarAcciones, aplicarIndicadores, aplicarVerificaciones } from './aplicar';
import { generarEntregables, huellaDeEstado } from './generar';
import { extraerCifras, calcularPareto } from './pareto';
import { afirmacion, pasosPDSA, vistaTaller } from './fixture';
import type { Afirmacion, NivelCalculado } from '../tipos';

const nivelesDe = (vista: ReturnType<typeof vistaTaller>, ids: string[], nivel = 2) => {
  const plantilla = vista.niveles['E1-A01'];
  return new Map<string, NivelCalculado>(ids.map((id) => [id, { ...plantilla, nivel: nivel as NivelCalculado['nivel'] }]));
};

const indicadorBase = {
  nombre: 'Plazo del herraje', definicion: 'Días de espera del herraje', formula: 'días de espera / pedidos',
  unidad: 'días', meta: 'Bajar a 3 días', plazo: '2 meses', frecuencia: 'semanal' as const,
  responsable: 'Jefe de taller', causa: 'C1', punteros: ['E1-A01'],
};

describe('revisión F5', () => {
  it('1. la huella cambia si cambia el tema de una afirmación, el enunciado de una causa o la desviación', () => {
    const vista = vistaTaller();
    const antes = huellaDeEstado(vista);
    vista.estado.afirmaciones[0].tema = 'otro tema';
    expect(huellaDeEstado(vista)).not.toBe(antes);

    const v2 = vistaTaller();
    const antes2 = huellaDeEstado(v2);
    v2.estado.causas[0].enunciado = 'Enunciado corregido';
    expect(huellaDeEstado(v2)).not.toBe(antes2);

    const v3 = vistaTaller();
    const antes3 = huellaDeEstado(v3);
    v3.estado.desviacion!.ocurre.texto = 'Ocurre otra cosa';
    expect(huellaDeEstado(v3)).not.toBe(antes3);

    const v4 = vistaTaller();
    const antes4 = huellaDeEstado(v4);
    v4.estado.esNoEs![0].es.texto = 'Texto corregido';
    expect(huellaDeEstado(v4)).not.toBe(antes4);
    // Y es estable para el mismo estado.
    expect(huellaDeEstado(vistaTaller())).toBe(huellaDeEstado(vistaTaller()));
  });

  it('2. el Pareto cuenta una sola vez un hecho corroborado por dos fuentes', () => {
    const vista = vistaTaller();
    const a1 = afirmacion({ id: 'E1-A01', tema: 'entrega de herraje', cita: 'El herraje tarda 9,4 días en entregar pedidos', especificidad: ['9.4 días'], corrobora: ['E2-A01'] });
    const a2 = afirmacion({ id: 'E2-A01', tema: 'entrega de herraje', cita: 'El herraje tarda 9,4 días en entregar pedidos', especificidad: ['9.4 días'], corrobora: ['E1-A01'] });
    const a3 = afirmacion({ id: 'E2-A02', tema: 'entrega de barniz', cita: 'El barniz tarda 4,7 días en entregar pedidos', especificidad: ['4.7 días'] });
    const { pareto, motivo } = calcularPareto([a1, a2, a3], nivelesDe(vista, ['E1-A01', 'E2-A01', 'E2-A02']));
    expect(motivo).toBeNull();
    const barra = pareto!.barras.find((b) => b.categoria === 'entrega de herraje');
    expect(barra?.valor).toBe(9.4); // no 18,8
    expect(barra?.afirmaciones.sort()).toEqual(['E1-A01', 'E2-A01']);
    expect(pareto!.total).toBe(14.1);
  });

  it('3. el Pareto no suma magnitudes distintas aunque compartan unidad', () => {
    const vista = vistaTaller();
    const a1 = afirmacion({ id: 'E1-A01', tema: 'plazo del herraje', cita: 'El herraje tarda 9,4 días en entregar pedidos', especificidad: ['9.4 días'] });
    const a2 = afirmacion({ id: 'E2-A01', tema: 'retrabajo', cita: 'El retrabajo duró 2 días', especificidad: ['2 días'] });
    const r = calcularPareto([a1, a2], nivelesDe(vista, ['E1-A01', 'E2-A01']));
    expect(r.pareto).toBeNull();
    expect(r.motivo).toBe('unidades_incompatibles');
  });

  it('4. una cita con la cifra antigua y la vigente no aporta ninguna al Pareto', () => {
    const a = afirmacion({
      id: 'E1-A01',
      cita: 'Antes tardaba 3,1 días; desde febrero tarda 9,4 días en entregar el herraje',
      especificidad: ['3.1 días', '9.4 días'],
    });
    expect(extraerCifras(a, 2)).toBeNull();
  });

  it('5. la línea base inventada se anula y la ficha queda SMART incompleta; la sostenida se conserva', () => {
    const vista = vistaTaller();
    const inventada = aplicarIndicadores(vista, [{ ...indicadorBase, lineaBase: '3,1 días en enero' }]);
    expect(inventada.indicadores[0].lineaBase).toBeNull();
    expect(inventada.indicadores[0].smart.completa).toBe(false);
    expect(inventada.indicadores[0].smart.faltan.join(' ')).toContain('línea base');

    const sostenida = aplicarIndicadores(vista, [{ ...indicadorBase, lineaBase: '9,4 días' }]);
    expect(sostenida.indicadores[0].lineaBase).toBe('9,4 días');
    expect(sostenida.indicadores[0].smart.completa).toBe(true);

    const ausente = aplicarIndicadores(vista, [{ ...indicadorBase, lineaBase: null }]);
    expect(ausente.indicadores[0].smart.completa).toBe(false);
  });

  it('6. un puntero existente pero ajeno a la evidencia de la causa se rechaza por no pertinente', () => {
    const vista = vistaTaller();
    // En la fixture C2 está descartada (se rechaza antes de mirar punteros), así que se usa C1
    // con una tercera afirmación real del caso que no forma parte de su evidencia.
    vista.estado.afirmaciones.push(afirmacion({ id: 'E2-A02', tema: 'falta de personal', cita: 'Falta personal en el taller' }));
    const r = aplicarIndicadores(vista, [{ ...indicadorBase, causa: 'C1', lineaBase: '9,4 días', punteros: ['E2-A02'] }]);
    expect(r.indicadores).toEqual([]);
    expect(r.rechazos).toContainEqual(expect.objectContaining({ motivo: 'puntero_no_pertinente' }));

    const ok = aplicarAcciones(vista, [{ causa: 'C1', texto: 'Reducir el plazo pactado', cuadrante: 'reducir', esfuerzo: 'bajo', punteros: ['E2-A01'] }]);
    expect(ok.acciones).toHaveLength(1);

    // Con un puntero pertinente y otro ajeno, el ajeno se quita y la acción se conserva.
    const mixta = aplicarAcciones(vista, [{ causa: 'C1', texto: 'Reducir el plazo pactado', cuadrante: 'reducir', esfuerzo: 'bajo', punteros: ['E2-A01', 'E2-A02'] }]);
    expect(mixta.acciones.map((a) => a.punteros)).toEqual([['E2-A01']]);
    expect(mixta.rechazos).toContainEqual(expect.objectContaining({ motivo: 'puntero_no_pertinente' }));
  });

  it('10 y 9. el informe del núcleo no lleva metadatos vacíos y neutraliza saltos y HTML', () => {
    const vista = vistaTaller();
    vista.estado.titulo = 'Taller\n# Encabezado falso <img src=x onerror=alert(1)>';
    (vista.estado.afirmaciones[0] as Afirmacion).cita = 'Dice algo\n## Falso <script>alert(1)</script> [x](https://ejemplo.invalid)';
    const parcial = generarEntregables(vista, { verificaciones: [], acciones: [], indicadores: [] });
    expect(parcial.informeMarkdown).not.toContain('Generado: \n');
    expect(parcial.informeMarkdown).not.toContain('Costo de generación: 0 USD');
    expect(parcial.informeMarkdown).not.toContain('<script>');
    expect(parcial.informeMarkdown).not.toContain('<img');
    expect(parcial.informeMarkdown).not.toMatch(/\n# Encabezado falso/);
    expect(parcial.informeMarkdown).not.toMatch(/\n## Falso/);
    expect(parcial.informeMarkdown).toContain('&lt;script&gt;');
  });

  it('11. verificar una causa ya elegible se rechaza con el motivo correcto', () => {
    const vista = vistaTaller();
    const r = aplicarVerificaciones(vista, [{
      causa: 'C1', queRevisar: 'El registro', conQuien: 'Jefe de taller',
      confirmaSi: 'Muestra 9,4 días', descartaSi: 'Muestra 3 días', pasos: pasosPDSA(['E1-A01']),
    }]);
    expect(r.verificaciones).toEqual([]);
    expect(r.rechazos).toContainEqual(expect.objectContaining({ motivo: 'causa_ya_elegible_intervencion' }));
  });
});
