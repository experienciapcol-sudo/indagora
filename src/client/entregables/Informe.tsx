import { useMemo } from 'react';
import { nombreArchivoInforme, parseInformeMarkdown } from './logica';
import { TEXTOS_ENTREGABLES } from './textos';

const T = TEXTOS_ENTREGABLES;

// Descarga el mismo Markdown guardado por el servidor; no se regenera en el cliente.
function descargar(markdown: string, titulo: string) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivoInforme(titulo);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function Informe({ markdown, titulo }: { markdown: string; titulo: string }) {
  const bloques = useMemo(() => parseInformeMarkdown(markdown), [markdown]);
  return (
    <div className="ent-grupo">
      <h4>{T.informe.titulo}</h4>
      <p className="ayuda">{T.informe.ayuda}</p>
      <div className="ent-acciones no-imprimir">
        <button type="button" className="boton" disabled={!markdown} onClick={() => descargar(markdown, titulo)}>
          {T.informe.descargar}
        </button>
        <button type="button" className="boton boton--secundario" disabled={!markdown} onClick={() => window.print()}>
          {T.informe.imprimir}
        </button>
      </div>
      {!markdown ? (
        <p className="vacio">{T.informe.vacio}</p>
      ) : (
        <article className="informe" aria-label={T.informe.titulo}>
          {bloques.map((b, i) => {
            if (b.tipo === 'h1') return <h1 key={i}>{b.texto}</h1>;
            if (b.tipo === 'h2') return <h2 key={i}>{b.texto}</h2>;
            if (b.tipo === 'h3') return <h3 key={i}>{b.texto}</h3>;
            if (b.tipo === 'li') return <p key={i} className={b.anidado ? 'informe__li informe__li--anidado' : 'informe__li'}>• {b.texto}</p>;
            return <p key={i}>{b.texto}</p>;
          })}
        </article>
      )}
    </div>
  );
}
