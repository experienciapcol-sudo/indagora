import { useEffect, useMemo, useRef, useState } from 'react';
import type { FuenteEntrada } from '../nucleo/tipos';
import { calcularNiveles } from '../nucleo/niveles';
import { CASO_TALLER } from '../nucleo/casos/taller';
import { analizarFuente, esAbortada, obtenerGasto, obtenerSalud } from './api';
import type { Gasto } from './api';
import { PanelAgente } from './agente/PanelAgente';
import { Pestanas } from './agente/Pestanas';
import type { Pestana } from './agente/Pestanas';
import { Encabezado } from './Encabezado';
import type { EstadoServicio } from './Encabezado';
import { PanelLaboratorio } from './laboratorio/PanelLaboratorio';
import { PanelFlujo } from './flujo/PanelFlujo';
import { TEXTOS_FLUJO } from './flujo/textos';
import { siguienteId as siguienteIdFuente } from './sesion';
import { PanelAnalisis } from './PanelAnalisis';
import { PanelFuentes } from './PanelFuentes';
import type { InfoCaso } from './PanelFuentes';
import { Rechazos } from './Rechazos';
import { ResultadoFuente } from './ResultadoFuente';
import { afirmacionesListas, descargarJson, previasDe, sinReferenciasA } from './sesion';
import type { EstadoFuente, EstadosPorFuente } from './sesion';
import { TEXTOS } from './textos';

