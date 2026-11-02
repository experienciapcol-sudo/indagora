import { useEffect, useMemo, useRef, useState } from 'react';
import type { VistaAgente } from '../../nucleo/agente/tipos';
import { confirmarPar, crearAgente, darPaso, esAbortada, obtenerAgente } from './api';
import { ContextoEvidencia } from './ChipEvidencia';
import { ConsolaTraza } from './ConsolaTraza';
import { Criterio } from './Criterio';
import { VistaDesviacion } from './Desviacion';
import { DetalleEvidencia } from './DetalleEvidencia';
import { Ishikawa } from './Ishikawa';
import { columnasDePrueba, pasoSiguiente, seccionesDelMetodo } from './logica';
import { Presupuesto } from './Presupuesto';
import { PruebaCausas } from './PruebaCausas';
import { ReglaSeleccion } from './ReglaSeleccion';
import { Seccion } from './Seccion';
import { TablaEsNoEs } from './TablaEsNoEs';
import { PanelEntregables } from '../entregables/PanelEntregables';
import { TEXTOS_AGENTE } from './textos';
import { Verificaciones } from './Verificaciones';
import { Weisbord } from './Weisbord';
import './agente.css';

const CLAVE_SESION = 'indagora-agente';

// El id del agente vive en la sesión del navegador para sobrevivir a una recarga.
const guardarId = (id: string | null) => {
  try {
    if (id) sessionStorage.setItem(CLAVE_SESION, id);
    else sessionStorage.removeItem(CLAVE_SESION);
  } catch {
    // Sin almacenamiento disponible: no se retoma, pero todo lo demás funciona.
  }
};
const leerId = () => {
  try {
    return sessionStorage.getItem(CLAVE_SESION);
  } catch {
    return null;
  }
};

const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : '');

