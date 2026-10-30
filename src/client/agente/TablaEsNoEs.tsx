import type { FilaEsNoEs } from '../../nucleo/agente/tipos';
import { ordenarFilas } from './logica';
import { CasillaVista } from './Seccion';
import { TEXTOS_AGENTE } from './textos';

// Filas por dimensión. En pantallas angostas cada fila se apila y cada casilla trae su rótulo.
export function TablaEsNoEs({ filas }: { filas: readonly FilaEsNoEs[] }) {
  const E = TEXTOS_AGENTE.secciones.esNoEs;
  const columnas = [
    ['es', E.es],
    ['noEs', E.noEs],
    ['distincion', E.distincion],
    ['cambio', E.cambio],
  ] as const;

  return (
    <div className="tabla-envoltorio">
      <table className="tabla-eno">
        <caption className="solo-lectores">{E.titulo}</caption>
        <thead>
          <tr>
            <th scope="col">{E.dimension}</th>
            {columnas.map(([clave, nombre]) => (
              <th key={clave} scope="col" className={`tabla-eno__${clave}`}>
                {nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordenarFilas(filas).map((f) => (
            <tr key={f.id}>
              <th scope="row" className="tabla-eno__dimension">
                <span className="tabla-eno__nombre">{TEXTOS_AGENTE.dimensiones[f.dimension]}</span>
                <span className="id">{f.id}</span>
                <span className="tabla-eno__pregunta">{f.pregunta}</span>
              </th>
              {columnas.map(([clave, nombre]) => (
                <td key={clave} data-etiqueta={nombre} className={`tabla-eno__${clave}`}>
                  <CasillaVista casilla={f[clave]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
