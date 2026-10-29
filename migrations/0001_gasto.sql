-- Cuenta de gasto por llamada a la API de Meta. Cada llamada se reserva antes de salir
-- (con un costo estimado al alza) y se cierra con el costo real que reporta `usage`.
CREATE TABLE llamadas (
  id TEXT PRIMARY KEY,
  sesion TEXT NOT NULL,
  creada TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  modelo TEXT NOT NULL,
  proposito TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('reservada', 'completada', 'fallida')),
  costo_usd REAL NOT NULL CHECK (costo_usd >= 0),
  tokens_entrada INTEGER,
  tokens_cache INTEGER,
  tokens_salida INTEGER,
  tokens_razonamiento INTEGER,
  ms INTEGER,
  finish TEXT,
  error TEXT
);

CREATE INDEX llamadas_por_sesion ON llamadas (sesion);

-- Respuestas reales grabadas que DEMO_MODE reproduce sin costo ni clave.
CREATE TABLE grabaciones (
  clave TEXT PRIMARY KEY,
  modelo TEXT NOT NULL,
  datos TEXT NOT NULL,
  creada TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
