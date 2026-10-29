import { useEffect, useState } from "react";

type Salud = { ok: boolean; nombre: string; demo: boolean };
type Estado = { tipo: "cargando" } | { tipo: "ok"; salud: Salud } | { tipo: "error" };
type Gasto = { sesionUsd: number; globalUsd: number; llamadasSesion: number; topes: { sesionUsd: number; globalUsd: number } };
type Prueba = {
  oracion: string;
  resultado: { tipo: string; razon: string };
  modelo: string;
  costoUsd: number;
  demo: boolean;
  ms: number;
};
type EstadoPrueba = { tipo: "inactiva" } | { tipo: "corriendo" } | { tipo: "ok"; prueba: Prueba } | { tipo: "error"; mensaje: string };

const usd = (n: number) => `${n.toFixed(4)} USD`;

export default function App() {
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [gasto, setGasto] = useState<Gasto | null>(null);
  const [prueba, setPrueba] = useState<EstadoPrueba>({ tipo: "inactiva" });

  const cargarGasto = () =>
    fetch("/api/gasto")
      .then((r) => (r.ok ? (r.json() as Promise<Gasto>) : null))
      .then(setGasto)
      .catch(() => setGasto(null));

  useEffect(() => {
    const controlador = new AbortController();
    fetch("/api/salud", { signal: controlador.signal })
      .then((r) => (r.ok ? (r.json() as Promise<Salud>) : Promise.reject(new Error("http"))))
      .then((salud) => setEstado({ tipo: "ok", salud }))
      .catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === "AbortError")) setEstado({ tipo: "error" });
      });
    cargarGasto();
    return () => controlador.abort();
  }, []);

  async function correrPrueba() {
    setPrueba({ tipo: "corriendo" });
    try {
      const r = await fetch("/api/prueba", { method: "POST" });
      const cuerpo = await r.json();
      setPrueba(r.ok ? { tipo: "ok", prueba: cuerpo as Prueba } : { tipo: "error", mensaje: cuerpo.error ?? `Error ${r.status}` });
    } catch {
      setPrueba({ tipo: "error", mensaje: "No hay conexión con el servicio." });
    }
    cargarGasto();
  }

  return (
    <main className="pagina">
      <h1>Indagora</h1>
      <p className="subtitulo">diagnóstico organizacional basado en evidencia</p>

      <section className="recuadro" aria-live="polite">
        <h2>Estado del servicio</h2>
        {estado.tipo === "cargando" && <p>Consultando…</p>}
        {estado.tipo === "error" && <p className="falla">No hay conexión con el servicio.</p>}
        {estado.tipo === "ok" && (
          <p>
            <span className="punto" aria-hidden="true" /> Servicio activo.{" "}
            {estado.salud.demo ? "Modo demostración: sin costo." : "Modo real."}
          </p>
        )}
      </section>

      <section className="recuadro" aria-live="polite">
        <h2>Llamada de prueba a Meta</h2>
        <p className="suave">Clasifica una oración ficticia fija. Cuesta menos de una milésima de dólar.</p>
        <button type="button" onClick={correrPrueba} disabled={prueba.tipo === "corriendo"}>
          {prueba.tipo === "corriendo" ? "Llamando…" : "Hacer la llamada"}
        </button>
        {prueba.tipo === "error" && <p className="falla">{prueba.mensaje}</p>}
        {prueba.tipo === "ok" && (
          <dl>
            <dt>Oración</dt>
            <dd>{prueba.prueba.oracion}</dd>
            <dt>Clasificación</dt>
            <dd>
              {prueba.prueba.resultado.tipo}: {prueba.prueba.resultado.razon}
            </dd>
            <dt>Modelo y costo</dt>
            <dd>
              {prueba.prueba.modelo} · {usd(prueba.prueba.costoUsd)} · {(prueba.prueba.ms / 1000).toFixed(1)} s
              {prueba.prueba.demo && " · grabada"}
            </dd>
          </dl>
        )}
      </section>

      {gasto && (
        <section className="recuadro">
          <h2>Gasto registrado</h2>
          <p>
            Esta sesión: {usd(gasto.sesionUsd)} de {usd(gasto.topes.sesionUsd)} ({gasto.llamadasSesion} llamadas)
          </p>
          <p>
            Global: {usd(gasto.globalUsd)} de {usd(gasto.topes.globalUsd)}
          </p>
        </section>
      )}
    </main>
  );
}
