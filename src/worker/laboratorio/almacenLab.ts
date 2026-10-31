// Laboratorios en D1. La verdad vive aquí y nunca sale por la vista pública.
import type { CasoLaboratorio } from '../../nucleo/laboratorio/tipos';
import type { Intercambio, VerdadLaboratorio } from '../../nucleo/laboratorio/tipos';
import type { FuenteEntrada } from '../../nucleo/tipos';

export interface FilaLab {
  id: string;
  sesion: string;
  agenteId: string | null;
  estado: string;
  modo: string;
  caso: CasoLaboratorio;
  verdad: VerdadLaboratorio | null;
  fuentes: FuenteEntrada[] | null;
  intercambios: Intercambio[];
  gastoLabUsd: number;
}

export async function asegurarTablasLab(db: D1Database): Promise<void> {
  await db.prepare(`CREATE TABLE IF NOT EXISTS laboratorios (id TEXT PRIMARY KEY, sesion TEXT NOT NULL, agente_id TEXT, estado TEXT NOT NULL, modo TEXT NOT NULL, publico TEXT NOT NULL, verdad TEXT, fuentes TEXT, intercambios TEXT NOT NULL DEFAULT '[]', gasto_lab_usd REAL NOT NULL DEFAULT 0, creado_en TEXT NOT NULL)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS laboratorios_grabados (id TEXT PRIMARY KEY, contenido TEXT NOT NULL, creado_en TEXT NOT NULL)`).run();
}

type FilaCruda = { id: string; sesion: string; agente_id: string | null; estado: string; modo: string; publico: string; verdad: string | null; fuentes: string | null; intercambios: string; gasto_lab_usd: number };

const deFila = (f: FilaCruda): FilaLab => ({
  id: f.id, sesion: f.sesion, agenteId: f.agente_id, estado: f.estado, modo: f.modo,
  caso: JSON.parse(f.publico) as CasoLaboratorio,
  verdad: f.verdad ? (JSON.parse(f.verdad) as VerdadLaboratorio) : null,
  fuentes: f.fuentes ? (JSON.parse(f.fuentes) as FuenteEntrada[]) : null,
  intercambios: JSON.parse(f.intercambios) as Intercambio[],
  gastoLabUsd: f.gasto_lab_usd,
});

export async function crearLab(db: D1Database, fila: FilaLab): Promise<void> {
  await asegurarTablasLab(db);
  await db.prepare('INSERT INTO laboratorios (id, sesion, agente_id, estado, modo, publico, verdad, fuentes, intercambios, gasto_lab_usd, creado_en) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)')
    .bind(fila.id, fila.sesion, fila.agenteId, fila.estado, fila.modo, JSON.stringify(fila.caso), fila.verdad ? JSON.stringify(fila.verdad) : null, fila.fuentes ? JSON.stringify(fila.fuentes) : null, JSON.stringify(fila.intercambios), fila.gastoLabUsd, new Date().toISOString()).run();
}

export async function leerLab(db: D1Database, id: string, sesion: string): Promise<FilaLab | null> {
  await asegurarTablasLab(db);
  const f = await db.prepare('SELECT * FROM laboratorios WHERE id = ?1 AND sesion = ?2').bind(id, sesion).first<FilaCruda>();
  return f ? deFila(f) : null;
}

export async function guardarLab(db: D1Database, fila: FilaLab): Promise<void> {
  await asegurarTablasLab(db);
  await db.prepare('UPDATE laboratorios SET agente_id = ?3, estado = ?4, modo = ?5, publico = ?6, verdad = ?7, fuentes = ?8, intercambios = ?9, gasto_lab_usd = ?10 WHERE id = ?1 AND sesion = ?2')
    .bind(fila.id, fila.sesion, fila.agenteId, fila.estado, fila.modo, JSON.stringify(fila.caso), fila.verdad ? JSON.stringify(fila.verdad) : null, fila.fuentes ? JSON.stringify(fila.fuentes) : null, JSON.stringify(fila.intercambios), fila.gastoLabUsd).run();
}

export async function leerGrabado(db: D1Database): Promise<unknown | null> {
  await asegurarTablasLab(db);
  const f = await db.prepare('SELECT contenido FROM laboratorios_grabados LIMIT 1').first<{ contenido: string }>();
  if (!f) return null;
  try { return JSON.parse(f.contenido); } catch { return null; }
}

export async function gastoLabSesion(db: D1Database, sesion: string): Promise<number> {
  try {
    const f = await db.prepare(`SELECT COALESCE(SUM(costo_usd), 0) AS usd FROM llamadas WHERE sesion = ?1 AND proposito LIKE 'lab:%'`).bind(sesion).first<{ usd: number }>();
    return f?.usd ?? 0;
  } catch { return 0; }
}

