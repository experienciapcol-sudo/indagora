import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { rutasAgente } from "./rutas/agente";
import { rutasEntregables } from "./rutas/entregables";
import { rutasLaboratorio } from "./rutas/laboratorio";
import { rutasAnalizar } from "./rutas/analizar";
import { rutasGasto } from "./rutas/gasto";
import { conSesion, type Ambiente } from "./rutas/sesion";

const app = new Hono<Ambiente>();

// Estado del servicio; va antes de la sesión para no crear una en cada sondeo
app.get("/api/salud", (c) =>
  c.json({ ok: true, nombre: "indagora", demo: c.env.DEMO_MODE === "true" }),
);

// Tope de cuerpo antes de leerlo: 33 MB para el audio (32 MB más el multipart), 1 MB el resto.
// bodyLimit también corta un cuerpo sin Content-Length mientras llega.
const limiteAudio = bodyLimit({ maxSize: 33 * 1024 * 1024, onError: (c) => c.json({ error: "El audio supera 32 MB." }, 413) });
const limiteJson = bodyLimit({ maxSize: 1024 * 1024, onError: (c) => c.json({ error: "La petición es demasiado grande." }, 413) });
app.use("/api/*", (c, next) => (c.req.path === "/api/voz/transcribir" ? limiteAudio(c, next) : limiteJson(c, next)));

// Una sola sesión anónima por petición, para todas las rutas de la API
app.use("/api/*", conSesion);

app.route("/api", rutasGasto);
app.route("/api", rutasAnalizar);
app.route("/api", rutasAgente);
app.route("/api", rutasEntregables);
app.route("/api", rutasLaboratorio);

// Errores: el detalle va al log, nunca a la respuesta
app.onError((err, c) => {
  console.error(JSON.stringify({ evento: "error", mensaje: err.message }));
  return c.json({ error: "Error interno" }, 500);
});

app.notFound((c) => c.json({ error: "No encontrado" }, 404));

export default app;
