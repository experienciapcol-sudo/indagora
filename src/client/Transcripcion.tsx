import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Afirmacion, NivelCalculado, Oracion, Turno } from '../nucleo/tipos';
import { TEXTOS } from './textos';

interface Props {
  turnos: readonly Turno[];
  oraciones: readonly Oracion[];
  afirmaciones: readonly Afirmacion[];
  niveles: ReadonlyMap<string, NivelCalculado>;
  activa: Afirmacion | null;
  onElegir: (afirmacionId: string) => void;
}

const reducirMovimiento = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Transcripcion({ turnos, oraciones, afirmaciones, niveles, activa, onElegir }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);

  // Para cada oración: qué afirmaciones la citan y cuál es el nivel más alto entre ellas.
  const citas = useMemo(() => {
    const mapa = new Map<string, { afirmaciones: string[]; nivel: number }>();
    for (const a of afirmaciones) {
      const nivel = niveles.get(a.id)?.nivel ?? 0;
      for (const oid of a.oraciones) {
        const previo = mapa.get(oid) ?? { afirmaciones: [], nivel: 0 };
        previo.afirmaciones.push(a.id);
        previo.nivel = Math.max(previo.nivel, nivel);
        mapa.set(oid, previo);
      }
    }
    return mapa;
  }, [afirmaciones, niveles]);

  const porTurno = useMemo(() => {
    const mapa = new Map<number, Oracion[]>();
    for (const o of oraciones) {
      const lista = mapa.get(o.turno) ?? [];
      lista.push(o);
      mapa.set(o.turno, lista);
    }
    return mapa;
  }, [oraciones]);

  const activas = useMemo(() => new Set(activa?.oraciones ?? []), [activa]);

  // Al elegir una afirmación, la transcripción se desplaza (solo dentro de su caja) hasta la primera oración citada.
  useEffect(() => {
    const caja = contenedor.current;
    const primera = activa?.oraciones[0];
    if (!caja || !primera) return;
    const el = caja.querySelector<HTMLElement>(`[data-oid="${CSS.escape(primera)}"]`);
    if (!el) return;
    const rc = caja.getBoundingClientRect();
    const re = el.getBoundingClientRect();
    const margen = 24;
    if (re.top >= rc.top + margen && re.bottom <= rc.bottom - margen) return;
    const destino = caja.scrollTop + (re.top - rc.top) - caja.clientHeight / 3;
    caja.scrollTo({ top: Math.max(0, destino), behavior: reducirMovimiento() ? 'auto' : 'smooth' });
  }, [activa]);

  return (
    <div className="transcripcion" ref={contenedor} tabIndex={0} role="region" aria-label={TEXTOS.resultados.transcripcion}>
      {turnos.map((t) => (
        <div key={t.numero} className={`turno${t.esEntrevistador ? ' turno--entrevistador' : ''}`}>
          <div className="turno__quien">
            <span className="turno__hablante">{t.hablante}</span>
            <span className="turno__numero">{TEXTOS.resultados.turno(t.numero)}</span>
          </div>
          <p className="turno__texto">
            {(porTurno.get(t.numero) ?? []).map((o) => {
              const cita = citas.get(o.id);
              const encendida = activas.has(o.id);
              const etiqueta = <small className="oid">{o.id}</small>;
              if (!cita || o.esEntrevistador) {
                return (
                  <span key={o.id} data-oid={o.id} className="oracion">
                    {etiqueta}
                    {o.texto}{' '}
                  </span>
                );
              }
              const estilo = { '--c': `var(--n${cita.nivel}-borde)` } as CSSProperties;
              return (
                <span key={o.id} data-oid={o.id} className="oracion-envuelta">
                  <span
                    role="button"
                    tabIndex={0}
                    style={estilo}
                    className={`oracion oracion--citada${encendida ? ' oracion--activa' : ''}`}
                    aria-pressed={encendida}
                    onClick={() => onElegir(cita.afirmaciones[0])}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onElegir(cita.afirmaciones[0]);
                      }
                    }}
                  >
                    {etiqueta}
                    {o.texto}
                  </span>{' '}
                </span>
              );
            })}
          </p>
        </div>
      ))}
    </div>
  );
}
