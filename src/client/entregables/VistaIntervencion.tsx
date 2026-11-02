import type { PlanIntervencion } from '../../nucleo/entregables/tipos';
import { CUADRANTES } from '../../nucleo/entregables/matriz';
import { ListaChips, NivelMini } from '../agente/ChipEvidencia';
import { IconoFlecha, IconoReloj } from '../Iconos';
import { gruposPorCarril } from './logica';
import { TEXTOS_ENTREGABLES } from './textos';

const T = TEXTOS_ENTREGABLES;

export function VistaIntervencion({ plan, motivo }: { plan: PlanIntervencion | null; motivo: string | null }) {
  if (!plan) {
    return (
      <div className="ent-grupo">
        <h4>{T.intervencion.titulo}</h4>
        <p className="ayuda">{T.intervencion.ayuda}</p>
        <p className="ent-solo-grande">
          <span className="ent-solo"><IconoReloj className="icono--chico" />{T.soloVerificacion}</span> {motivo ?? T.intervencion.vacio}
        </p>
      </div>
    );
  }
  const porId = new Map(plan.acciones.map((a) => [a.id, a]));
  return (
    <div className="ent-grupo">
      <h4>{T.intervencion.titulo}</h4>
      <p className="ayuda">{T.intervencion.ayuda}</p>
      <p className="ent-causa">
        {T.intervencion.causa(plan.causa, plan.nivelAlGenerar)} <NivelMini nivel={plan.nivelAlGenerar} />
      </p>

      <div className="ent-carriles">
        {gruposPorCarril(plan.acciones).map(({ carril, acciones }) => (
          <section key={carril} className="ent-carril" aria-label={T.carriles[carril]}>
            <h5>{T.carriles[carril]}</h5>
            {acciones.length === 0 ? (
              <p className="vacio">{T.intervencion.sinPropuesta}</p>
            ) : (
              acciones.map((a) => (
                <article key={a.id} className="ent-tarjeta">
                  <header className="ent-tarjeta__cabeza">
                    <strong>{a.id} · {a.texto}</strong>
                    <span className={`ent-prioridad ent-prioridad--${a.prioridad.clase}`}>
                      <IconoFlecha className="icono--chico" />
                      {T.intervencion.prioridad(T.prioridades[a.prioridad.clase], a.prioridad.puntaje)}
                    </span>
                  </header>
                  <p>{T.cuadrantes[a.cuadrante]} · {T.intervencion.impactoEsfuerzo(a.prioridad.impacto, a.prioridad.esfuerzo, a.prioridad.esfuerzoPuntos)}</p>
                  <details>
                    <summary>{T.intervencion.razones}</summary>
                    <ul>{a.prioridad.razones.map((r, i) => <li key={i}>{r}</li>)}</ul>
                  </details>
                  <ListaChips ids={a.punteros} />
                </article>
              ))
            )}
          </section>
        ))}
      </div>

      <h5>{T.intervencion.matriz}</h5>
      <div className="ent-matriz" role="table" aria-label={T.intervencion.matriz}>
        {CUADRANTES.map((q) => (
          <div key={q} className="ent-matriz__celda" role="cell">
            <strong>{T.cuadrantes[q]}</strong>
            {plan.matriz[q].length === 0 ? (
              <p className="vacio">{T.intervencion.sinPropuesta}</p>
            ) : (
              <ul>
                {plan.matriz[q].map((id) => (
                  <li key={id}><strong>{id}</strong> {porId.get(id)?.texto ?? ''}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <h5>{T.intervencion.listas}</h5>
      <div className="ent-listas">
        {(
          [
            ['descongelar', T.intervencion.descongelar],
            ['mover', T.intervencion.mover],
            ['recongelar', T.intervencion.recongelar],
          ] as const
        ).map(([clave, titulo]) => (
          <section key={clave}>
            <h6>{titulo}</h6>
            <ul>{plan.listasCambio[clave].map((item, i) => <li key={i}>{item}</li>)}</ul>
          </section>
        ))}
      </div>
    </div>
  );
}