// `alGasto`: avisa al encabezado del gasto de la sesión después de cada respuesta.
export function PanelAgente({ alGasto }: { alGasto?: (g: VistaAgente['gasto']) => void }) {
  const T = TEXTOS_AGENTE;
  const [vista, setVista] = useState<VistaAgente | null>(null);
  const [iniciando, setIniciando] = useState(false);
  const [corriendo, setCorriendo] = useState<'bucle' | 'paso' | null>(null);
  const [pensando, setPensando] = useState<number | null>(null);
  const [deteniendo, setDeteniendo] = useState(false);
  const [error, setError] = useState('');
  const [abierta, setAbierta] = useState<string | null>(null);
  const [indicacion, setIndicacion] = useState('');

  // Las funciones asíncronas leen siempre la versión más reciente a través de estas referencias.
  const vistaRef = useRef<VistaAgente | null>(null);
  const ocupadoRef = useRef(false);
  const pararRef = useRef(false);
  const control = useRef<AbortController | null>(null);

  const fijarVista = (v: VistaAgente | null) => {
    if (v) alGasto?.(v.gasto);
    vistaRef.current = v;
    setVista(v);
  };

  // Retoma el agente de esta sesión si el servidor todavía lo tiene; si no, empieza en blanco.
  useEffect(() => {
    const id = leerId();
    if (!id) return;
    const controlador = new AbortController();
    obtenerAgente(id, controlador.signal)
      .then((v) => {
        if (!vistaRef.current) fijarVista(v);
      })
      .catch((e: unknown) => {
        if (!esAbortada(e)) guardarId(null);
      });
    return () => controlador.abort();
  }, []);

  useEffect(() => () => control.current?.abort(), []);

  async function iniciar() {
    if (ocupadoRef.current) return;
    if (vistaRef.current && vistaRef.current.estado.traza.length > 0 && !window.confirm(T.confirmarReinicio)) return;
    ocupadoRef.current = true;
    setIniciando(true);
    setError('');
    setAbierta(null);
    const controlador = new AbortController();
    control.current = controlador;
    try {
      const nueva = await crearAgente('taller', controlador.signal);
      fijarVista(nueva);
      guardarId(nueva.estado.id);
    } catch (e) {
      if (!esAbortada(e)) setError(T.errorInicio(mensajeDe(e)));
    } finally {
      ocupadoRef.current = false;
      setIniciando(false);
    }
  }

  // Un paso o el bucle de pasos. Se repite hasta que el agente termine, falle o el usuario pida parar.
  // «Detener» espera a que acabe el paso en curso: abortar a medio paso dejaría al servidor con el gasto hecho.
  async function avanzar(modo: 'bucle' | 'paso') {
    const inicial = vistaRef.current;
    if (!inicial || ocupadoRef.current || inicial.estado.terminado !== null) return;
    ocupadoRef.current = true;
    pararRef.current = false;
    setDeteniendo(false);
    setError('');
    setCorriendo(modo);
    const controlador = new AbortController();
    control.current = controlador;
    // La indicación va solo con el primer paso de esta tanda.
    let pendiente: string | null = indicacion.trim() || null;
    setIndicacion('');
    try {
      for (;;) {
        const actual = vistaRef.current!;
        setPensando(pasoSiguiente(actual.estado.traza, actual.estado.presupuesto));
        const resp = await darPaso(actual.estado.id, pendiente, controlador.signal);
        pendiente = null;
        fijarVista(resp.vista);
        if (resp.vista.estado.terminado !== null || modo === 'paso' || pararRef.current) break;
      }
    } catch (e) {
      if (!esAbortada(e)) setError(T.errorPaso(mensajeDe(e)));
      // Si el paso no llegó, la indicación vuelve al campo para no perderla.
      if (pendiente !== null) setIndicacion(pendiente);
    } finally {
      ocupadoRef.current = false;
      setPensando(null);
      setCorriendo(null);
      setDeteniendo(false);
    }
  }

  function detener() {
    pararRef.current = true;
    setDeteniendo(true);
  }

  async function confirmar(clave: string, confirmada: boolean) {
    const actual = vistaRef.current;
    if (!actual) return;
    fijarVista(await confirmarPar(actual.estado.id, clave, confirmada));
  }

  const contexto = useMemo(() => ({ niveles: vista?.niveles ?? {}, abrir: setAbierta }), [vista?.niveles]);

  const e = vista?.estado ?? null;
  const terminado = e?.terminado ?? null;
  const ocupado = iniciando || corriendo !== null;
  // Terminado salvo en espera del consultor: ya no hay pasos que correr.
  const finDefinitivo = terminado !== null && terminado.motivo !== 'espera';

  // Secciones del método en su orden (sin folios: el título basta, tarea 22).
  const secciones = e ? seccionesDelMetodo(e.seleccion, e.esNoEs, e.weisbord) : null;

  const columnas = e
    ? columnasDePrueba(e.esNoEs, e.weisbord, e.juicios, (d) => T.dimensiones[d], (c) => T.casillasWeisbord[c])
    : [];

  return (
    <section className="agente" aria-labelledby="t-agente">
      <div className="agente__cabeza">
        <div>
          <h2 id="t-agente">{T.titulo}</h2>
          {e ? (
            <div className="agente__caso">
              <p className="caso__marca">{T.casoFicticio}</p>
              <p className="caso__titulo">{e.titulo}</p>
              <p className="caso__objetivo">
                <span>{T.objetivo}</span>
                {e.objetivo}
              </p>
            </div>
          ) : (
            <p className="ayuda">{T.intro}</p>
          )}
        </div>

        <div className="agente__acciones">
          <button type="button" className={`boton${e ? ' boton--secundario' : ''}`} disabled={ocupado} onClick={() => void iniciar()}>
            {iniciando ? T.botones.iniciando : e ? T.botones.reiniciar : T.botones.iniciar}
          </button>
          {e && !finDefinitivo && (
            <>
              {corriendo === 'bucle' ? (
                <button type="button" className="boton boton--peligro" disabled={deteniendo} onClick={detener}>
                  {deteniendo ? T.botones.deteniendo : T.botones.detener}
                </button>
              ) : (
                <button type="button" className="boton" disabled={ocupado || terminado !== null} onClick={() => void avanzar('bucle')}>
                  {e.traza.length > 0 ? T.botones.correrOtra : T.botones.correr}
                </button>
              )}
              <button type="button" className="boton boton--secundario" disabled={ocupado || terminado !== null} onClick={() => void avanzar('paso')}>
                {T.botones.unPaso}
              </button>
            </>
          )}
        </div>
        {e && terminado === null && (
          <div className="agente__indicacion">
            <label htmlFor="indicacion">{T.indicacion.etiqueta}</label>
            <textarea
              id="indicacion"
              rows={2}
              maxLength={300}
              value={indicacion}
              placeholder={T.indicacion.ejemplo}
              disabled={ocupado}
              aria-describedby="indicacion-ayuda"
              onChange={(ev) => setIndicacion(ev.target.value)}
            />
            <p id="indicacion-ayuda" className="ayuda">
              {T.indicacion.ayuda}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="aviso-error" role="alert">
          <p>{error}</p>
          <p className="ayuda">{T.reintentarAyuda}</p>
        </div>
      )}
      {terminado && (
        <p className="aviso-estado" role="status">
          {terminado.motivo === 'espera' ? T.esperaAviso : T.terminadoAviso}
        </p>
      )}

      {!vista || !e ? (
        <p className="vacio">{T.sinAgente}</p>
      ) : (
        <ContextoEvidencia.Provider value={contexto}>
          <div className="agente__rejilla">
            <div className="agente__izq">
              <ConsolaTraza traza={e.traza} pensando={pensando} />
            </div>

            <div className="agente__der">
              <div className="agente__resumen">
                <Criterio criterio={vista.criterio} causas={e.causas} />
                <Presupuesto presupuesto={e.presupuesto} gasto={vista.gasto} />
              </div>

              <Seccion id="desviacion" titulo={T.secciones.desviacion.titulo} ayuda={T.secciones.desviacion.ayuda} vacia={e.desviacion === null}>
                {e.desviacion && <VistaDesviacion desviacion={e.desviacion} />}
              </Seccion>

              <Seccion id="seleccion" titulo={T.secciones.seleccion.titulo} ayuda={T.secciones.seleccion.ayuda} vacia={e.seleccion === null}>
                {e.seleccion && <ReglaSeleccion seleccion={e.seleccion} />}
              </Seccion>

              {secciones?.esNoEs && (
                <Seccion id="esnoes" titulo={T.secciones.esNoEs.titulo} ayuda={T.secciones.esNoEs.ayuda} vacia={!e.esNoEs || e.esNoEs.length === 0}>
                  {e.esNoEs && <TablaEsNoEs filas={e.esNoEs} />}
                </Seccion>
              )}

              {secciones?.weisbord && (
                <Seccion id="weisbord" titulo={T.secciones.weisbord.titulo} ayuda={T.secciones.weisbord.ayuda} vacia={!e.weisbord || e.weisbord.length === 0}>
                  {e.weisbord && <Weisbord hallazgos={e.weisbord} />}
                </Seccion>
              )}

              <Seccion id="ishikawa" titulo={T.secciones.ishikawa.titulo} ayuda={T.secciones.ishikawa.ayuda} vacia={e.causas.length === 0}>
                <Ishikawa desviacion={e.desviacion} espinas={e.seleccion?.espinas ?? 'seis_m'} causas={e.causas} evaluadas={vista.causas} />
              </Seccion>

              <Seccion id="prueba" titulo={T.secciones.prueba.titulo} ayuda={T.secciones.prueba.ayuda} vacia={e.causas.length === 0 || e.juicios.length === 0}>
                <PruebaCausas causas={e.causas} evaluadas={vista.causas} juicios={e.juicios} columnas={columnas} />
              </Seccion>

              <Seccion
                id="verificaciones"
                titulo={T.secciones.verificaciones.titulo}
                ayuda={T.secciones.verificaciones.ayuda}
                vacia={e.verificaciones.length + e.intervenciones.length + e.solicitudes.length === 0}
              >
                <Verificaciones verificaciones={e.verificaciones} intervenciones={e.intervenciones} solicitudes={e.solicitudes} causas={e.causas} />
              </Seccion>
            </div>
          </div>

          <PanelEntregables vista={vista} />

          {abierta && (
            <DetalleEvidencia
              key={abierta}
              id={abierta}
              afirmacion={e.afirmaciones.find((x) => x.id === abierta)}
              calculado={vista.niveles[abierta]}
              todas={e.afirmaciones}
              confirmadas={e.confirmadas}
              ocupado={ocupado}
              onConfirmar={confirmar}
              onCerrar={() => setAbierta(null)}
            />
          )}
        </ContextoEvidencia.Provider>
      )}
    </section>
  );
}
