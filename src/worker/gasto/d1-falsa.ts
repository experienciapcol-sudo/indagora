// Solo para pruebas: imita la parte de D1 que usa el proyecto sobre node:sqlite, con las
// migraciones reales aplicadas, para probar el SQL sin tocar Cloudflare.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const MIGRACIONES = join(import.meta.dirname, '..', '..', '..', 'migrations');

type Valor = string | number | null;

export function d1Falsa(): D1Database {
  const db = new DatabaseSync(':memory:');
  for (const archivo of readdirSync(MIGRACIONES).filter((a) => a.endsWith('.sql')).sort()) {
    db.exec(readFileSync(join(MIGRACIONES, archivo), 'utf8'));
  }
  const preparar = (sql: string, valores: Valor[] = []) => ({
    bind: (...v: Valor[]) => preparar(sql, v),
    run: async () => {
      const r = db.prepare(sql).run(...valores);
      return { success: true, results: [], meta: { changes: Number(r.changes) } };
    },
    first: async <T>() => (db.prepare(sql).get(...valores) as T | undefined) ?? null,
    all: async <T>() => ({ success: true, results: db.prepare(sql).all(...valores) as T[], meta: {} }),
  });
  return { prepare: (sql: string) => preparar(sql) } as unknown as D1Database;
}
