import { CASILLAS_WEISBORD, type HallazgoWeisbord } from '../../nucleo/agente/tipos';
import { CasillaVista } from './Seccion';
import { TEXTOS_AGENTE } from './textos';

const SIMBOLO = { brecha: '▲', sin_brecha: '●', sin_datos: '○' } as const;

// Las seis casillas, siempre en el mismo orden; las que el agente no ha barrido salen sin datos.
export function Weisbord({ hallazgos }: { hallazgos: readonly HallazgoWeisbord[] }) {
  const W = TEXTOS_AGENTE.secciones.weisbord;
  return (
    <ul className="weisbord">
      {CASILLAS_WEISBORD.map((casilla) => {
        const h = hallazgos.find((x) => x.casilla === casilla);
        const estado = h?.estado ?? 'sin_datos';
        return (
          <li key={casilla} className={`weisbord__casilla weisbord__casilla--${estado}`}>
            <p className="weisbord__cabeza">
              <strong>{TEXTOS_AGENTE.casillasWeisbord[casilla]}</strong>
              <span className="weisbord__estado">
                <span aria-hidden="true">{SIMBOLO[estado]}</span> {W.estados[estado]}
              </span>
            </p>
            <CasillaVista casilla={h?.hallazgo} />
            {h && <span className="id weisbord__id">{h.id}</span>}
          </li>
        );
      })}
    </ul>
  );
}
