// Persistencia de entregables en D1: una fila por agente, con huella, costo y marca demo.
import type { EntregablesCaso } from '../../nucleo/entregables/tipos';

export async function guardarEntregables(db: D1Database, e: EntregablesCaso): Promise<void> {
  await db
    .prepare(
      `INSERT INTO entregables (agente_id, huella, contenido, costo_usd, demo, generado_en)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT(agente_id) DO UPDATE SET huella = excluded.huella, contenido = excluded.contenido,
         costo_usd = excluded.costo_usd, demo = excluded.demo, generado_en = excluded.generado_en`,
    )
    .bind(e.agenteId, e.huellaEstado, JSON.stringify(e), e.costoUsd, e.demo ? 1 : 0, e.generadoEn)
    .run();
}

export async function leerEntregables(db: D1Database, agenteId: string): Promise<EntregablesCaso | null> {
  const fila = await db.prepare('SELECT contenido FROM entregables WHERE agente_id = ?1').bind(agenteId).first<{ contenido: string }>();
  if (!fila) return null;
  try {
    return JSON.parse(fila.contenido) as EntregablesCaso;
  } catch {
    return null;
  }
}
