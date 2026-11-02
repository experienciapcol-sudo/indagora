import type { Gasto, Salud } from './api';
import { formatoUsd } from './sesion';
import { TEXTOS } from './textos';
import { cambiarIdioma, idioma } from './idioma';

export type EstadoServicio = { tipo: 'cargando' } | { tipo: 'ok'; salud: Salud } | { tipo: 'error' };

interface Props {
  servicio: EstadoServicio;
  gasto: Gasto | null;
}

export function Encabezado({ servicio, gasto }: Props) {
  const T = TEXTOS;
  const proporcion = gasto && gasto.topes.sesionUsd > 0 ? Math.min(1, gasto.sesionUsd / gasto.topes.sesionUsd) : 0;

  let etiqueta: string = T.servicio.cargando;
  let clase = 'sello sello--espera';
  if (servicio.tipo === 'error') {
    etiqueta = T.servicio.sinConexion;
    clase = 'sello sello--falla';
  } else if (servicio.tipo === 'ok') {
    etiqueta = servicio.salud.demo ? T.servicio.demo : T.servicio.real;
    clase = servicio.salud.demo ? 'sello sello--demo' : 'sello sello--real';
  }

  return (
    <header className="encabezado">
      <div className="encabezado__marca">
        <h1>{T.marca}</h1>
        <p className="encabezado__sub">{T.subtitulo}</p>
      </div>

      <div className="encabezado__estado">
        <div className="encabezado__idiomas" role="group" aria-label="Idioma / Language">
          <button
            type="button"
            className={`boton boton--secundario${idioma === 'es' ? ' boton--activo' : ''}`}
            aria-pressed={idioma === 'es'}
            disabled={idioma === 'es'}
            onClick={() => cambiarIdioma('es')}
          >
            ES
          </button>
          <button
            type="button"
            className={`boton boton--secundario${idioma === 'en' ? ' boton--activo' : ''}`}
            aria-pressed={idioma === 'en'}
            disabled={idioma === 'en'}
            onClick={() => cambiarIdioma('en')}
          >
            EN
          </button>
        </div>

        <p className={clase} role="status" aria-label={`${T.servicio.etiqueta}: ${etiqueta}`}>
          <span className="sello__punto" aria-hidden="true" />
          {etiqueta}
        </p>

        <div className="gasto">
          <div className="gasto__linea">
            <span className="gasto__titulo">{T.gasto.titulo}</span>
            {gasto ? (
              <span className="gasto__cifra">
                {T.gasto.de(formatoUsd(gasto.sesionUsd), formatoUsd(gasto.topes.sesionUsd))} · {T.gasto.llamadas(gasto.llamadasSesion)}
              </span>
            ) : (
              <span className="gasto__cifra suave">{T.gasto.noDisponible}</span>
            )}
          </div>
          <div
            className="gasto__barra"
            role="meter"
            aria-label={T.gasto.titulo}
            aria-valuemin={0}
            aria-valuemax={gasto?.topes.sesionUsd ?? 0}
            aria-valuenow={gasto?.sesionUsd ?? 0}
          >
            <span style={{ width: `${(proporcion * 100).toFixed(2)}%` }} className={proporcion > 0.8 ? 'alto' : ''} />
          </div>
        </div>
      </div>
    </header>
  );
}
