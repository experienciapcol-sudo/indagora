import type { Desviacion } from '../../nucleo/agente/tipos';
import { CasillaVista } from './Seccion';
import { TEXTOS_AGENTE } from './textos';

const ORDEN = ['esperado', 'ocurre', 'desdeCuando', 'cuanto', 'contraste'] as const;

// Las cinco casillas de la desviación y el ámbito. Cada una cita las afirmaciones que la sostienen.
export function VistaDesviacion({ desviacion }: { desviacion: Desviacion }) {
  const D = TEXTOS_AGENTE.secciones.desviacion;
  return (
    <div className="desviacion">
      <dl className="desviacion__rejilla">
        {ORDEN.map((clave) => (
          <div key={clave} className={`desviacion__celda desviacion__celda--${clave}`}>
            <dt>
              {D.casillas[clave]}
              {clave === 'contraste' && <span className="desviacion__nota">{D.contrasteAyuda}</span>}
            </dt>
            <dd>
              <CasillaVista casilla={desviacion[clave]} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="meta-fila">
        <span className="rotulo">{D.ambito}</span>
        <span className="etiqueta">{D.ambitos[desviacion.ambito]}</span>
      </p>
    </div>
  );
}
