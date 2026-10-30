import type { MouseEvent } from 'react';
import type { Afirmacion, NivelCalculado } from '../nucleo/tipos';
import { InsigniaNivel } from './InsigniaNivel';
import { clavesDe } from './sesion';
import { TEXTOS } from './textos';

interface Props {
  afirmacion: Afirmacion;
  calculado: NivelCalculado | undefined;
  todas: readonly Afirmacion[];
  confirmadas: ReadonlySet<string>;
  iluminada: boolean;
  fijada: boolean;
  onAlternarConfirmacion: (clave: string) => void;
  onHover: (id: string | null) => void;
  onFijar: (id: string) => void;
}

export function TarjetaAfirmacion({
  afirmacion: a,
  calculado,
  todas,
  confirmadas,
  iluminada,
  fijada,
  onAlternarConfirmacion,
  onHover,
  onFijar,
}: Props) {
  const R = TEXTOS.resultados;
  const nivel = calculado?.nivel ?? 0;
  const claves = clavesDe(a.id, calculado, confirmadas);

  function alClic(e: MouseEvent<HTMLElement>) {
    if ((e.target as HTMLElement).closest('button')) return;
    if (window.getSelection()?.toString()) return;
    onFijar(a.id);
  }

  return (
    <article
      id={`af-${a.id}`}
      className={`afirmacion nivel-${nivel}${iluminada ? ' afirmacion--activa' : ''}${calculado?.contradicha ? ' afirmacion--contradicha' : ''}`}
      onMouseEnter={() => onHover(a.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(a.id)}
      onBlur={() => onHover(null)}
      onClick={alClic}
    >
      <header className="afirmacion__cabeza">
        <span className="id">{a.id}</span>
        <InsigniaNivel nivel={nivel} />
        {calculado?.contradicha && (
          <span className="marca-contradicha" title={R.contradichaAyuda}>
            <span aria-hidden="true">⚑</span> {R.contradicha}
          </span>
        )}
        <button
          type="button"
          className="boton boton--texto afirmacion__ubicar"
          aria-pressed={fijada}
          onClick={() => onFijar(a.id)}
        >
          {fijada ? R.ubicada : R.ubicar}
        </button>
      </header>

      <blockquote className="cita">
        <p>«{a.cita}»</p>
        <footer>{R.citaDe(a.hablante, a.rol)} · {a.oraciones.join(', ')}</footer>
      </blockquote>

      <p className="parafrasis">
        <span className="rotulo">{R.parafrasis}</span>
        {a.resumen}
      </p>

      <p className="meta-fila">
        <span className="rotulo">{R.tema}</span>
        <span className="etiqueta">{a.tema}</span>
        <span className="rotulo rotulo--sep">{R.modeloPropone}</span>
        <span className="suave">
          {R.tipoAfirmacion[a.tipo]} · {a.primeraMano ? R.primeraMano : R.deSegundaMano}
        </span>
      </p>

      {(a.alertas.length > 0 || a.rasgos.length > 0) && (
        <div className="senales">
          {a.alertas.length > 0 && (
            <ul className="alertas" aria-label={R.senalAfirmacion}>
              {a.alertas.map((al, i) => (
                <li key={`${al.tipo}-${i}`} className={`alerta alerta--${al.tipo}`}>
                  <span className="alerta__tipo">{TEXTOS.alertas[al.tipo]}</span>
                  <span className="alerta__marcador">«{al.marcador}»</span>
                </li>
              ))}
            </ul>
          )}
          {a.rasgos.length > 0 && (
            <p className="rasgos">
              {R.senalAfirmacion}: {a.rasgos.map((r) => TEXTOS.rasgos[r]).join(' / ')}
            </p>
          )}
        </div>
      )}

      {a.especificidad.length > 0 && (
        <p className="meta-fila">
          <span className="rotulo">{R.datosEspecificos}</span>
          {a.especificidad.map((d, i) => (
            <span key={`${d}-${i}`} className="etiqueta etiqueta--dato">
              {d}
            </span>
          ))}
        </p>
      )}

      {calculado && calculado.razones.length > 0 && (
        <div className="razones">
          <p className="rotulo">
            {R.razonesNivel} <span className="rotulo__nota">· {R.razonesCalculadas}</span>
          </p>
          <ul>
            {calculado.razones.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {claves.map((clave) => {
        const otroId = clave.split('|').find((x) => x !== a.id) ?? '';
        const otra = todas.find((x) => x.id === otroId);
        const confirmada = confirmadas.has(clave);
        const documental = a.tipoFuente === 'documento' || otra?.tipoFuente === 'documento';
        return (
          <div key={clave} className={`corroboracion${confirmada ? ' corroboracion--confirmada' : ''}`}>
            <p className="corroboracion__titulo">
              {confirmada ? TEXTOS.corroboracion.confirmada : documental ? TEXTOS.corroboracion.tituloDocumento : TEXTOS.corroboracion.titulo}
              <span className="corroboracion__con">{TEXTOS.corroboracion.conOtra(otroId, otra?.rol ?? '?')}</span>
            </p>
            {otra && <p className="corroboracion__resumen">{otra.resumen}</p>}
            <p className="ayuda">{TEXTOS.corroboracion.explicacion}</p>
            <button
              type="button"
              className={`boton ${confirmada ? 'boton--secundario' : ''}`}
              onClick={() => onAlternarConfirmacion(clave)}
            >
              {confirmada ? TEXTOS.corroboracion.deshacer : documental ? TEXTOS.corroboracion.confirmarDocumento : TEXTOS.corroboracion.confirmar}
            </button>
          </div>
        );
      })}
    </article>
  );
}
