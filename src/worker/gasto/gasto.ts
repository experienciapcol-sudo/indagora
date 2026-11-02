// Tope de gasto por sesión y global. La reserva y la revisión de ambos topes van en una
// sola sentencia SQL, así dos llamadas simultáneas no pueden pasar el tope a la vez.
// El total global vive en la tabla `totales` para no sumar todas las llamadas cada vez.

export interface Topes {
  sesionUsd: number;
  globalUsd: number;
}

export interface VarsTopes {
  TOPE_SESION_USD?: string;
  TOPE_GLOBAL_USD?: string;
}

export class TopeAlcanzado extends Error {
  constructor(
    readonly alcance: 'sesion' | 'global' | 'subtope',
    readonly gastadoUsd: number,
    readonly topeUsd: number,
  ) {
    super(
      alcance === 'sesion' ? 'Se alcanzó el tope de gasto de esta sesión'
      : alcance === 'subtope' ? 'Se alcanzó el tope de gasto de esta parte en la sesión'
      : 'Se alcanzó el tope de gasto global',
    );
    this.name = 'TopeAlcanzado';
  }
}

// Un tope ausente, negativo o no numérico es un error de configuración: se falla cerrado.
export function leerTopes(env: VarsTopes): Topes {
  const leer = (nombre: keyof VarsTopes) => {
    const valor = Number(env[nombre]);
    if (env[nombre] === undefined || env[nombre].trim() === '' || !Number.isFinite(valor) || valor < 0) {
      throw new Error(`Variable ${nombre} inválida: se necesita un número de USD mayor o igual a 0`);
    }
    return valor;
  };
  return { sesionUsd: leer('TOPE_SESION_USD'), globalUsd: leer('TOPE_GLOBAL_USD') };
}

export interface Reserva {
  id: string;
  sesion: string;
  modelo: string;
  proposito: string;
  estimadoUsd: number;
  // Tope adicional para los propósitos que empiezan con `prefijo` (p. ej. 'lab:'), en la misma
  // sentencia que los demás: dos llamadas simultáneas no pueden pasarlo a la vez.
  subtope?: { prefijo: string; usd: number };
}

// Una reserva sin cerrar después de esto se da por fallida; conserva su estimación, que es una
// cota superior, así el gasto nunca queda por debajo de lo que pudo costar.
const VENCE_RESERVA = '-15 minutes';

export async function reservar(db: D1Database, r: Reserva, topes: Topes): Promise<void> {
  if (!Number.isFinite(r.estimadoUsd) || r.estimadoUsd < 0) throw new Error(`Costo estimado inválido: ${r.estimadoUsd}`);
  if (r.subtope && (!Number.isFinite(r.subtope.usd) || r.subtope.usd < 0 || !/^[a-z]+:$/.test(r.subtope.prefijo))) throw new Error(`Subtope inválido: ${JSON.stringify(r.subtope)}`);
  // El subtope solo limita a las llamadas de su propio propósito.
  const sub = r.subtope && r.proposito.startsWith(r.subtope.prefijo) ? r.subtope : null;
  // batch corre como una transacción: el total global solo sube si la reserva entró.
  const [res] = await db.batch([
    db
      .prepare(
        `INSERT INTO llamadas (id, sesion, modelo, proposito, estado, costo_usd)
         SELECT ?1, ?2, ?3, ?4, 'reservada', ?5
         WHERE (SELECT COALESCE(SUM(costo_usd), 0) FROM llamadas WHERE sesion = ?2) + ?5 <= ?6
           AND (SELECT usd FROM totales WHERE clave = 'global') + ?5 <= ?7
           AND (?8 IS NULL OR (SELECT COALESCE(SUM(costo_usd), 0) FROM llamadas WHERE sesion = ?2 AND substr(proposito, 1, length(?8)) = ?8) + ?5 <= ?9)`,
      )
      .bind(r.id, r.sesion, r.modelo, r.proposito, r.estimadoUsd, topes.sesionUsd, topes.globalUsd, sub?.prefijo ?? null, sub?.usd ?? 0),
    db
      .prepare(
        `UPDATE totales SET usd = usd + ?2
         WHERE clave = 'global' AND EXISTS (SELECT 1 FROM llamadas WHERE id = ?1 AND estado = 'reservada')`,
      )
      .bind(r.id, r.estimadoUsd),
    db
      .prepare(
        `UPDATE llamadas SET estado = 'fallida', error = 'reserva vencida sin cierre'
         WHERE estado = 'reservada' AND creada < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?1)`,
      )
      .bind(VENCE_RESERVA),
  ]);
  if (res.meta.changes === 1) return;

  const g = await resumen(db, r.sesion);
  if (g.globalUsd + r.estimadoUsd > topes.globalUsd) throw new TopeAlcanzado('global', g.globalUsd, topes.globalUsd);
  if (g.sesionUsd + r.estimadoUsd > topes.sesionUsd || !sub) throw new TopeAlcanzado('sesion', g.sesionUsd, topes.sesionUsd);
  throw new TopeAlcanzado('subtope', await gastoConPrefijo(db, r.sesion, sub.prefijo), sub.usd);
}

