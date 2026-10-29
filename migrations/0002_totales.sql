-- Total global acumulado en una fila, para no sumar toda la tabla de llamadas en cada reserva.
-- Se mantiene en la misma transacción que la reserva y el cierre de cada llamada.
CREATE TABLE totales (
  clave TEXT PRIMARY KEY,
  usd REAL NOT NULL
);

INSERT INTO totales (clave, usd) SELECT 'global', COALESCE(SUM(costo_usd), 0) FROM llamadas;

-- El total de una sesión se lee solo del índice.
DROP INDEX llamadas_por_sesion;
CREATE INDEX llamadas_por_sesion ON llamadas (sesion, costo_usd);
