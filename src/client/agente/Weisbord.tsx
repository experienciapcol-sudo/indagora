import { CASILLAS_WEISBORD, type HallazgoWeisbord } from '../../nucleo/agente/tipos';
import { CasillaVista } from './Seccion';
import { TEXTOS_AGENTE } from './textos';
import type { ReactNode } from 'react';
import { IconoAlerta, IconoCheck, IconoInfo } from '../Iconos';

const SIMBOLO: Record<string, ReactNode> = { brecha: <IconoAlerta />, sin_brecha: <IconoCheck />, sin_datos: <IconoInfo /> };

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
                {SIMBOLO[estado]} {W.estados[estado]}
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
