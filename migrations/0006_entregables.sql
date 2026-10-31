CREATE TABLE IF NOT EXISTS entregables (
  agente_id TEXT PRIMARY KEY,
  huella TEXT NOT NULL,
  contenido TEXT NOT NULL,
  costo_usd REAL NOT NULL DEFAULT 0,
  demo INTEGER NOT NULL DEFAULT 0,
  generado_en TEXT NOT NULL
);
