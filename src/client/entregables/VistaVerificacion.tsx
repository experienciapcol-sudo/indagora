import type { PlanVerificacion } from '../../nucleo/entregables/tipos';
import { ListaChips, NivelMini } from '../agente/ChipEvidencia';
import { TEXTOS_AGENTE } from '../agente/textos';
import { TEXTOS_ENTREGABLES } from './textos';

const T = TEXTOS_ENTREGABLES;

export function VistaVerificacion({ planes }: { planes: readonly PlanVerificacion[] }) {
  return (
    <div className="ent-grupo">
      <h4>{T.verificacion.titulo}</h4>
      <p className="ayuda">{T.verificacion.ayuda}</p>
      {planes.length === 0 ? (
        <p className="vacio">{T.verificacion.vacio}</p>
      ) : (
        <div className="ent-lista">
          {planes.map((v) => (
            <article key={v.causa} className="ent-tarjeta ent-tarjeta--verificacion">
              <header className="ent-tarjeta__cabeza">
                <strong>
                  {T.verificacion.titulo} · {v.causa}
                </strong>
                <span className="ent-solo">
                  <NivelMini nivel={v.nivelAlGenerar} /> {TEXTOS_AGENTE.estadosCausa[v.estadoAlGenerar]} · {T.soloVerificacion}
                </span>
              </header>
              <p className="ent-aviso-solo" role="note">{T.soloVerificacionAyuda}</p>
              <dl className="ent-datos">
                <div><dt>{T.verificacion.queRevisar}</dt><dd>{v.queRevisar}</dd></div>
                <div><dt>{T.verificacion.conQuien}</dt><dd>{v.conQuien}</dd></div>
                <div><dt>{T.verificacion.confirmaSi}</dt><dd>{v.confirmaSi}</dd></div>
                <div><dt>{T.verificacion.descartaSi}</dt><dd>{v.descartaSi}</dd></div>
              </dl>
              <ol className="ent-pdsa">
                {v.pasos.map((paso) => (
                  <li key={paso.fase}>
                    <span className="ent-fase">{T.fases[paso.fase]}</span>
                    <span>{paso.texto} <em>({paso.responsable})</em></span>
                    <ListaChips ids={paso.punteros} />
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
