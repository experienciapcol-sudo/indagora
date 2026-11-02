import type { ReactNode } from 'react';
import type { Casilla } from '../../nucleo/agente/tipos';
import { ListaChips } from './ChipEvidencia';
import { casillaVacia } from './logica';
import { TEXTOS_AGENTE } from './textos';
import { IconoInfo } from '../Iconos';

interface Props {
  id: string;
  titulo: string;
  ayuda?: string;
  vacia: boolean;
  children?: ReactNode;
}

// Sección del método. Vacía se atenúa y dice «Aún no», para que se vea el avance del agente.
export function Seccion({ id, titulo, ayuda, vacia, children }: Props) {
  return (
    <section className={`sec-ag${vacia ? ' sec-ag--vacia' : ''}`} aria-labelledby={`t-${id}`}>
      <header className="sec-ag__cabeza">
        <h3 id={`t-${id}`}>{titulo}</h3>
        {vacia && <span className="sec-ag__aun"><IconoInfo />{TEXTOS_AGENTE.aunNo}</span>}
      </header>
      {ayuda && <p className="ayuda">{ayuda}</p>}
      {!vacia && <div className="sec-ag__cuerpo">{children}</div>}
    </section>
  );
}

// Casilla del método: texto más los chips de evidencia que la sostienen.
export function CasillaVista({ casilla }: { casilla: Casilla | null | undefined }) {
  if (!casilla || casillaVacia(casilla)) return <p className="casilla casilla--vacia">{TEXTOS_AGENTE.sinDato}</p>;
  return (
    <div className="casilla">
      <p className="casilla__texto">{casilla.texto}</p>
      <ListaChips ids={casilla.evidencia} />
    </div>
  );
}
