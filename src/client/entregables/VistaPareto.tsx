import type { MotivoSinPareto, Pareto } from '../../nucleo/entregables/tipos';
import { ListaChips } from '../agente/ChipEvidencia';
import { anchoRelativo } from './logica';
import { TEXTOS_ENTREGABLES } from './textos';

const T = TEXTOS_ENTREGABLES;

export function VistaPareto({ pareto, motivo }: { pareto: Pareto | null; motivo: MotivoSinPareto | null }) {
  const maximo = pareto ? Math.max(...pareto.barras.map((b) => b.valor), 0) : 0;
  return (
    <div className="ent-grupo">
      <h4>{T.pareto.titulo}</h4>
      <p className="ayuda">{T.pareto.ayuda}</p>
      {!pareto ? (
        <p className="vacio">{motivo ? T.motivosSinPareto[motivo] : T.pareto.vacio}</p>
      ) : (
        <>
          <p>{T.pareto.total(pareto.total, pareto.unidad)}</p>
          <ul className="ent-pareto">
            {pareto.barras.map((b) => (
              <li key={b.categoria}>
                <div className="ent-pareto__linea">
                  <span className="ent-pareto__nombre">{b.categoria}</span>
                  <span>{T.pareto.barra(b.categoria, b.valor, b.unidad, b.porcentaje, b.acumulado)}</span>
                </div>
                <div className="ent-pareto__pista" role="img" aria-label={T.pareto.barra(b.categoria, b.valor, b.unidad, b.porcentaje, b.acumulado)}>
                  <span className="ent-pareto__barra" style={{ width: `${anchoRelativo(b.valor, maximo)}%` }} />
                  <span className="ent-pareto__acum">{T.pareto.acumulado(b.acumulado)}</span>
                </div>
                <ListaChips ids={b.afirmaciones} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
