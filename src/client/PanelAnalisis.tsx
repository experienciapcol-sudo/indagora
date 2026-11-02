import type { FuenteEntrada } from '../nucleo/tipos';
import { formatoSegundos, formatoUsd } from './sesion';
import type { EstadosPorFuente } from './sesion';
import { TEXTOS } from './textos';
import { IconoCheck, IconoReloj, IconoX } from './Iconos';

interface Props {
  fuentes: readonly FuenteEntrada[];
  estados: EstadosPorFuente;
  analizando: boolean;
  deteniendo: boolean;
  aviso: string;
  onAnalizar: () => void;
  onReanalizar: () => void;
  onDetener: () => void;
}

export function PanelAnalisis({ fuentes, estados, analizando, deteniendo, aviso, onAnalizar, onReanalizar, onDetener }: Props) {
  const T = TEXTOS.analisis;
  const listas = fuentes.filter((f) => estados[f.id]?.tipo === 'lista').length;
  const porHacer = fuentes.length - listas;
  const hayListas = listas > 0;

  let costo = 0;
  let ms = 0;
  let modelo = '';
  let demo = false;
  for (const f of fuentes) {
    const e = estados[f.id];
    if (e?.tipo === 'lista') {
      costo += e.resp.costoUsd;
      ms += e.resp.ms;
      modelo = e.resp.modelo;
      demo = demo || e.resp.demo;
    }
  }

  return (
    <section className="panel" aria-labelledby="t-analisis">
      <div className="panel__cabeza">
        <h2 id="t-analisis">{T.titulo}</h2>
      </div>
      <p className="ayuda">{T.ayuda}</p>

      <div className="acciones">
        {analizando ? (
          <button type="button" className="boton boton--peligro" onClick={onDetener} disabled={deteniendo}>
            {deteniendo ? T.deteniendo : T.detener}
          </button>
        ) : (
          <>
            <button type="button" className="boton" onClick={onAnalizar} disabled={fuentes.length === 0 || porHacer === 0}>
              {hayListas ? T.analizarPendientes : T.analizar}
            </button>
            {hayListas && (
              <button type="button" className="boton boton--secundario" onClick={onReanalizar}>
                {T.reanalizar}
              </button>
            )}
          </>
        )}
        {fuentes.length === 0 && <span className="ayuda">{T.sinFuentes}</span>}
      </div>

      <div aria-live="polite" aria-label={T.progreso} className="progreso-vivo">
        {fuentes.length > 0 && (
          <ol className="progreso">
            {fuentes.map((f) => {
              const e = estados[f.id] ?? { tipo: 'pendiente' as const };
              return (
                <li key={f.id} className={`paso paso--${e.tipo}`}>
                  <span className="id">{f.id}</span>
                  <span className="paso__estado">
                    {e.tipo === 'lista' ? <IconoCheck /> : e.tipo === 'error' ? <IconoX /> : <IconoReloj />}
                    {T.estados[e.tipo]}
                  </span>
                  <span className="paso__detalle">
                    {e.tipo === 'lista' &&
                      T.detalleLista(e.resp.afirmaciones.length, formatoUsd(e.resp.costoUsd), formatoSegundos(e.resp.ms))}
                    {e.tipo === 'error' && e.mensaje}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {aviso !== '' && <p className="aviso-estado">{aviso}</p>}
      </div>

      {hayListas && (
        <p className="total">
          <strong>{T.total}</strong> {T.totalLinea(formatoUsd(costo), formatoSegundos(ms))}
          <span className="total__modelo">
            {' '}
            · {T.modelo}: {modelo}
            {demo ? ` · ${T.demoGrabada}` : ''}
          </span>
        </p>
      )}
    </section>
  );
}
