import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { definirSalida } from './esquema';

describe('definirSalida', () => {
  it('cierra los objetos y marca todo como requerido, también anidado', () => {
    const s = definirSalida(
      'prueba',
      z.object({ a: z.string(), b: z.array(z.object({ c: z.number(), d: z.string().nullable() })) }),
    );
    const js = s.jsonSchema as any;
    expect(js.$schema).toBeUndefined();
    expect(js.additionalProperties).toBe(false);
    expect(js.required).toEqual(['a', 'b']);
    expect(js.properties.b.items.additionalProperties).toBe(false);
    expect(js.properties.b.items.required).toEqual(['c', 'd']);
  });

  it('rechaza campos opcionales', () => {
    expect(() => definirSalida('x', z.object({ a: z.string().optional() }))).toThrow(/"a" es opcional/);
    expect(() => definirSalida('x', z.object({ a: z.object({ b: z.number().optional() }) }))).toThrow(/"a\.b" es opcional/);
  });

  it('rechaza objetos sin propiedades fijas', () => {
    expect(() => definirSalida('x', z.object({ a: z.record(z.string(), z.number()) }))).toThrow(/sin propiedades fijas/);
  });

  it('conserva enums y el validador de Zod', () => {
    const s = definirSalida('x', z.object({ id: z.enum(['o1', 'o2']) }));
    expect((s.jsonSchema as any).properties.id.enum).toEqual(['o1', 'o2']);
    expect(s.zod.safeParse({ id: 'o3' }).success).toBe(false);
  });

  it('rechaza nombres que la API no admite', () => {
    expect(() => definirSalida('con espacios', z.object({ a: z.string() }))).toThrow(/Nombre/);
  });
});
