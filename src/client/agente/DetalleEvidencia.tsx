import { useEffect, useRef, useState } from 'react';
import type { Afirmacion, NivelCalculado } from '../../nucleo/tipos';
import { InsigniaNivel } from '../InsigniaNivel';
import { TEXTOS_AGENTE } from './textos';

interface Props {
  id: string;
  afirmacion: Afirmacion | undefined;
  calculado: NivelCalculado | undefined;
  todas: readonly Afirmacion[];
  confirmadas: readonly string[];
  // true mientras corre un paso: el servidor no admite confirmar a la vez.
  ocupado: boolean;
  onConfirmar: (clave: string, confirmada: boolean) => Promise<void>;
  onCerrar: () => void;
}

// Diálogo modal nativo: trae el foco al abrirse, lo devuelve al cerrarse y se cierra con Esc.
export function DetalleEvidencia({ id, afirmacion: a, calculado, todas, confirmadas, ocupado, onConfirmar, onCerrar }: Props) {
  const D = TEXTOS_AGENTE.detalle;
  const dialogo = useRef<HTMLDialogElement>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const d = dialogo.current;
    if (d && !d.open) d.showModal();
    return () => {
      if (d?.open) d.close();
    };
  }, []);

  async function confirmar(clave: string, confirmada: boolean) {
    setGuardando(clave);
    setError('');
    try {
      await onConfirmar(clave, confirmada);
    } catch (e) {
      setError(D.errorConfirmar(e instanceof Error ? e.message : ''));
    } finally {
      setGuardando(null);
    }
  }

  const otraDe = (clave: string) => clave.split('|').find((x) => x !== id) ?? '';
  const pendientes = calculado?.pendientes ?? [];
  const hechas = confirmadas.filter((k) => k.split('|').includes(id));

  return (
    <dialog
      ref={dialogo}
      className="detalle"
      aria-labelledby="t-detalle"
      onCancel={(e) => {
        e.preventDefault();
        onCerrar();
      }}
      onClick={(e) => {
        if (e.target === dialogo.current) onCerrar();
      }}
    >
      <div className="detalle__cuerpo">
        <header className="detalle__cabeza">
          <h3 id="t-detalle">
            {D.titulo} <span className="id id--grande">{id}</span>
          </h3>
          <button type="button" className="boton boton--secundario" onClick={onCerrar}>
            {D.cerrar}
          </button>
        </header>

        {!a ? (
          <p className="vacio">{D.noEncontrada}</p>
        ) : (
          <>
            <div className="detalle__meta">
              <InsigniaNivel nivel={calculado?.nivel ?? 0} />
              {calculado?.contradicha && (
                <span className="marca-contradicha">
                  <span aria-hidden="true">⚑</span> {D.contradicha}
                </span>
              )}
            </div>

            <blockquote className="cita">
              <p>«{a.cita}»</p>
              <footer>
                {D.fuente} {a.fuente} · {a.oraciones.join(', ')}
              </footer>
            </blockquote>

            <dl className="detalle__datos">
              <div>
                <dt>{D.rol}</dt>
                <dd>{a.rol}</dd>
              </div>
              <div>
                <dt>{D.hablante}</dt>
                <dd>{a.hablante}</dd>
              </div>
              <div className="detalle__resumen">
                <dt>{D.resumen}</dt>
                <dd>{a.resumen}</dd>
              </div>
            </dl>

            {calculado && calculado.razones.length > 0 && (
              <div className={`razones nivel-${calculado.nivel}`}>
                <p className="rotulo">{D.razones}</p>
                <ul>
                  {calculado.razones.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {(pendientes.length > 0 || hechas.length > 0) && (
              <div className="detalle__corroboraciones">
                <p className="rotulo">{D.pendientes}</p>
                <p className="ayuda">{D.pendientesAyuda}</p>
                {ocupado && <p className="ayuda">{D.bloqueado}</p>}
                <ul>
                  {pendientes.map((clave) => {
                    const otra = todas.find((x) => x.id === otraDe(clave));
                    return (
                      <li key={clave} className="corroboracion">
                        {otra && <p className="corroboracion__resumen">{otra.resumen}</p>}
                        <button type="button" className="boton" disabled={ocupado || guardando !== null} onClick={() => void confirmar(clave, true)}>
                          {guardando === clave ? D.guardando : D.confirmarCon(otra?.rol ?? '?', otraDe(clave))}
                        </button>
                      </li>
                    );
                  })}
                  {hechas.map((clave) => {
                    const otra = todas.find((x) => x.id === otraDe(clave));
                    return (
                      <li key={clave} className="corroboracion corroboracion--confirmada">
                        <p className="corroboracion__titulo">
                          {TEXTOS_AGENTE.detalle.confirmadaCon(otra?.rol ?? '?', otraDe(clave))}
                        </p>
                        <button type="button" className="boton boton--secundario" disabled={ocupado || guardando !== null} onClick={() => void confirmar(clave, false)}>
                          {guardando === clave ? D.guardando : D.deshacer}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {error && (
              <p className="aviso-error" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
