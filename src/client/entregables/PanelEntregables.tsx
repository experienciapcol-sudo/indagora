import { useEffect, useMemo, useRef, useState } from 'react';
import type { VistaAgente } from '../../nucleo/agente/tipos';
import { huellaDeEstado } from '../../nucleo/entregables/generar';
import type { EntregablesCaso } from '../../nucleo/entregables/tipos';
import { esAbortada } from '../api';
import { generarEntregablesApi, obtenerEntregables } from './api';
import { Informe } from './Informe';
import { TEXTOS_ENTREGABLES } from './textos';
import { VistaGuia } from './VistaGuia';
import { VistaIndicadores } from './VistaIndicadores';
import { VistaIntervencion } from './VistaIntervencion';
import { VistaPareto } from './VistaPareto';
import { VistaVerificacion } from './VistaVerificacion';
import './entregables.css';

const T = TEXTOS_ENTREGABLES;
const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : '');

// Sección F5: solo con el caso terminado (criterio o espera) y al menos una causa en el estado.
export function PanelEntregables({ vista }: { vista: VistaAgente }) {
  const [entregables, setEntregables] = useState<EntregablesCaso | null>(null);
  const [desactualizado, setDesactualizado] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');
  const control = useRef<AbortController | null>(null);

  const huella = useMemo(() => huellaDeEstado(vista), [vista]);
  const agenteId = vista.estado.id;
  const visible = vista.estado.terminado !== null && vista.estado.causas.length > 0;

  useEffect(() => {
    if (!visible) return;
    const controlador = new AbortController();
    control.current = controlador;
    obtenerEntregables(agenteId, controlador.signal)
      .then((r) => {
        if (!r) {
          setEntregables(null);
          setDesactualizado(false);
          return;
        }
        setEntregables(r.entregables);
        setDesactualizado(r.desactualizado || r.entregables.huellaEstado !== huella);
      })
      .catch((e: unknown) => {
        if (!esAbortada(e)) setError(T.errorCargar);
      });
    return () => controlador.abort();
    // La huella capta cualquier cambio del estado que invalide lo guardado.
  }, [agenteId, huella, visible]);

  if (!visible) return null;

  async function generar() {
    setGenerando(true);
    setError('');
    const controlador = new AbortController();
    control.current = controlador;
    try {
      const r = await generarEntregablesApi(agenteId, entregables !== null, controlador.signal);
      setEntregables(r.entregables);
      setDesactualizado(r.desactualizado);
    } catch (e) {
      if (!esAbortada(e)) setError(T.errorGenerar(mensajeDe(e)));
    } finally {
      setGenerando(false);
    }
  }

  const fecha = entregables?.generadoEn
    ? new Date(entregables.generadoEn).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })
    : '';

  return (
    <section className="panel-entregables" aria-labelledby="t-entregables">
      <header className="panel-entregables__cabeza">
        <div>
          <h3 id="t-entregables">{T.titulo}</h3>
          <p className="ayuda">{T.ayuda}</p>
        </div>
        <button type="button" className="boton" disabled={generando} onClick={() => void generar()}>
          {generando ? T.generando : entregables ? T.botonRegenerar : T.botonGenerar}
        </button>
      </header>

      {error && <p className="aviso-error" role="alert">{error}</p>}
      {desactualizado && entregables && <p className="aviso-estado" role="status">{T.desactualizado}</p>}
      {entregables?.demo && <p className="aviso-estado" role="status">{T.demo}</p>}
      {entregables && (
        <p className="ayuda">
          {fecha ? `${T.generadoEn(fecha)} · ` : ''}{T.costo(entregables.costoUsd)}
          {entregables.rechazos.length > 0 ? ` · ${T.rechazos(entregables.rechazos.length)}` : ''}
        </p>
      )}

      {!entregables ? (
        <p className="vacio">{T.aunNo}. {T.aunNoAyuda}</p>
      ) : (
        <div className="entregables__rejilla">
          <VistaVerificacion planes={entregables.verificaciones} />
          <VistaIntervencion plan={entregables.intervencion} motivo={entregables.motivoSinIntervencion} />
          <VistaIndicadores fichas={entregables.indicadores} />
          <VistaPareto pareto={entregables.pareto} motivo={entregables.motivoSinPareto} />
          <VistaGuia guia={entregables.guia} />
          <Informe markdown={entregables.informeMarkdown} titulo={vista.estado.titulo} />
        </div>
      )}
    </section>
  );
}
