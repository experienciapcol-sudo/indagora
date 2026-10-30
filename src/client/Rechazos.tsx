import { useState } from 'react';
import type { FuenteEntrada, Rechazo } from '../nucleo/tipos';
import { TEXTOS } from './textos';

export interface RechazosDeFuente {
  fuente: FuenteEntrada;
  rechazos: readonly Rechazo[];
}

// El contador es siempre visible; solo la lista se despliega.
export function Rechazos({ grupos }: { grupos: readonly RechazosDeFuente[] }) {
  const R = TEXTOS.rechazos;
  const total = grupos.reduce((suma, g) => suma + g.rechazos.length, 0);
  const [abierto, setAbierto] = useState(true);

  return (
    <section className={`rechazos${total > 0 ? ' rechazos--hay' : ''}`} aria-labelledby="t-rechazos">
      <div className="rechazos__cabeza">
        <h2 id="t-rechazos" className="rechazos__contador" aria-live="polite">
          {R.contador(total)}
        </h2>
        {total > 0 && (
          <button
            type="button"
            className="boton boton--texto"
            aria-expanded={abierto}
            aria-controls="lista-rechazos"
            onClick={() => setAbierto((v) => !v)}
          >
            {abierto ? R.ocultar : R.mostrar}
          </button>
        )}
      </div>
      <p className="ayuda">{total === 0 ? R.ninguno : R.explicacion}</p>

      {total > 0 && abierto && (
        <div id="lista-rechazos" className="rechazos__lista">
          {grupos
            .filter((g) => g.rechazos.length > 0)
            .map((g) => (
              <div key={g.fuente.id}>
                <h3 className="rechazos__fuente">
                  <span className="id">{g.fuente.id}</span> {g.fuente.titulo}
                </h3>
                <ul>
                  {g.rechazos.map((r, i) => (
                    <li key={i}>
                      <span className="rechazos__motivo">{R.motivos[r.motivo]}</span>
                      <span className="rechazos__quien">{R.afirmacionN(r.afirmacion + 1)}</span>
                      {r.detalle && <span className="rechazos__detalle">{r.detalle}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