export default function App() {
  const T = TEXTOS;
  const [servicio, setServicio] = useState<EstadoServicio>({ tipo: 'cargando' });
  const [gasto, setGasto] = useState<Gasto | null>(null);
  const [fuentes, setFuentes] = useState<FuenteEntrada[]>([]);
  const [caso, setCaso] = useState<InfoCaso | null>(null);
  const [estados, setEstados] = useState<EstadosPorFuente>({});
  const [confirmadas, setConfirmadas] = useState<ReadonlySet<string>>(() => new Set());
  const [analizando, setAnalizando] = useState(false);
  const [deteniendo, setDeteniendo] = useState(false);
  const [aviso, setAviso] = useState('');
  const [pestana, setPestana] = useState<Pestana>('agente');
  // Desde un enlace o botón: cambia de pestaña y lleva el foco a ella, arriba.
  const irAPestana = (p: Pestana) => {
    setPestana(p);
    const boton = document.getElementById(`pestana-${p}`);
    boton?.focus();
    boton?.scrollIntoView({ block: 'start' });
  };

  // El bucle de análisis lee siempre el estado más reciente a través de esta referencia.
  const estadosRef = useRef<EstadosPorFuente>({});
  const control = useRef<AbortController | null>(null);

  const fijarEstado = (id: string, estado: EstadoFuente | null) => {
    const siguiente = { ...estadosRef.current };
    if (estado) siguiente[id] = estado;
    else delete siguiente[id];
    estadosRef.current = siguiente;
    setEstados(siguiente);
  };
  const reiniciarEstados = (siguiente: EstadosPorFuente) => {
    estadosRef.current = siguiente;
    setEstados(siguiente);
  };

  useEffect(() => {
    const controlador = new AbortController();
    obtenerSalud(controlador.signal)
      .then((salud) => setServicio({ tipo: 'ok', salud }))
      .catch((e: unknown) => {
        if (!esAbortada(e)) setServicio({ tipo: 'error' });
      });
    obtenerGasto(controlador.signal)
      .then(setGasto)
      .catch(() => undefined);
    return () => controlador.abort();
  }, []);

  const todas = useMemo(() => afirmacionesListas(fuentes, estados), [fuentes, estados]);
  const niveles = useMemo(() => calcularNiveles(todas, confirmadas), [todas, confirmadas]);

  const fuentesListas = fuentes.filter((f) => estados[f.id]?.tipo === 'lista');

  // ---- fuentes ----
  function agregarFuente(f: FuenteEntrada) {
    setFuentes((previas) => [...previas, f]);
  }

  function quitarFuente(id: string) {
    setFuentes((previas) => previas.filter((f) => f.id !== id));
    fijarEstado(id, null);
    reiniciarEstados(sinReferenciasA(estadosRef.current, id));
    setConfirmadas((previas) => new Set([...previas].filter((k) => !k.split('|').some((x) => x.startsWith(`${id}-`)))));
    if (fuentes.length <= 1) setCaso(null);
  }

  function cargarCaso() {
    if (fuentesListas.length > 0 && !window.confirm(T.fuentes.confirmarReemplazo)) return;
    setFuentes(CASO_TALLER.fuentes.map((f) => ({ ...f })));
    setCaso({ titulo: CASO_TALLER.titulo, objetivo: CASO_TALLER.objetivo, descripcion: CASO_TALLER.descripcion });
    reiniciarEstados({});
    setConfirmadas(new Set());
    setAviso('');
  }

  // ---- análisis ----
  async function ejecutar(ids: readonly string[]) {
    const lote = fuentes.filter((f) => ids.includes(f.id));
    if (lote.length === 0) return;
    const controlador = new AbortController();
    control.current = controlador;
    setAnalizando(true);
    setDeteniendo(false);
    setAviso('');
    for (const f of lote) fijarEstado(f.id, { tipo: 'pendiente' });

    let errores = 0;
    for (const f of lote) {
      if (controlador.signal.aborted) break;
      fijarEstado(f.id, { tipo: 'analizando' });
      try {
        const previas = previasDe(afirmacionesListas(fuentes, estadosRef.current, f.id));
        const resp = await analizarFuente({ fuente: f, previas }, controlador.signal);
        fijarEstado(f.id, { tipo: 'lista', resp });
        setGasto((g) => (g ? { ...g, ...resp.gasto } : g));
      } catch (e) {
        if (esAbortada(e)) {
          fijarEstado(f.id, { tipo: 'pendiente' });
          break;
        }
        errores += 1;
        fijarEstado(f.id, { tipo: 'error', mensaje: e instanceof Error ? e.message : T.errores.sinConexion });
      }
    }

    const detenido = controlador.signal.aborted;
    control.current = null;
    setAnalizando(false);
    setDeteniendo(false);
    setAviso(detenido ? T.analisis.detenido : errores > 0 ? T.analisis.terminadoConErrores(errores) : T.analisis.terminado);
    obtenerGasto()
      .then((g) => g && setGasto(g))
      .catch(() => undefined);
  }

  const analizarPendientes = () => void ejecutar(fuentes.filter((f) => estadosRef.current[f.id]?.tipo !== 'lista').map((f) => f.id));

  function reanalizarTodo() {
    reiniciarEstados({});
    setConfirmadas(new Set());
    void ejecutar(fuentes.map((f) => f.id));
  }

  function detener() {
    setDeteniendo(true);
    control.current?.abort();
  }

  // ---- corroboraciones ----
  function alternarConfirmacion(clave: string) {
    setConfirmadas((previas) => {
      const siguiente = new Set(previas);
      if (!siguiente.delete(clave)) siguiente.add(clave);
      return siguiente;
    });
  }

  // ---- exportar ----
  function exportar() {
    descargarJson(T.exportar.archivo, {
      formato: 'indagora-sesion',
      version: 1,
      exportadoEn: new Date().toISOString(),
      caso: caso ?? null,
      fuentes,
      resultados: fuentes.map((f) => {
        const e = estados[f.id];
        if (e?.tipo === 'lista') return { fuente: f.id, estado: 'lista', respuesta: e.resp };
        if (e?.tipo === 'error') return { fuente: f.id, estado: 'error', mensaje: e.mensaje };
        return { fuente: f.id, estado: 'pendiente' };
      }),
      confirmadas: [...confirmadas].sort(),
      niveles: [...niveles].map(([id, n]) => ({ id, ...n })),
    });
  }

  const grupos = fuentesListas.flatMap((f) => {
    const e = estados[f.id];
    return e?.tipo === 'lista' ? [{ fuente: f, rechazos: e.resp.rechazos }] : [];
  });

  return (
    <div className="pagina">
      <Encabezado servicio={servicio} gasto={gasto} />
      <p className="regla-nivel">
        {T.reglaNivel}
        <button type="button" className="enlace-flujo" onClick={() => irAPestana('flujo')}>{TEXTOS_FLUJO.enlace}</button>
      </p>
      <Pestanas activa={pestana} onCambiar={setPestana} />

      <main>
        <div role="tabpanel" id="panel-agente" aria-labelledby="pestana-agente" hidden={pestana !== 'agente'}>
          <PanelAgente alGasto={(g) => setGasto((x) => (x ? { ...x, ...g } : x))} />
        </div>

        <div role="tabpanel" id="panel-laboratorio" aria-labelledby="pestana-laboratorio" hidden={pestana !== 'laboratorio'}>
          <PanelLaboratorio
            siguienteIdFuente={siguienteIdFuente(fuentes, 'entrevista')}
            onFuenteReal={(fuente) => {
              agregarFuente(fuente);
              setPestana('evidencia');
            }}
          />
        </div>

        <div role="tabpanel" id="panel-flujo" aria-labelledby="pestana-flujo" hidden={pestana !== 'flujo'}>
          <PanelFlujo onIrAlAgente={() => irAPestana('agente')} />
        </div>

        <div role="tabpanel" id="panel-evidencia" aria-labelledby="pestana-evidencia" hidden={pestana !== 'evidencia'}>
          <PanelFuentes
            fuentes={fuentes}
            caso={caso}
            bloqueado={analizando}
            onAgregar={agregarFuente}
            onQuitar={quitarFuente}
            onCargarCaso={cargarCaso}
          />

          <PanelAnalisis
            fuentes={fuentes}
            estados={estados}
            analizando={analizando}
            deteniendo={deteniendo}
            aviso={aviso}
            onAnalizar={analizarPendientes}
            onReanalizar={reanalizarTodo}
            onDetener={detener}
          />

          {fuentesListas.length === 1 && (
            <p className="aviso-fijo" role="note">
              {T.avisoUnaFuente}
            </p>
          )}

          {fuentesListas.length > 0 && <Rechazos grupos={grupos} />}

          {fuentesListas.length > 0 && (
            <section className="panel panel--resultados" aria-labelledby="t-resultados">
              <div className="panel__cabeza">
                <h2 id="t-resultados">{T.resultados.titulo}</h2>
                <button type="button" className="boton boton--secundario panel__accion" onClick={exportar}>
                  {T.exportar.boton}
                </button>
              </div>
              <p className="ayuda">{T.exportar.ayuda}</p>

              {fuentesListas.map((f) => {
                const e = estados[f.id];
                if (e?.tipo !== 'lista') return null;
                return (
                  <ResultadoFuente
                    key={f.id}
                    fuente={f}
                    resp={e.resp}
                    todas={todas}
                    niveles={niveles}
                    confirmadas={confirmadas}
                    onAlternarConfirmacion={alternarConfirmacion}
                  />
                );
              })}
            </section>
          )}
        </div>
      </main>

      <footer className="pie">{T.pie}</footer>
    </div>
  );
}
