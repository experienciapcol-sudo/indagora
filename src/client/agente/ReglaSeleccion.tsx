import type { Seleccion } from '../../nucleo/agente/tipos';
import { TEXTOS_AGENTE } from './textos';

// La ruta y las seis herramientas del método, con la razón de cada una. La regla es del código.
export function ReglaSeleccion({ seleccion }: { seleccion: Seleccion }) {
  const S = TEXTOS_AGENTE.secciones.seleccion;
  return (
    <div className="seleccion">
      <div className="seleccion__ruta">
        <p className={`seleccion__sello seleccion__sello--${seleccion.ruta}`}>
          <span className="rotulo">{S.ruta}</span>
          <strong>{S.rutas[seleccion.ruta]}</strong>
        </p>
        <p className="seleccion__ayuda">{S.rutaAyuda[seleccion.ruta]}</p>
        <p className="seleccion__codigo">{S.delCodigo}</p>
      </div>

      {seleccion.razones.length > 0 && (
        <div className="seleccion__razones">
          <p className="rotulo">{S.razones}</p>
          <ul>
            {seleccion.razones.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="meta-fila">
        <span className="rotulo">{S.espinas}</span>
        <span className="etiqueta">{S.espinasValor[seleccion.espinas]}</span>
      </p>

      <ul className="herramientas" aria-label={S.herramienta}>
        {seleccion.herramientas.map((h) => {
          const info = TEXTOS_AGENTE.herramientas[h.herramienta];
          return (
            <li key={h.herramienta} className={`herramienta${h.elegida ? ' herramienta--elegida' : ''}`}>
              <span className="herramienta__estado">
                <span aria-hidden="true">{h.elegida ? '●' : '○'}</span> {h.elegida ? S.elegida : S.noElegida}
              </span>
              <span className="herramienta__nombre">{info.nombre}</span>
              <span className="herramienta__fuente">{info.fuente}</span>
              <span className="herramienta__razon">{h.razon}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