export async function gastoConPrefijo(db: D1Database, sesion: string, prefijo: string): Promise<number> {
  const f = await db
    .prepare(`SELECT COALESCE(SUM(costo_usd), 0) AS usd FROM llamadas WHERE sesion = ?1 AND substr(proposito, 1, length(?2)) = ?2`)
    .bind(sesion, prefijo)
    .first<{ usd: number }>();
  return f?.usd ?? 0;
}

export interface Cierre {
  estado: 'completada' | 'fallida';
  costoUsd: number;
  tokensEntrada?: number | null;
  tokensCache?: number | null;
  tokensSalida?: number | null;
  tokensRazonamiento?: number | null;
  ms?: number | null;
  finish?: string | null;
  error?: string | null;
}

export async function cerrar(db: D1Database, id: string, c: Cierre): Promise<void> {
  if (!Number.isFinite(c.costoUsd) || c.costoUsd < 0) throw new Error(`Costo inválido al cerrar la llamada ${id}: ${c.costoUsd}`);
  // Primero se ajusta el total con la diferencia entre lo real y lo reservado, luego la llamada.
  const ajuste = db
    .prepare(
      `UPDATE totales SET usd = MAX(0, usd + ?2 - (SELECT costo_usd FROM llamadas WHERE id = ?1 AND estado = 'reservada'))
       WHERE clave = 'global' AND EXISTS (SELECT 1 FROM llamadas WHERE id = ?1 AND estado = 'reservada')`,
    )
    .bind(id, c.costoUsd);
  const llamada = db
    .prepare(
      `UPDATE llamadas SET estado = ?2, costo_usd = ?3, tokens_entrada = ?4, tokens_cache = ?5, tokens_salida = ?6,
         tokens_razonamiento = ?7, ms = ?8, finish = ?9, error = ?10
       WHERE id = ?1 AND estado = 'reservada'`,
    )
    .bind(
      id,
      c.estado,
      c.costoUsd,
      c.tokensEntrada ?? null,
      c.tokensCache ?? null,
      c.tokensSalida ?? null,
      c.tokensRazonamiento ?? null,
      c.ms ?? null,
      c.finish ?? null,
      c.error?.slice(0, 500) ?? null,
    );
  await db.batch([ajuste, llamada]);
}

export async function resumen(db: D1Database, sesion: string): Promise<{ sesionUsd: number; globalUsd: number; llamadasSesion: number }> {
  const fila = await db
    .prepare(
      `SELECT
         (SELECT COALESCE(SUM(costo_usd), 0) FROM llamadas WHERE sesion = ?1) AS sesion_usd,
         (SELECT COUNT(*) FROM llamadas WHERE sesion = ?1) AS llamadas_sesion,
         (SELECT usd FROM totales WHERE clave = 'global') AS global_usd`,
    )
    .bind(sesion)
    .first<{ sesion_usd: number; llamadas_sesion: number; global_usd: number }>();
  return { sesionUsd: fila?.sesion_usd ?? 0, globalUsd: fila?.global_usd ?? 0, llamadasSesion: fila?.llamadas_sesion ?? 0 };
}
