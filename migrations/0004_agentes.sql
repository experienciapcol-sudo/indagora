-- Estado de cada caso del agente (F4). El estado completo va en JSON: lo escribe solo el
-- Worker, nunca el navegador, para que el código sea la única autoridad sobre lo que pasó.
-- `version` evita que dos pasos pisen el estado; `ocupado_hasta` impide correr dos pasos a la vez.
CREATE TABLE agentes (
  id TEXT PRIMARY KEY,
  sesion TEXT NOT NULL,
  creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  actualizado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  version INTEGER NOT NULL DEFAULT 1,
  ocupado_hasta INTEGER,
  estado TEXT NOT NULL
);

CREATE INDEX agentes_por_sesion ON agentes (sesion);
