import type { CasoLaboratorio } from '../../nucleo/laboratorio/tipos';
import type { IntercambioPublico } from './api';
import { TEXTOS_LAB } from './textos';

export function VistaEntrevistas({ caso, intercambios }: { caso: CasoLaboratorio; intercambios: IntercambioPublico[] }) {
  const T = TEXTOS_LAB.entrevistas;
  const nombreDe = (id: string) =>
    caso.personas.find((p) => p.id === id)?.rol ?? caso.documentos.find((d) => d.id === id)?.titulo ?? id;

  return (
    <section className="lab-tarjeta" aria-labelledby="lab-entrevistas-titulo">
      <h3 id="lab-entrevistas-titulo">{T.titulo}</h3>
      <p className="ayuda">{T.ayuda}</p>
      {intercambios.length === 0 ? (
        <p className="vacio">{T.vacio}</p>
      ) : (
        <ol className="lab-entrevistas">
          {intercambios.map((x) => (
            <li key={x.n} className="lab-intercambio">
              {x.tipoPregunta === 'documental' ? (
                <>
                  <p className="lab-pregunta"><strong>{T.documento}:</strong> {nombreDe(x.persona)}</p>
                  <p className="lab-respuesta">{x.respuesta}</p>
                </>
              ) : (
                <>
                  <p className="lab-pregunta"><strong>{T.consultor}:</strong> {x.pregunta}</p>
                  <p className="lab-respuesta"><strong>{nombreDe(x.persona)}:</strong> {x.respuesta}</p>
                </>
              )}
              {x.fuga && (
                <p className="lab-aviso-fuga" role="note">{TEXTOS_LAB.avisoFuga}</p>
              )}
              <p className="lab-meta">{T.hechos(x.hechosRevelados)}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
