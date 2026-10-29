-- Límite de llamadas por cliente en ventanas fijas. La clave es un hash, nunca la IP.
CREATE TABLE limites (
  clave TEXT NOT NULL,
  ventana INTEGER NOT NULL,
  n INTEGER NOT NULL,
  PRIMARY KEY (clave, ventana)
);

CREATE INDEX limites_por_ventana ON limites (ventana);
