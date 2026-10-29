import { Hono } from "hono";
import type { Bindings } from "./env";
import { rutasGasto } from "./rutas/gasto";

const app = new Hono<{ Bindings: Bindings }>();

// Estado del servicio
app.get("/api/salud", (c) =>
  c.json({ ok: true, nombre: "indagora", demo: c.env.DEMO_MODE === "true" }),
);

app.route("/api", rutasGasto);

// Errores: el detalle va al log, nunca a la respuesta
app.onError((err, c) => {
  console.error(JSON.stringify({ evento: "error", mensaje: err.message }));
  return c.json({ error: "Error interno" }, 500);
});

app.notFound((c) => c.json({ error: "No encontrado" }, 404));

export default app;
