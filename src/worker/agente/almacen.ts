// Estado del agente en D1. Un paso toma el candado del caso, corre y guarda; si otro paso
// del mismo caso está en curso, el segundo no corre (y no gasta).
import type { EstadoAgente } from '../../nucleo/agente/tipos';

// Más que el peor paso: lecturas en paralelo y corroboración, cada una con tiempo límite de 60 s
// y un reintento (unos 4 min), más el decisor. Si vence antes, un segundo paso correría a la vez.
const CANDADO_MS = 420_000;

export async function crearAgente(db: D1Database, sesion: string, e: EstadoAgente): Promise<void> {
  await db.prepare('INSERT INTO agentes (id, sesion, estado) VALUES (?1, ?2, ?3)').bind(e.id, sesion, JSON.stringify(e)).run();
}

export async function leerAgente(db: D1Database, id: string, sesion: string): Promise<{ estado: EstadoAgente; version: number } | null> {
  const fila = await db.prepare('SELECT estado, version FROM agentes WHERE id = ?1 AND sesion = ?2').bind(id, sesion).first<{ estado: string; version: number }>();
  return fila ? { estado: JSON.parse(fila.estado) as EstadoAgente, version: fila.version } : null;
}

// true si tomó el candado; false si otro paso lo tiene.
export async function tomarCandado(db: D1Database, id: string, sesion: string, ahoraMs = Date.now()): Promise<boolean> {
  const r = await db
    .prepare('UPDATE agentes SET ocupado_hasta = ?3 WHERE id = ?1 AND sesion = ?2 AND (ocupado_hasta IS NULL OR ocupado_hasta < ?4)')
    .bind(id, sesion, ahoraMs + CANDADO_MS, ahoraMs)
    .run();
  return r.meta.changes === 1;
}

export async function soltarCandado(db: D1Database, id: string, sesion: string): Promise<void> {
  await db.prepare('UPDATE agentes SET ocupado_hasta = NULL WHERE id = ?1 AND sesion = ?2').bind(id, sesion).run();
}

// Guarda solo si nadie cambió el estado desde que se leyó; suelta el candado.
export async function guardarAgente(db: D1Database, sesion: string, e: EstadoAgente, version: number): Promise<boolean> {
  const r = await db
    .prepare(
      `UPDATE agentes SET estado = ?4, version = version + 1, ocupado_hasta = NULL,
         actualizado = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ?1 AND sesion = ?2 AND version = ?3`,
    )
    .bind(e.id, sesion, version, JSON.stringify(e))
    .run();
  return r.meta.changes === 1;
}

// Sin leer el estado: para distinguir "no existe" de "está ocupado".
export async function existeAgente(db: D1Database, id: string, sesion: string): Promise<boolean> {
  return (await db.prepare('SELECT 1 AS si FROM agentes WHERE id = ?1 AND sesion = ?2').bind(id, sesion).first()) !== null;
}
