import { useEffect, useRef, useState } from 'react';
import type { EventoTraza } from '../../nucleo/agente/tipos';
import { formatoSegundos, formatoUsd } from '../sesion';
import { ListaChips } from './ChipEvidencia';
import { contarRechazos, parametrosLegibles } from './logica';
import { TEXTOS_AGENTE } from './textos';
import { IconoAlerta, IconoCheck, IconoFlecha, IconoInfo, IconoParar, IconoReloj, IconoX } from '../Iconos';

interface Props {
  traza: readonly EventoTraza[];
  // Número del paso que se está pensando, o null si no corre ninguno.
  pensando: number | null;
}

// Margen en píxeles bajo el cual se considera que el usuario sigue «pegado» al final.
const MARGEN_FINAL = 48;

export function ConsolaTraza({ traza, pensando }: Props) {
  const C = TEXTOS_AGENTE.consola;
  const { total, porOrigen } = contarRechazos(traza);
  const caja = useRef<HTMLDivElement>(null);
  const [pegado, setPegado] = useState(true);

  // Auto-scroll al final, salvo que el usuario haya subido a leer.
  useEffect(() => {
    const el = caja.current;
    if (el && pegado) el.scrollTop = el.scrollHeight;
  }, [traza.length, pensando, pegado]);

  function alDesplazar() {
    const el = caja.current;
    if (el) setPegado(el.scrollHeight - el.scrollTop - el.clientHeight <= MARGEN_FINAL);
  }

  return (
    <section className="consola" aria-labelledby="t-consola">
      <header className="consola__cabeza">
        <h3 id="t-consola">{C.titulo}</h3>
        <p className={`consola__rechazos${total > 0 ? ' consola__rechazos--hay' : ''}`}>
          {total > 0 ? <IconoX /> : <IconoInfo />}
          <strong>{total > 0 ? C.contadorRechazos(total) : C.contadorCero}</strong>
          {total > 0 && <span>{C.desglose(porOrigen.guarda, porOrigen.evidencia, porOrigen.verificador)}</span>}
        </p>
      </header>

      <div
        ref={caja}
        className="consola__registro"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={C.registro}
        tabIndex={0}
        onScroll={alDesplazar}
      >
        {traza.length === 0 && pensando === null && <p className="consola__vacia">{C.vacia}</p>}

        {traza.map((e, i) => (
          <div key={e.n}>
            {(i === 0 || traza[i - 1].paso !== e.paso) && <p className="consola__paso">{C.paso(e.paso)}</p>}
            <Evento e={e} />
          </div>
        ))}

        {pensando !== null && (
          <div>
            {traza.length === 0 || traza[traza.length - 1].paso !== pensando ? <p className="consola__paso">{C.paso(pensando)}</p> : null}
            <p className="evento evento--pensando" role="status">
              <span className="evento__marca"><IconoReloj /></span>
              <span className="evento__cuerpo">
                {C.pensando(pensando)} <span className="evento__nota">{C.pensandoAyuda}</span>
              </span>
            </p>
          </div>
        )}
      </div>

      {!pegado && (
        <button
          type="button"
          className="boton boton--secundario consola__bajar"
          onClick={() => {
            setPegado(true);
            const el = caja.current;
            if (el) el.scrollTop = el.scrollHeight;
          }}
        >
          {C.bajarAlFinal}
        </button>
      )}
    </section>
  );
}

function Evento({ e }: { e: EventoTraza }) {
  const T = TEXTOS_AGENTE;
  const C = T.consola;

  if (e.tipo === 'decision') {
    const parametros = parametrosLegibles(e.parametros);
    return (
      <article className="evento evento--decision">
        <span className="evento__marca"><IconoFlecha /></span>
        <div className="evento__cuerpo">
          <p className="evento__titulo">
            <span className="evento__rotulo">{C.decide}</span>
            <strong>{T.acciones[e.accion]}</strong>
            {parametros && <code className="evento__param">{parametros}</code>}
          </p>
          <p className="evento__texto">{e.justificacion}</p>
          <div className="evento__punteros">
            <span className="evento__rotulo">{C.punteros}</span>
            {e.punteros.length > 0 ? <ListaChips ids={e.punteros} /> : <span className="evento__nota">{C.sinPunteros}</span>}
          </div>
        </div>
      </article>
    );
  }

  if (e.tipo === 'rechazo') {
    return (
      <article className="evento evento--rechazo" role="group" aria-label={`${C.rechazado}: ${T.motivos[e.motivo]}`}>
        <span className="evento__marca"><IconoX /></span>
        <div className="evento__cuerpo">
          <p className="evento__titulo">
            <span className="evento__sello">{C.rechazado}</span>
            <span className="evento__origen">{T.origen[e.origen]}</span>
            {e.accion && (
              <span className="evento__nota">
                {C.intento}: {T.acciones[e.accion]}
              </span>
            )}
          </p>
          <p className="evento__motivo">{T.motivos[e.motivo]}</p>
          {e.detalle && <p className="evento__detalle">{e.detalle}</p>}
        </div>
      </article>
    );
  }

  if (e.tipo === 'resultado') {
    return (
      <article className="evento evento--resultado">
        <span className="evento__marca"><IconoCheck /></span>
        <div className="evento__cuerpo">
          <p className="evento__titulo">
            <span className="evento__rotulo">{C.resultado}</span>
            <strong>{T.acciones[e.accion]}</strong>
          </p>
          <p className="evento__texto">{e.resumen}</p>
          <p className="evento__meta">
            <span>{formatoUsd(e.costoUsd)}</span>
            <span>{formatoSegundos(e.ms)}</span>
            {e.demo && <span className="evento__grabada">{C.grabada}</span>}
          </p>
        </div>
      </article>
    );
  }

  if (e.tipo === 'indicacion') {
    return (
      <article className="evento evento--indicacion">
        <span className="evento__marca"><IconoFlecha /></span>
        <div className="evento__cuerpo">
          <p className="evento__titulo">
            <span className="evento__rotulo">{C.indicacion}</span>
          </p>
          <p className="evento__texto">«{e.texto}»</p>
        </div>
      </article>
    );
  }

  if (e.tipo === 'fin') {
    return (
      <article className="evento evento--fin" role="group" aria-label={T.fin.titulo}>
        <span className="evento__marca"><IconoParar /></span>
        <div className="evento__cuerpo">
          <p className="evento__titulo">
            <strong>{T.fin.motivos[e.motivo]}</strong>
          </p>
          {e.detalle && <p className="evento__texto">{e.detalle}</p>}
        </div>
      </article>
    );
  }

  return (
    <article className="evento evento--error" role="group" aria-label={C.errorFila}>
      <span className="evento__marca"><IconoAlerta /></span>
      <div className="evento__cuerpo">
        <p className="evento__titulo">
          <span className="evento__sello">{C.errorFila}</span>
          {e.accion && <span className="evento__nota">{T.acciones[e.accion]}</span>}
        </p>
        <p className="evento__detalle">{e.detalle}</p>
      </div>
    </article>
  );
}
