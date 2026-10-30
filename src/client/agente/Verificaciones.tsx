import type { Causa, Intervencion, SolicitudDocumento, Verificacion } from '../../nucleo/agente/tipos';
import { ListaChips } from './ChipEvidencia';
import { TEXTOS_AGENTE } from './textos';

interface Props {
  verificaciones: readonly Verificacion[];
  intervenciones: readonly Intervencion[];
  solicitudes: readonly SolicitudDocumento[];
  causas: readonly Causa[];
}

function LineaCausa({ id, enunciado }: { id: string; enunciado: string }) {
  return (
    <p className="plan__causa">
      <span className="id">{id}</span> <span>{enunciado}</span>
    </p>
  );
}

export function Verificaciones({ verificaciones, intervenciones, solicitudes, causas }: Props) {
  const V = TEXTOS_AGENTE.secciones.verificaciones;
  const enunciado = (id: string) => causas.find((c) => c.id === id)?.enunciado ?? '';

  return (
    <div className="plan">
      {verificaciones.length > 0 && (
        <div>
          <h4 className="plan__titulo">{V.verificar}</h4>
          <ul className="plan__lista">
            {verificaciones.map((v, i) => (
              <li key={`${v.causa}-${i}`} className="plan__tarjeta plan__tarjeta--verificar">
                <LineaCausa id={v.causa} enunciado={enunciado(v.causa)} />
                <dl>
                  <div><dt>{V.queRevisar}</dt><dd>{v.queRevisar}</dd></div>
                  <div><dt>{V.conQuien}</dt><dd>{v.conQuien}</dd></div>
                  <div className="plan__confirma"><dt>{V.confirmaSi}</dt><dd>{v.confirmaSi}</dd></div>
                  <div className="plan__descarta"><dt>{V.descartaSi}</dt><dd>{v.descartaSi}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        </div>
      )}

      {intervenciones.length > 0 && (
        <div>
          <h4 className="plan__titulo">{V.intervenciones}</h4>
          <p className="ayuda">{V.intervencionAyuda}</p>
          <ul className="plan__lista">
            {intervenciones.map((x, i) => (
              <li key={`${x.causa}-${i}`} className="plan__tarjeta plan__tarjeta--intervenir">
                <LineaCausa id={x.causa} enunciado={enunciado(x.causa)} />
                <p className="plan__accion">{x.accion}</p>
                <ListaChips ids={x.evidencia} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {solicitudes.length > 0 && (
        <div>
          <h4 className="plan__titulo">{V.documentos}</h4>
          <ul className="plan__lista">
            {solicitudes.map((s) => (
              <li key={s.id} className="plan__tarjeta plan__tarjeta--documento">
                <p className="plan__causa">
                  <span className="id">{s.id}</span> <span>{s.descripcion}</span>
                </p>
                <p className="plan__motivo">
                  <span className="rotulo">{V.motivo}</span>
                  {s.motivo}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
