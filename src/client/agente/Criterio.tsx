import type { Causa, EstadoCriterio } from '../../nucleo/agente/tipos';
import { TEXTOS_AGENTE } from './textos';

// El criterio de paro lo evalúa el código; aquí solo se muestra qué cumple y qué falta.
export function Criterio({ criterio, causas }: { criterio: EstadoCriterio; causas: readonly Causa[] }) {
  const K = TEXTOS_AGENTE.secciones.criterio;
  const principal = criterio.principal ? causas.find((c) => c.id === criterio.principal) : undefined;

  return (
    <section className={`tarjeta-ag criterio${criterio.cumplido ? ' criterio--cumplido' : ''}`} aria-labelledby="t-criterio">
      <header className="tarjeta-ag__cabeza">
        <h3 id="t-criterio">{K.titulo}</h3>
        <span className={`criterio__estado${criterio.cumplido ? ' criterio__estado--ok' : ''}`}>
          <span aria-hidden="true">{criterio.cumplido ? '✓' : '○'}</span> {criterio.cumplido ? K.cumplido : K.enCurso}
        </span>
      </header>
      <p className="ayuda">{K.ayuda}</p>

      <p className="criterio__principal">
        <span className="rotulo">{K.principal}</span>
        {criterio.principal ? (
          <>
            <span className="id">{criterio.principal}</span> {principal?.enunciado}
          </>
        ) : (
          <span className="suave">{K.sinPrincipal}</span>
        )}
      </p>

      <ul className="criterio__lista" aria-label={`${K.cumplidos} y ${K.faltantes.toLowerCase()}`}>
        {criterio.cumplidos.map((c, i) => (
          <li key={`c${i}`} className="criterio__item criterio__item--ok">
            <span aria-hidden="true">✓</span>
            <span className="solo-lectores">{K.cumplidos}: </span>
            {c}
          </li>
        ))}
        {criterio.faltantes.map((c, i) => (
          <li key={`f${i}`} className="criterio__item criterio__item--falta">
            <span aria-hidden="true">○</span>
            <span className="solo-lectores">{K.faltantes}: </span>
            {c}
          </li>
        ))}
        {criterio.cumplidos.length === 0 && criterio.faltantes.length === 0 && <li className="suave">{K.ninguno}</li>}
      </ul>
    </section>
  );
}
