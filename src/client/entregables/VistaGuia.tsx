import type { ItemGuia } from '../../nucleo/entregables/tipos';
import { ListaChips } from '../agente/ChipEvidencia';
import { TEXTOS_ENTREGABLES } from './textos';

const T = TEXTOS_ENTREGABLES;

export function VistaGuia({ guia }: { guia: readonly ItemGuia[] }) {
  return (
    <div className="ent-grupo">
      <h4>{T.guia.titulo}</h4>
      <p className="ayuda">{T.guia.ayuda}</p>
      {guia.length === 0 ? (
        <p className="vacio">{T.guia.vacio}</p>
      ) : (
        <ol className="ent-lista">
          {guia.map((g, i) => (
            <li key={i} className="ent-tarjeta">
              <span className="ent-tipo">{T.guia.tipos[g.tipo]}</span>
              <p className="ent-pregunta">{g.pregunta}</p>
              <p>{T.guia.paraQuien(g.paraQuien)}</p>
              <p className="ayuda">{T.guia.objetivo(g.objetivo)}</p>
              <ListaChips ids={g.punteros} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
