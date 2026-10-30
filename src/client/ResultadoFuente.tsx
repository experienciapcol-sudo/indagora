import { useState } from 'react';
import type { Afirmacion, FuenteEntrada, NivelCalculado, RespuestaAnalisis } from '../nucleo/tipos';
import { formatoSegundos, formatoUsd } from './sesion';
import { TarjetaAfirmacion } from './TarjetaAfirmacion';
import { TEXTOS } from './textos';
import { Transcripcion } from './Transcripcion';

interface Props {
  fuente: FuenteEntrada;
  resp: RespuestaAnalisis;
  todas: readonly Afirmacion[];
  niveles: ReadonlyMap<string, NivelCalculado>;
  confirmadas: ReadonlySet<string>;
  onAlternarConfirmacion: (clave: string) => void;
}

export function ResultadoFuente({ fuente, resp, todas, niveles, confirmadas, onAlternarConfirmacion }: Props) {
  const R = TEXTOS.resultados;
  const [hover, setHover] = useState<string | null>(null);
  const [fijada, setFijada] = useState<string | null>(null);

  const idActiva = hover ?? fijada;
  const activa = resp.afirmaciones.find((a) => a.id === idActiva) ?? null;

  function alternarFijada(id: string) {
    setFijada((actual) => (actual === id ? null : id));
  }

  function elegirDesdeTranscripcion(id: string) {
    setFijada(id);
    const tarjeta = document.getElementById(`af-${id}`);
    const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
    tarjeta?.scrollIntoView({ block: 'nearest', behavior: reducir ? 'auto' : 'smooth' });
  }

  return (
    <section className="resultado" aria-labelledby={`r-${fuente.id}`}>
      <header className="resultado__cabeza">
        <span className="id id--grande">{fuente.id}</span>
        <div>
          <h3 id={`r-${fuente.id}`}>{fuente.titulo}</h3>
          <p className="resultado__meta">
            {TEXTOS.tipos[fuente.tipo]} · {fuente.rol} · {TEXTOS.modalidades[fuente.modalidad]}
          </p>
        </div>
        <p className="resultado__costo">
          {formatoUsd(resp.costoUsd)} · {formatoSegundos(resp.ms)}
        </p>
      </header>

      <div className="resultado__cuerpo">
        <div className="columna columna--transcripcion">
          <h4 className="subtitulo-columna">{R.transcripcion}</h4>
          <p className="ayuda">{R.leyendaTranscripcion}</p>
          <Transcripcion
            turnos={resp.turnos}
            oraciones={resp.oraciones}
            afirmaciones={resp.afirmaciones}
            niveles={niveles}
            activa={activa}
            onElegir={elegirDesdeTranscripcion}
          />
        </div>

        <div className="columna columna--afirmaciones">
          <h4 className="subtitulo-columna">
            {R.afirmaciones} <span className="contador-chico">{resp.afirmaciones.length}</span>
          </h4>
          {resp.afirmaciones.length === 0 && <p className="vacio">{R.sinAfirmaciones}</p>}
          <div className="afirmaciones">
            {resp.afirmaciones.map((a) => (
              <TarjetaAfirmacion
                key={a.id}
                afirmacion={a}
                calculado={niveles.get(a.id)}
                todas={todas}
                confirmadas={confirmadas}
                iluminada={a.id === idActiva}
                fijada={a.id === fijada}
                onAlternarConfirmacion={onAlternarConfirmacion}
                onHover={setHover}
                onFijar={alternarFijada}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
