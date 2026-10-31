import type { FichaIndicador } from '../../nucleo/entregables/tipos';
import { ListaChips } from '../agente/ChipEvidencia';
import { TEXTOS_ENTREGABLES } from './textos';

const T = TEXTOS_ENTREGABLES;

export function VistaIndicadores({ fichas }: { fichas: readonly FichaIndicador[] }) {
  return (
    <div className="ent-grupo">
      <h4>{T.indicadores.titulo}</h4>
      <p className="ayuda">{T.indicadores.ayuda}</p>
      {fichas.length === 0 ? (
        <p className="vacio">{T.indicadores.vacio}</p>
      ) : (
        <div className="ent-lista">
          {fichas.map((k) => (
            <article key={k.id} className="ent-tarjeta">
              <header className="ent-tarjeta__cabeza">
                <strong>{k.id}: {k.nombre}</strong>
                <span>{T.indicadores.causa(k.causa)}</span>
              </header>
              <p className={k.smart.completa ? 'ent-smart ent-smart--ok' : 'ent-smart ent-smart--falta'} role="status">
                {k.smart.completa ? T.indicadores.smartCompleta : T.indicadores.smartIncompleta(k.smart.faltan.join(', '))}
              </p>
              <dl className="ent-datos">
                <div><dt>{T.indicadores.definicion}</dt><dd>{k.definicion}</dd></div>
                <div><dt>{T.indicadores.formula}</dt><dd>{k.formula}</dd></div>
                <div><dt>{T.indicadores.unidad}</dt><dd>{k.unidad || '—'}</dd></div>
                <div><dt>{T.indicadores.lineaBase}</dt><dd>{k.lineaBase ?? T.indicadores.sinLineaBase}</dd></div>
                <div><dt>{T.indicadores.meta}</dt><dd>{k.meta || '—'}</dd></div>
                <div><dt>{T.indicadores.plazo}</dt><dd>{k.plazo || '—'}</dd></div>
                <div><dt>{T.indicadores.frecuencia}</dt><dd>{T.frecuencias[k.frecuencia]}</dd></div>
                <div><dt>{T.indicadores.responsable}</dt><dd>{k.responsable || '—'}</dd></div>
              </dl>
              <ListaChips ids={k.punteros} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
