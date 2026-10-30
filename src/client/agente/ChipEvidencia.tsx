import { createContext, useContext } from 'react';
import type { NivelCalculado } from '../../nucleo/tipos';
import { TEXTOS_AGENTE } from './textos';
import { NOMBRE_NIVEL } from '../../nucleo/niveles';

// Las secciones comparten los niveles calculados y la forma de abrir el detalle de una afirmación.
export interface ContextoEvidencia {
  niveles: Record<string, NivelCalculado>;
  abrir: (id: string) => void;
}

export const ContextoEvidencia = createContext<ContextoEvidencia>({ niveles: {}, abrir: () => undefined });

// Chip de una afirmación: el id y su nivel (número y color). Abre el detalle con un clic.
export function ChipEvidencia({ id }: { id: string }) {
  const { niveles, abrir } = useContext(ContextoEvidencia);
  const T = TEXTOS_AGENTE.chip;
  const calculado = niveles[id];
  if (!calculado) {
    return (
      <span className="chip-ev chip-ev--ajena" title={T.desconocida(id)}>
        <span className="chip-ev__id">{id}</span>
        <span className="chip-ev__n" aria-hidden="true">?</span>
      </span>
    );
  }
  const nombre = `N${calculado.nivel} ${NOMBRE_NIVEL[calculado.nivel]}`;
  return (
    <button
      type="button"
      className={`chip-ev nivel-${calculado.nivel}`}
      onClick={() => abrir(id)}
      aria-label={T.abrir(id, nombre)}
      title={nombre}
    >
      <span className="chip-ev__id">{id}</span>
      <span className="chip-ev__n">N{calculado.nivel}</span>
    </button>
  );
}

export function ListaChips({ ids, etiqueta }: { ids: readonly string[]; etiqueta?: string }) {
  if (ids.length === 0) return null;
  return (
    <ul className="chips" aria-label={etiqueta}>
      {ids.map((id) => (
        <li key={id}>
          <ChipEvidencia id={id} />
        </li>
      ))}
    </ul>
  );
}

// Nivel suelto, compacto: el número y el color; el nombre completo va en el título.
export function NivelMini({ nivel }: { nivel: 0 | 1 | 2 | 3 | 4 }) {
  return (
    <span className={`nivel-mini nivel-${nivel}`} title={`N${nivel} ${NOMBRE_NIVEL[nivel]}`}>
      N{nivel}
    </span>
  );
}
