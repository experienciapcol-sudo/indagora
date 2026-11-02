// Límite de llamadas por cliente en D1. Va además de los topes de gasto: la cookie de sesión
// se puede descartar, pero la IP no cambia en cada petición. Se guarda un hash, no la IP.
import { sha256Hex } from '../hash';

export interface Limite {
  llamadas: number;
  periodoS: number;
}

// Las filas viven dos días: alcanza para el periodo más largo (un día) sin que los límites
// por minuto borren los diarios.
const VIDA_S = 2 * 86_400;

export async function dentroDelLimite(db: D1Database, cliente: string, l: Limite, ahoraMs = Date.now()): Promise<boolean> {
  const ahoraS = Math.floor(ahoraMs / 1000);
  // La ventana es el segundo en que empieza; el periodo va en la clave para no mezclar límites.
  const ventana = Math.floor(ahoraS / l.periodoS) * l.periodoS;
  const clave = await sha256Hex(`indagora:${l.periodoS}:${cliente}`);
  const [fila] = await db.batch<{ n: number }>([
    db
      .prepare(
        `INSERT INTO limites (clave, ventana, n) VALUES (?1, ?2, 1)
         ON CONFLICT (clave, ventana) DO UPDATE SET n = n + 1
         RETURNING n`,
      )
      .bind(clave, ventana),
    db.prepare('DELETE FROM limites WHERE ventana < ?1').bind(ahoraS - VIDA_S),
  ]);
  const n = fila.results[0]?.n;
  return typeof n === 'number' && n <= l.llamadas;
}
