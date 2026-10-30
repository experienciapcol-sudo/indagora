import type { Nivel } from '../nucleo/tipos';
import { NOMBRE_NIVEL } from '../nucleo/niveles';

const ESCALA: readonly number[] = [1, 2, 3, 4];

// Insignia de nivel: el número y el nombre dicen el nivel; los cuatro segmentos lo repiten
// sin depender del color.
export function InsigniaNivel({ nivel }: { nivel: Nivel }) {
  return (
    <span className={`insignia nivel-${nivel}`}>
      <span className="insignia__escala" aria-hidden="true">
        {ESCALA.map((i) => (
          <i key={i} className={i <= nivel ? 'lleno' : ''} />
        ))}
      </span>
      <span className="insignia__n">N{nivel}</span>
      <span className="insignia__nombre">{NOMBRE_NIVEL[nivel]}</span>
    </span>
  );
}
