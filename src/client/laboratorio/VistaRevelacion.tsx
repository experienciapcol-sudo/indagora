import type { CasoLaboratorio, VerdadLaboratorio } from '../../nucleo/laboratorio/tipos';
import type { ResultadoComparacion } from '../../nucleo/laboratorio/tipos';
import { IconoAlerta, IconoCheck, IconoX } from '../Iconos';
import { TEXTOS_LAB } from './textos';

interface Props {
  caso: CasoLaboratorio;
  verdad: VerdadLaboratorio;
  comparacion: ResultadoComparacion;
}

export function VistaRevelacion({ caso, verdad, comparacion }: Props) {
  const T = TEXTOS_LAB.revelacion;
  const nombreDe = (id: string) => caso.personas.find((p) => p.id === id)?.rol ?? caso.documentos.find((d) => d.id === id)?.titulo ?? id;
  const guardadaPor = [...new Set(verdad.hechos.filter((h) => h.tipo === 'causa').map((h) => nombreDe(h.dueno)))];
  const distractorCulposo = comparacion.distractorPrincipal
    ? verdad.distractores.find((d) => d.id === comparacion.distractorPrincipal)?.enunciado
    : null;

  return (
    <section className="lab-tarjeta lab-revelacion" aria-labelledby="lab-revelacion-titulo">
      <h3 id="lab-revelacion-titulo">{T.titulo}</h3>
      <p className={`lab-veredicto lab-veredicto--${comparacion.veredicto}`} role="status">
        {comparacion.veredicto === 'encontrada' ? <IconoCheck /> : comparacion.veredicto === 'parcial' ? <IconoAlerta /> : <IconoX />}
        {T.veredictos[comparacion.veredicto]}
      </p>

      <div className="lab-comparacion">
        <article>
          <h4>{T.causaOculta}</h4>
          <p>{verdad.causa.enunciado}</p>
          <h5>{T.mecanismo}</h5>
          <p>{verdad.causa.mecanismo}</p>
          <h5>{T.guardadaPor}</h5>
          <ul>
            {guardadaPor.map((nombre) => (
              <li key={nombre}>{nombre}</li>
            ))}
          </ul>
        </article>

        <article>
          <h4>{T.causaAgente}</h4>
          <p>{comparacion.causaPrincipalAgente ?? T.sinCausaAgente}</p>
          {distractorCulposo && (
            <p className="lab-aviso-fuga" role="note">
              {T.cayoEnDistractor} {distractorCulposo}
            </p>
          )}
          <h5>{T.marcadoresEnCausa}</h5>
          <p>{comparacion.marcadoresEnCausa.length ? comparacion.marcadoresEnCausa.join(' · ') : T.ninguno}</p>
          <h5>{T.marcadoresEnEvidencia}</h5>
          <p>{comparacion.marcadoresEnEvidencia.length ? comparacion.marcadoresEnEvidencia.join(' · ') : T.ninguno}</p>
          <ul>
            {comparacion.detalle.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </article>
      </div>

      <h4>{T.distractores}</h4>
      <ul>
        {verdad.distractores.map((d) => (
          <li key={d.id}>
            <strong>{d.enunciado}.</strong> {d.porQueEngana}
          </li>
        ))}
      </ul>
    </section>
  );
}
