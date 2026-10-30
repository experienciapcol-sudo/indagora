import type { Presupuesto as PresupuestoTipo } from '../../nucleo/agente/tipos';
import { formatoUsd } from '../sesion';
import { proporcion } from './logica';
import { TEXTOS_AGENTE } from './textos';

interface Props {
  presupuesto: PresupuestoTipo;
  gasto?: { sesionUsd: number; llamadasSesion: number };
}

function Medidor({ nombre, valor, texto, usado, max }: { nombre: string; valor: string; texto: string; usado: number; max: number }) {
  const p = proporcion(usado, max);
  return (
    <div className="presupuesto__fila">
      <div className="presupuesto__linea">
        <span className="presupuesto__nombre">{nombre}</span>
        <span className="presupuesto__cifra">{texto}</span>
      </div>
      <div
        className="gasto__barra"
        role="meter"
        aria-label={nombre}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={usado}
        aria-valuetext={valor}
      >
        <span style={{ width: `${(p * 100).toFixed(2)}%` }} className={p >= 0.8 ? 'alto' : ''} />
      </div>
    </div>
  );
}

export function Presupuesto({ presupuesto: p, gasto }: Props) {
  const P = TEXTOS_AGENTE.secciones.presupuesto;
  const usd = (n: number) => n.toFixed(4);
  return (
    <section className="tarjeta-ag presupuesto" aria-labelledby="t-presupuesto">
      <header className="tarjeta-ag__cabeza">
        <h3 id="t-presupuesto">{P.titulo}</h3>
      </header>
      <Medidor nombre={P.pasos} usado={p.pasos} max={p.pasosMax} texto={P.de(String(p.pasos), String(p.pasosMax))} valor={P.de(String(p.pasos), String(p.pasosMax))} />
      <Medidor nombre={P.usd} usado={p.usd} max={p.usdMax} texto={P.de(usd(p.usd), usd(p.usdMax))} valor={P.de(usd(p.usd), usd(p.usdMax))} />
      <Medidor nombre={P.dias} usado={p.dias} max={p.diasMax} texto={P.de(String(p.dias), String(p.diasMax))} valor={P.de(String(p.dias), String(p.diasMax))} />
      {gasto && <p className="ayuda">{P.sesion(formatoUsd(gasto.sesionUsd), gasto.llamadasSesion)}</p>}
    </section>
  );
}
