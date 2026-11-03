import { describe, expect, it } from 'vitest';
import { ORACIONES_EJEMPLO, FUENTES_EJEMPLO, oracionDe } from './datos';
import { TEXTOS_FLUJO_ES } from './textos';
import { TEXTOS_FLUJO_EN } from './textos.en';

// Todo el texto visible de un objeto de textos, aplanado.
const cadenas = (x: unknown): string[] =>
  typeof x === 'string' ? [x] : Array.isArray(x) ? x.flatMap(cadenas) : x && typeof x === 'object' ? Object.values(x).flatMap(cadenas) : [];

// El código de los entregables y los textos de su interfaz (Doran está en la ayuda de los indicadores).
const codigoEntregables = Object.values(import.meta.glob(['../../nucleo/entregables/*.ts', '../entregables/textos.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>).join('\n');

describe('flujo "Cómo funciona"', () => {
  it('las oraciones del ejemplo salen del caso real del taller, con su id', () => {
    expect(ORACIONES_EJEMPLO.flojo).toMatchObject({ id: 'E1-003', hablante: 'Dueña' });
    expect(ORACIONES_EJEMPLO.registro.id).toMatch(/^D1-\d{3}$/);
    expect(ORACIONES_EJEMPLO.registro.texto).toContain('9.4 días');
    for (const o of Object.values(ORACIONES_EJEMPLO)) expect(o.id).toMatch(/^[ED]\d-\d{3}$/);
    expect(FUENTES_EJEMPLO.map((f) => f.id)).toEqual(['E1', 'E2', 'E3', 'D1']);
    expect(() => oracionDe('E1', 'esto no lo dijo nadie')).toThrow();
  });

  it('español e inglés cuentan lo mismo: misma cantidad de estaciones, niveles, promesas y entregables', () => {
    const forma = (t: typeof TEXTOS_FLUJO_ES) => ({
      estaciones: t.estaciones.map((e) => e.carriles.join('+')),
      niveles: t.artefactos.niveles.map((n) => n.nivel),
      promesas: t.promesas.length,
      entregables: t.artefactos.entregables.length,
    });
    expect(forma(TEXTOS_FLUJO_EN)).toEqual(forma(TEXTOS_FLUJO_ES));
    expect(Object.keys(TEXTOS_FLUJO_EN.traduccion ?? {}).sort()).toEqual(Object.keys(ORACIONES_EJEMPLO).sort());
    const roles = [...Object.values(ORACIONES_EJEMPLO).map((o) => o.hablante), ...FUENTES_EJEMPLO.map((f) => f.rol)];
    for (const r of roles) expect(TEXTOS_FLUJO_EN.roles?.[r], r).toBeTruthy();
  });

  it('no promete de más: sin "verificado", "learns", "swarm" ni "cero alucinaciones"', () => {
    const prohibido = /verificad|verified|swarm|multi-?agent|\blearns?\b|aprende|alucinaci|hallucinat/i;
    for (const s of [...cadenas(TEXTOS_FLUJO_ES), ...cadenas(TEXTOS_FLUJO_EN)]) expect(s).not.toMatch(prohibido);
  });

  it('cada autor que se cita en los entregables también lo cita el código que los implementa o su interfaz', () => {
    for (const autor of ['Deming', 'Kim y Mauborgne', 'Lewin', 'Kotter', 'ADKAR', 'Doran', 'Pareto', 'Flanagan', 'Block']) {
      expect(TEXTOS_FLUJO_ES.artefactos.entregables.some((x) => x.metodo.includes(autor))).toBe(true);
      expect(codigoEntregables).toContain(autor);
    }
  });
});
