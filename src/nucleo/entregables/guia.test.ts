import { describe, expect, it } from 'vitest';
import { generarGuia } from './guia';
import { vistaTaller, vistaTallerN2 } from './fixture';

describe('guía de la siguiente entrevista', () => {
  it('incluye vacíos de cada tipo presentes, sin duplicar', () => {
    const guia = generarGuia(vistaTallerN2());
    const tipos = new Set(guia.map((g) => g.tipo));
    expect(tipos.has('vacio_criterio')).toBe(true);
    expect(tipos.has('causa_abierta')).toBe(true);
    expect(tipos.has('documento_pedido')).toBe(true);
    expect(tipos.has('casilla_vacia')).toBe(true);
    const claves = guia.map((g) => `${g.tipo}|${g.objetivo}`);
    expect(new Set(claves).size).toBe(claves.length);
    for (const g of guia) {
      expect(g.pregunta).toContain('Cuénteme la última vez que pasó');
      expect(g.paraQuien).not.toBe('');
      expect(g.objetivo).not.toBe('');
    }
  });

  it('incluye corroboración pendiente cuando no está confirmada', () => {
    const guia = generarGuia(vistaTallerN2());
    expect(guia.some((g) => g.tipo === 'corroboracion_pendiente')).toBe(true);
  });

  it('en el caso N3 confirmado no ofrece corroboración pendiente de ese par', () => {
    const guia = generarGuia(vistaTaller());
    expect(guia.some((g) => g.tipo === 'corroboracion_pendiente')).toBe(false);
  });
});
