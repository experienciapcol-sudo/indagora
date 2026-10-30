-- Grabaciones del agente, apartadas por caso. Una corrida del agente es una cadena: cada
-- llamada depende de lo que devolvieron las anteriores. Solo cuando el caso termina por el
-- criterio de paro se copian todas juntas a `grabaciones`, para que DEMO_MODE reproduzca una
-- corrida completa y coherente, nunca una mezcla de corridas distintas.
CREATE TABLE grabaciones_caso (
  caso TEXT NOT NULL,
  clave TEXT NOT NULL,
  modelo TEXT NOT NULL,
  datos TEXT NOT NULL,
  creada TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (caso, clave)
);
