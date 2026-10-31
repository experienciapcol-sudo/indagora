import { describe, expect, it } from 'vitest';
import { detectarHablantes } from '../../nucleo/laboratorio/hablantes';
import { asignacionCompleta, asignacionesIniciales, crearFuenteDeTexto } from './asignacion';

const TEXTO = ['Consultor: ¿qué está pasando?', 'María: los pedidos salen tarde.', 'Consultor: ¿desde cuándo?', 'Pedro: a mí solo me tocó verlo una vez.'].join('\n');

describe('asignación de hablantes', () => {
  it('detecta también al hablante de una sola intervención', () => {
    const detectados = detectarHablantes(TEXTO);
    expect(detectados.map((d) => d.etiqueta)).toEqual(['Consultor', 'María', 'Pedro']);
    expect(detectados[2].intervenciones).toBe(1);
  });

  it('crea una fuente con entrevistador y principal, conservando al hablante de una sola línea en el texto', () => {
    const asignaciones = asignacionesIniciales(detectarHablantes(TEXTO));
    expect(asignacionCompleta(asignaciones)).toBe(true);
    const { fuente, avisos } = crearFuenteDeTexto(TEXTO, asignaciones, { id: 'E9' });
    expect(avisos).toEqual([]);
    expect(fuente?.entrevistador).toBe('Consultor');
    expect(fuente?.rol).toBe('María');
    // La línea de Pedro (una sola intervención) queda reescrita con su rol en el texto.
    // Que `segmentar` la conserve como turno propio requiere el campo
    // `hablantesConocidos` del diseño F6 §2.5, aún no presente en el núcleo.
    expect(fuente?.texto).toContain('Pedro: a mí solo me tocó verlo una vez.');
  });

  it('dos hablantes con el mismo rol no producen fuente', () => {
    const asignaciones = asignacionesIniciales(detectarHablantes(TEXTO)).map((a) => ({ ...a, rol: 'Mismo rol' }));
    const { fuente, avisos } = crearFuenteDeTexto(TEXTO, asignaciones);
    expect(fuente).toBeNull();
    expect(avisos.some((a) => a.includes('comparten el rol'))).toBe(true);
  });

  it('sin exactamente un entrevistador y una principal no hay fuente', () => {
    const asignaciones = asignacionesIniciales(detectarHablantes(TEXTO)).map((a) => ({ ...a, esPrincipal: false }));
    expect(crearFuenteDeTexto(TEXTO, asignaciones).fuente).toBeNull();
    expect(asignacionCompleta(asignaciones)).toBe(false);
  });

  it('la limpieza quita repeticiones y desactivada las conserva', () => {
    const texto = ['Consultor: cuénteme la ruta.', 'María: la ruta norte ruta norte siempre se atrasa.', 'Consultor: gracias.'].join('\n');
    const asignaciones = asignacionesIniciales(detectarHablantes(texto));
    const limpio = crearFuenteDeTexto(texto, asignaciones, { limpiar: true }).fuente;
    const sucio = crearFuenteDeTexto(texto, asignaciones, { limpiar: false }).fuente;
    expect(limpio?.texto).not.toContain('ruta norte ruta norte');
    expect(sucio?.texto).toContain('ruta norte ruta norte');
  });
});
