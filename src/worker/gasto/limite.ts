// Límite de llamadas por cliente en D1. Va además de los topes de gasto: la cookie de sesión
// se puede descartar, pero la IP no cambia en cada petición. Se guarda un hash, no la IP.

export interface Limite {
  llamadas: number;
  periodoS: number;
}

export async function dentroDelLimite(db: D1Database, cliente: string, l: Limite, ahoraMs = Date.now()): Promise<boolean> {
  const ventana = Math.floor(ahoraMs / 1000 / l.periodoS);
  const clave = await hash(cliente);
  const [fila] = await db.batch<{ n: number }>([
    db
      .prepare(
        `INSERT INTO limites (clave, ventana, n) VALUES (?1, ?2, 1)
         ON CONFLICT (clave, ventana) DO UPDATE SET n = n + 1
         RETURNING n`,
      )
      .bind(clave, ventana),
    // Las ventanas viejas ya no cuentan.
    db.prepare('DELETE FROM limites WHERE ventana < ?1').bind(ventana - 1),
  ]);
  const n = fila.results[0]?.n;
  return typeof n === 'number' && n <= l.llamadas;
}

async function hash(texto: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`indagora:${texto}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
