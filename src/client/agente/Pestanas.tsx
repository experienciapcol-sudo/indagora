import type { KeyboardEvent } from 'react';
import { TEXTOS_AGENTE } from './textos';
import { TEXTOS_FLUJO } from '../flujo/textos';

export type Pestana = 'agente' | 'evidencia' | 'laboratorio' | 'flujo';

// "Cómo funciona" va al final: la app sigue abriendo en el agente.
const ORDEN: readonly Pestana[] = ['agente', 'evidencia', 'laboratorio', 'flujo'];

const ETIQUETAS: Record<Pestana, string> = {
  agente: TEXTOS_AGENTE.pestanas.agente,
  evidencia: TEXTOS_AGENTE.pestanas.evidencia,
  laboratorio: 'Laboratorio',
  flujo: TEXTOS_FLUJO.pestana,
};

// Pestañas con teclado: flechas, inicio y fin mueven la selección (patrón WAI-ARIA).
export function Pestanas({ activa, onCambiar }: { activa: Pestana; onCambiar: (p: Pestana) => void }) {
  function alTeclear(e: KeyboardEvent<HTMLButtonElement>) {
    const i = ORDEN.indexOf(activa);
    let siguiente: Pestana | null = null;
    if (e.key === 'ArrowRight') siguiente = ORDEN[(i + 1) % ORDEN.length];
    else if (e.key === 'ArrowLeft') siguiente = ORDEN[(i - 1 + ORDEN.length) % ORDEN.length];
    else if (e.key === 'Home') siguiente = ORDEN[0];
    else if (e.key === 'End') siguiente = ORDEN[ORDEN.length - 1];
    if (!siguiente) return;
    e.preventDefault();
    onCambiar(siguiente);
    document.getElementById(`pestana-${siguiente}`)?.focus();
  }

  return (
    <div className="pestanas" role="tablist" aria-label={TEXTOS_AGENTE.pestanas.etiqueta}>
      {ORDEN.map((p) => (
        <button
          key={p}
          type="button"
          role="tab"
          id={`pestana-${p}`}
          className={`pestana${activa === p ? ' pestana--activa' : ''}`}
          aria-selected={activa === p}
          aria-controls={`panel-${p}`}
          tabIndex={activa === p ? 0 : -1}
          onClick={() => onCambiar(p)}
          onKeyDown={alTeclear}
        >
          {ETIQUETAS[p]}
        </button>
      ))}
    </div>
  );
}
