import { describe, expect, it } from 'vitest';
import { d1Falsa } from './d1-falsa';
import { dentroDelLimite } from './limite';

const l = { llamadas: 3, periodoS: 60 };
const t0 = 1_800_000_000_000;

describe('dentroDelLimite', () => {
  it('deja pasar hasta el límite dentro de la ventana', async () => {
    const db = d1Falsa();
    const r = [];
    for (let i = 0; i < 4; i++) r.push(await dentroDelLimite(db, '203.0.113.7', l, t0));
    expect(r).toEqual([true, true, true, false]);
  });

  it('cuenta por cliente', async () => {
    const db = d1Falsa();
    for (let i = 0; i < 3; i++) await dentroDelLimite(db, 'a', l, t0);
    expect(await dentroDelLimite(db, 'b', l, t0)).toBe(true);
  });

  it('una ventana nueva empieza en cero y borra las viejas', async () => {
    const db = d1Falsa();
    for (let i = 0; i < 4; i++) await dentroDelLimite(db, 'a', l, t0);
    expect(await dentroDelLimite(db, 'a', l, t0 + 60_000)).toBe(true);
    await dentroDelLimite(db, 'a', l, t0 + 180_000);
    const filas = await db.prepare('SELECT COUNT(*) AS n FROM limites').first<{ n: number }>();
    expect(filas!.n).toBe(1);
  });

  it('no guarda la IP en claro', async () => {
    const db = d1Falsa();
    await dentroDelLimite(db, '203.0.113.7', l, t0);
    const fila = await db.prepare('SELECT clave FROM limites').first<{ clave: string }>();
    expect(fila!.clave).toMatch(/^[0-9a-f]{64}$/);
  });
});
