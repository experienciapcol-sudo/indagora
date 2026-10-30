import { useState } from 'react';
import type { Causa, CausaEvaluada, Juicio } from '../../nucleo/agente/tipos';
import { ListaChips, NivelMini } from './ChipEvidencia';
import { juicioDe, type ColumnaPrueba } from './logica';
import { TEXTOS_AGENTE } from './textos';

interface Props {
  causas: readonly Causa[];
  evaluadas: readonly CausaEvaluada[];
  juicios: readonly Juicio[];
  columnas: readonly ColumnaPrueba[];
}

interface Celda {
  causa: string;
  fila: string;
}

// Matriz causa × fila. Cada celda es un botón: al tocarla o pasar el foco se lee la razón y la evidencia.
export function PruebaCausas({ causas, evaluadas, juicios, columnas }: Props) {
  const P = TEXTOS_AGENTE.secciones.prueba;
  const [elegida, setElegida] = useState<Celda | null>(null);
  const porId = new Map(evaluadas.map((e) => [e.id, e]));

  const causaElegida = elegida ? causas.find((c) => c.id === elegida.causa) : undefined;
  const columnaElegida = elegida ? columnas.find((c) => c.id === elegida.fila) : undefined;
  const juicioElegido = elegida ? juicioDe(juicios, elegida.causa, elegida.fila) : undefined;
  const evaluadaElegida = elegida ? porId.get(elegida.causa) : undefined;

  return (
    <div className="prueba">
      <div className="tabla-envoltorio tabla-envoltorio--desliza">
        <table className="matriz">
          <caption className="solo-lectores">{P.matriz}</caption>
          <thead>
            <tr>
              <th scope="col" className="matriz__causa">{P.causa}</th>
              {columnas.map((c) => (
                <th key={c.id} scope="col" className="matriz__fila" title={c.etiqueta}>
                  <span className="id">{c.id}</span>
                  <span className="matriz__etiqueta">{c.etiqueta}</span>
                </th>
              ))}
              <th scope="col">{P.nivel}</th>
              <th scope="col">{P.estado}</th>
              <th scope="col">{P.siguiente}</th>
            </tr>
          </thead>
          <tbody>
            {causas.map((causa) => {
              const ev = porId.get(causa.id);
              const estado = ev?.estado ?? 'sin_probar';
              return (
                <tr key={causa.id} className={`matriz__tr matriz__tr--${estado}${ev?.principal ? ' matriz__tr--principal' : ''}`}>
                  <th scope="row" className="matriz__causa">
                    <span className="id">{causa.id}</span>
                    <span className="matriz__enunciado">{causa.enunciado}</span>
                  </th>
                  {columnas.map((col) => {
                    const j = juicioDe(juicios, causa.id, col.id);
                    const v = j ? TEXTOS_AGENTE.veredictos[j.veredicto] : null;
                    const activa = elegida?.causa === causa.id && elegida.fila === col.id;
                    return (
                      <td key={col.id} className="matriz__td">
                        <button
                          type="button"
                          className={`celda celda--${j?.veredicto ?? 'ninguno'}${activa ? ' celda--activa' : ''}`}
                          aria-pressed={activa}
                          aria-label={P.celda(causa.id, col.id, v ? v.nombre : P.sinJuicio)}
                          title={j ? `${v?.nombre}: ${j.razon}` : P.sinJuicio}
                          disabled={!j}
                          onClick={() => setElegida(activa ? null : { causa: causa.id, fila: col.id })}
                        >
                          <span aria-hidden="true">{v ? v.simbolo : '·'}</span>
                        </button>
                      </td>
                    );
                  })}
                  <td className="matriz__nivel">
                    <NivelMini nivel={ev?.nivel ?? 0} />
                  </td>
                  <td className="matriz__estado">
                    {TEXTOS_AGENTE.estadosCausa[estado]}
                    {ev && ev.filasTotales > 0 && (
                      <span className="matriz__filas">{TEXTOS_AGENTE.secciones.ishikawa.filasExplicadas(ev.filasExplicadas, ev.filasTotales)}</span>
                    )}
                  </td>
                  <td className="matriz__sigue">
                    {ev?.verificacion && <span className="marca marca--verificar">{P.verificacion}</span>}
                    {ev?.intervencion && <span className="marca marca--intervenir">{P.intervencion}</span>}
                    {!ev?.verificacion && !ev?.intervencion && <span className="suave">{P.ninguno}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="lectura" aria-live="polite">
        {elegida && juicioElegido ? (
          <div className={`lectura__cuerpo lectura__cuerpo--${juicioElegido.veredicto}`}>
            <p className="lectura__cabeza">
              <span className="lectura__veredicto">
                <span aria-hidden="true">{TEXTOS_AGENTE.veredictos[juicioElegido.veredicto].simbolo}</span> {TEXTOS_AGENTE.veredictos[juicioElegido.veredicto].nombre}
              </span>
              <span className="id">{elegida.causa}</span> {P.contra} <span className="id">{elegida.fila}</span>
              <button type="button" className="boton boton--texto lectura__cerrar" onClick={() => setElegida(null)}>
                {P.cerrar}
              </button>
            </p>
            {causaElegida && <p className="lectura__causa">{causaElegida.enunciado}</p>}
            {columnaElegida && <p className="suave lectura__fila">{columnaElegida.etiqueta}</p>}
            <p>
              <span className="rotulo">{P.razon}</span>
              {juicioElegido.razon}
            </p>
            {juicioElegido.evidencia.length > 0 && (
              <div className="lectura__evidencia">
                <span className="rotulo">{P.evidencia}</span>
                <ListaChips ids={juicioElegido.evidencia} />
              </div>
            )}
            {evaluadaElegida && evaluadaElegida.contradicciones.length > 0 && (
              <div className="lectura__evidencia">
                <span className="rotulo">{P.contradicciones}</span>
                <ListaChips ids={evaluadaElegida.contradicciones} />
              </div>
            )}
          </div>
        ) : (
          <p className="ayuda">{P.leer}</p>
        )}
      </div>
    </div>
  );
}
