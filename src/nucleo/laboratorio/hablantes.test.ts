import { describe, expect, it } from 'vitest';
import { segmentar } from '../segmentar';
import { aplicarAsignaciones, detectarHablantes } from './hablantes';

const TEXTO = [
  'Ana: ¿Qué pasó el lunes ruta norte ruta norte?',
  'Luis: Se retrasó la entrega.',
  'Ana: ¿Algo más?',
  'Luis: Nada más.',
  'Pedro: Yo solo vi la salida.', // una sola intervención
].join('\n');

describe('hablantes', () => {
  it('detecta también al hablante de una sola intervención', () => {
    const detectados = detectarHablantes(TEXTO);
    expect(detectados.find((h) => h.etiqueta === 'Pedro')?.intervenciones).toBe(1);
    expect(detectados.find((h) => h.etiqueta === 'Ana')?.intervenciones).toBe(2);
  });

  it('tras la asignación, el hablante de una línea conserva turno propio al segmentar', () => {
    const { fuente, avisos } = aplicarAsignaciones(TEXTO, [
      { etiqueta: 'Ana', rol: 'Entrevistadora', esEntrevistador: true, esPrincipal: false },
      { etiqueta: 'Luis', rol: 'Repartidor', esEntrevistador: false, esPrincipal: true },
      { etiqueta: 'Pedro', rol: 'Ayudante', esEntrevistador: false, esPrincipal: false },
    ]);
    expect(avisos).toEqual([]);
    expect(fuente?.rol).toBe('Repartidor');
    expect(fuente?.entrevistador).toBe('Entrevistadora');
    expect(fuente?.hablantesConocidos).toEqual(['Entrevistadora', 'Repartidor', 'Ayudante']);
    expect(segmentar(fuente!).turnos.some((t) => t.hablante === 'Ayudante')).toBe(true);
    // La persona principal también conserva turno propio con una sola línea en una fuente corta:
    const corta = aplicarAsignaciones('Ana: ¿Qué pasó?\nLuis: Solo esto.', [
      { etiqueta: 'Ana', rol: 'Entrevistadora', esEntrevistador: true, esPrincipal: false },
      { etiqueta: 'Luis', rol: 'Repartidor', esEntrevistador: false, esPrincipal: true },
    ]).fuente!;
    const { turnos } = segmentar(corta);
    expect(turnos.map((t) => t.hablante)).toEqual(['Entrevistadora', 'Repartidor']);
    expect(segmentar(fuente!).turnos.some((t) => t.hablante === 'Repartidor')).toBe(true);
  });

  it('dos hablantes con el mismo rol → aviso y sin fuente', () => {
    const r = aplicarAsignaciones(TEXTO, [
      { etiqueta: 'Ana', rol: 'Entrevistadora', esEntrevistador: true, esPrincipal: false },
      { etiqueta: 'Luis', rol: 'Repartidor', esEntrevistador: false, esPrincipal: true },
      { etiqueta: 'Pedro', rol: 'Repartidor', esEntrevistador: false, esPrincipal: false },
    ]);
    expect(r.fuente).toBeNull();
    expect(r.avisos.join(' ')).toContain('comparten');
    expect(r.avisos.join(' ')).toContain('no se podría saber quién dijo qué');
  });

  it('sin exactamente un entrevistador no hay fuente', () => {
    const r = aplicarAsignaciones(TEXTO, [
      { etiqueta: 'Luis', rol: 'Repartidor', esEntrevistador: false, esPrincipal: true },
    ]);
    expect(r.fuente).toBeNull();
    expect(r.avisos.length).toBeGreaterThan(0);
  });

  it('la limpieza quita la repetición y sin limpieza se conserva', () => {
    const base = [
      { etiqueta: 'Ana', rol: 'Entrevistadora', esEntrevistador: true, esPrincipal: false },
      { etiqueta: 'Luis', rol: 'Repartidor', esEntrevistador: false, esPrincipal: true },
      { etiqueta: 'Pedro', rol: 'Ayudante', esEntrevistador: false, esPrincipal: false },
    ] as const;
    const limpia = aplicarAsignaciones(TEXTO, [...base], { limpiar: true }).fuente!;
    const sucia = aplicarAsignaciones(TEXTO, [...base], { limpiar: false }).fuente!;
    expect(limpia.texto).not.toContain('ruta norte ruta norte');
    expect(sucia.texto).toContain('ruta norte ruta norte');
  });
});
