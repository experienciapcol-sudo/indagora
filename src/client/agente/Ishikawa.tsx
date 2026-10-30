import type { Causa, CausaEvaluada, Desviacion, EstadoCausa, Seleccion } from '../../nucleo/agente/tipos';
import { ListaChips, NivelMini } from './ChipEvidencia';
import { agruparPorEspina, type CausaEnEspina } from './logica';
import { TEXTOS_AGENTE } from './textos';

interface Props {
  desviacion: Desviacion | null;
  espinas: Seleccion['espinas'];
  causas: readonly Causa[];
  evaluadas: readonly CausaEvaluada[];
}

const ICONO: Record<EstadoCausa, string> = { sin_probar: '○', explica_todo: '✓', descartada: '✗', incompleta: '◐' };

// Diagrama de espina de pescado hecho con CSS: la cabeza a la derecha es la desviación; seis
// espinas, tres arriba y tres abajo, cada una con sus causas. En pantallas angostas se vuelve
// una lista por espina.
export function Ishikawa({ desviacion, espinas, causas, evaluadas }: Props) {
  const I = TEXTOS_AGENTE.secciones.ishikawa;
  const { grupos, otras } = agruparPorEspina(causas, evaluadas, espinas);

  return (
    <figure className="ishikawa" aria-label={I.etiqueta}>
      <div className="ishikawa__cuerpo">
        <ul className="ishikawa__huesos">
          {grupos.map((g, i) => (
            <li key={g.espina} className={`hueso ${i < 3 ? 'hueso--arriba' : 'hueso--abajo'}${g.causas.length === 0 ? ' hueso--vacio' : ''} hueso--c${(i % 3) + 1}`}>
              <h4 className="hueso__nombre">{TEXTOS_AGENTE.espinas[g.espina]}</h4>
              <ul className="hueso__causas">
                {g.causas.length === 0 ? <li className="hueso__nada">{I.sinCausas}</li> : g.causas.map((c) => <TarjetaCausa key={c.causa.id} {...c} />)}
              </ul>
            </li>
          ))}
          <li className="ishikawa__columna" aria-hidden="true" />
        </ul>

        <div className="ishikawa__cabeza">
          <p className="rotulo">{I.cabeza}</p>
          {desviacion ? <p className="ishikawa__efecto">{desviacion.ocurre.texto}</p> : <p className="ishikawa__efecto suave">{I.sinCabeza}</p>}
        </div>
      </div>

      {otras.length > 0 && (
        <div className="ishikawa__otras">
          <h4 className="hueso__nombre">{I.otras}</h4>
          <ul className="hueso__causas hueso__causas--fila">
            {otras.map((c) => (
              <TarjetaCausa key={c.causa.id} {...c} />
            ))}
          </ul>
        </div>
      )}
    </figure>
  );
}

function TarjetaCausa({ causa, evaluada }: CausaEnEspina) {
  const I = TEXTOS_AGENTE.secciones.ishikawa;
  const estado: EstadoCausa = evaluada?.estado ?? 'sin_probar';
  const principal = evaluada?.principal ?? false;
  return (
    <li className={`causa causa--${estado}${principal ? ' causa--principal' : ''}`}>
      <p className="causa__cabeza">
        <span className="id">{causa.id}</span>
        <NivelMini nivel={evaluada?.nivel ?? 0} />
        <span className="causa__estado">
          <span aria-hidden="true">{ICONO[estado]}</span> {TEXTOS_AGENTE.estadosCausa[estado]}
        </span>
      </p>
      {principal && <p className="causa__principal">{I.principal}</p>}
      <p className="causa__texto">{causa.enunciado}</p>
      {evaluada && evaluada.filasTotales > 0 && <p className="causa__filas">{I.filasExplicadas(evaluada.filasExplicadas, evaluada.filasTotales)}</p>}
      <ListaChips ids={causa.evidencia} />
    </li>
  );
}
