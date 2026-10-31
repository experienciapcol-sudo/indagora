import { useMemo, useState } from 'react';
import type { FuenteEntrada } from '../../nucleo/tipos';
import { crearFuenteDeTexto, detectarYAsignar } from './asignacion';
import type { AsignacionHablante } from '../../nucleo/laboratorio/tipos';
import { TEXTOS_LAB } from './textos';

interface Props {
  texto: string;
  limpiarInicial?: boolean;
  // Etiqueta cruda de diarización por etiqueta visible («Hablante 1» → «SPEAKER_00»).
  referencias?: Record<string, string>;
  idFuente?: string;
  onConfirmar: (fuente: FuenteEntrada) => void;
}

export function AsignadorHablantes({ texto, limpiarInicial = false, referencias, idFuente = 'E1', onConfirmar }: Props) {
  const T = TEXTOS_LAB.hablantes;
  const inicial = useMemo(() => detectarYAsignar(texto), [texto]);
  const [asignaciones, setAsignaciones] = useState<AsignacionHablante[]>(inicial.asignaciones);
  const [limpiar, setLimpiar] = useState(limpiarInicial);
  const [tocado, setTocado] = useState(false);

  // Si cambia el texto (nueva transcripción), se parte de las asignaciones detectadas.
  const [textoPrevio, setTextoPrevio] = useState(texto);
  if (textoPrevio !== texto) {
    setTextoPrevio(texto);
    setAsignaciones(inicial.asignaciones);
    setLimpiar(limpiarInicial);
    setTocado(false);
  }

  const resultado = useMemo(
    () => crearFuenteDeTexto(texto, asignaciones, { limpiar, id: idFuente }),
    [texto, asignaciones, limpiar, idFuente],
  );
  const detectadoPorEtiqueta = useMemo(() => new Map(inicial.detectados.map((d) => [d.etiqueta, d])), [inicial.detectados]);

  function cambiar(etiqueta: string, cambio: Partial<AsignacionHablante>) {
    setAsignaciones((previas) =>
      previas.map((a) => {
        if (cambio.esEntrevistador) return { ...a, esEntrevistador: a.etiqueta === etiqueta };
        if (cambio.esPrincipal) return { ...a, esPrincipal: a.etiqueta === etiqueta };
        return a.etiqueta === etiqueta ? { ...a, ...cambio } : a;
      }),
    );
  }

  if (inicial.detectados.length === 0) return <p className="aviso-error" role="alert">{T.sinHablantes}</p>;

  return (
    <section className="lab-tarjeta" aria-labelledby="lab-hablantes-titulo">
      <h3 id="lab-hablantes-titulo">{T.titulo}</h3>
      <p className="ayuda">{T.ayuda}</p>

      <div className="lab-hablantes">
        {asignaciones.map((a) => {
          const detectado = detectadoPorEtiqueta.get(a.etiqueta);
          return (
            <fieldset key={a.etiqueta} className="lab-hablante">
              <legend>
                {a.etiqueta}
                {referencias?.[a.etiqueta] && <span className="lab-meta"> ({T.etiquetaOriginal}: {referencias[a.etiqueta]})</span>}
              </legend>
              <p className="lab-meta">{T.intervenciones(detectado?.intervenciones ?? 0)}</p>
              <p className="lab-muestra"><span>{T.muestra}:</span> «{detectado?.muestra}»</p>
              <label className="campo">
                <span>{T.rol}</span>
                <input value={a.rol} placeholder={T.rolEjemplo} onChange={(e) => cambiar(a.etiqueta, { rol: e.target.value })} aria-label={`${T.rol}: ${a.etiqueta}`} />
              </label>
              <label className="lab-check">
                <input type="radio" name="lab-entrevistador" checked={a.esEntrevistador} onChange={() => cambiar(a.etiqueta, { esEntrevistador: true })} />
                <span>{T.esEntrevistador}</span>
              </label>
              <label className="lab-check">
                <input type="radio" name="lab-principal" checked={a.esPrincipal} onChange={() => cambiar(a.etiqueta, { esPrincipal: true })} />
                <span>{T.esPrincipal}</span>
              </label>
            </fieldset>
          );
        })}
      </div>

      <label className="lab-check">
        <input type="checkbox" checked={limpiar} onChange={(e) => setLimpiar(e.target.checked)} />
        <span>{T.limpiar}</span>
      </label>
      <p className="ayuda">{T.limpiarAyuda}</p>

      {tocado && resultado.avisos.length > 0 && (
        <div className="aviso-error" role="alert">
          {resultado.avisos.map((aviso) => (
            <p key={aviso}>{aviso}</p>
          ))}
        </div>
      )}

      {resultado.fuente && (
        <div>
          <h4>{T.vistaPrevia}</h4>
          <pre className="lab-vista-previa">{resultado.fuente.texto}</pre>
        </div>
      )}

      <button
        type="button"
        className="boton"
        onClick={() => {
          setTocado(true);
          if (resultado.fuente) onConfirmar(resultado.fuente);
        }}
      >
        {T.confirmar}
      </button>
      {tocado && !resultado.fuente && <p className="ayuda" role="note">{T.faltaRol}</p>}
    </section>
  );
}
