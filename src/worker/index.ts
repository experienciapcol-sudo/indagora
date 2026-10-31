import { Hono } from "hono";
import { rutasAgente } from "./rutas/agente";
import { rutasEntregables } from "./rutas/entregables";
import { rutasAnalizar } from "./rutas/analizar";
import { rutasGasto } from "./rutas/gasto";
import { conSesion, type Ambiente } from "./rutas/sesion";

const app = new Hono<Ambiente>();

// Una sola sesión anónima por petición, para todas las rutas de la API
app.use("/api/*", conSesion);

// Estado del servicio
app.get("/api/salud", (c) =>
  c.json({ ok: true, nombre: "indagora", demo: c.env.DEMO_MODE === "true" }),
);

app.route("/api", rutasGasto);
app.route("/api", rutasAnalizar);
app.route("/api", rutasAgente);
app.route("/api", rutasEntregables);

// Errores: el detalle va al log, nunca a la respuesta
app.onError((err, c) => {
  console.error(JSON.stringify({ evento: "error", mensaje: err.message }));
  return c.json({ error: "Error interno" }, 500);
});

app.notFound((c) => c.json({ error: "No encontrado" }, 404));

export default app;
