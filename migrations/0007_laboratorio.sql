CREATE TABLE IF NOT EXISTS laboratorios (
  id TEXT PRIMARY KEY,
  sesion TEXT NOT NULL,
  agente_id TEXT,
  estado TEXT NOT NULL,
  modo TEXT NOT NULL,
  publico TEXT NOT NULL,
  verdad TEXT,
  fuentes TEXT,
  intercambios TEXT NOT NULL DEFAULT '[]',
  gasto_lab_usd REAL NOT NULL DEFAULT 0,
  creado_en TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_laboratorios_sesion ON laboratorios(sesion);
CREATE TABLE IF NOT EXISTS laboratorios_grabados (
  id TEXT PRIMARY KEY,
  contenido TEXT NOT NULL,
  creado_en TEXT NOT NULL
);
