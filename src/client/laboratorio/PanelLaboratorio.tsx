import { useState } from 'react';
import type { FuenteEntrada } from '../../nucleo/tipos';
import { planDeRondas } from '../../nucleo/laboratorio/entrevistas';
import type { ParametrosLaboratorio } from '../../nucleo/laboratorio/tipos';
import { obtenerAgente } from '../agente/api';
import { PanelAgente } from '../agente/PanelAgente';
import { crearLaboratorio, entrevistarLaboratorio, iniciarAgenteLaboratorio, revelarLaboratorio } from './api';
import type { RespuestaRevelar, VistaLaboratorio } from './api';
import { FormularioEmpresa } from './FormularioEmpresa';
import { PanelEntrevistaReal } from './PanelEntrevistaReal';
import { TEXTOS_LAB } from './textos';
import { VistaEntrevistas } from './VistaEntrevistas';
import { VistaRevelacion } from './VistaRevelacion';
import './laboratorio.css';

const CLAVE_AGENTE = 'indagora-agente';

interface Props {
  siguienteIdFuente: string;
  onFuenteReal: (fuente: FuenteEntrada) => void;
}

export function PanelLaboratorio({ siguienteIdFuente, onFuenteReal }: Props) {
  const T = TEXTOS_LAB;
  const [vista, setVista] = useState<VistaLaboratorio | null>(null);
  const [revelacion, setRevelacion] = useState<RespuestaRevelar | null>(null);
  const [agenteId, setAgenteId] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState('');
  const [error, setError] = useState('');
  const [forzar, setForzar] = useState(false);
  const [avisoRevelar, setAvisoRevelar] = useState('');

  const ocupadoAlgo = ocupado !== '';
  const caso = vista?.caso ?? null;
  const enGrabado = vista?.modo === 'grabado';

  async function ejecutar(nombre: string, accion: () => Promise<void>) {
    setOcupado(nombre);
    setError('');
    try {
      await accion();
    } catch (e) {
      setError(T.errores.generico(e instanceof Error ? e.message : ''));
    } finally {
      setOcupado('');
    }
  }

  const crear = (cuerpo: { preparado: string } | ParametrosLaboratorio) =>
    void ejecutar('crear', async () => {
      setRevelacion(null);
      setAgenteId(null);
      setVista(await crearLaboratorio(cuerpo));
    });

  const entrevistar = () => {
    if (!vista) return;
    void ejecutar('entrevistar', async () => setVista(await entrevistarLaboratorio(vista.id)));
  };

  const iniciarAgente = () => {
    if (!vista) return;
    void ejecutar('agente', async () => {
      const siguiente = await iniciarAgenteLaboratorio(vista.id);
      setVista({ ...siguiente, caso: siguiente.caso ?? vista.caso, intercambios: siguiente.intercambios.length ? siguiente.intercambios : vista.intercambios });
      if (siguiente.agenteId) {
        try {
          sessionStorage.setItem(CLAVE_AGENTE, siguiente.agenteId);
        } catch {
          // Sin almacenamiento: el panel de abajo no retomará, pero el id queda en pantalla.
        }
        setAgenteId(siguiente.agenteId);
      }
    });
  };

  const revelar = () => {
    if (!vista) return;
    void ejecutar('revelar', async () => {
      setAvisoRevelar('');
      if (agenteId && !forzar) {
        const agente = await obtenerAgente(agenteId);
        if (!agente.estado.terminado) {
          setAvisoRevelar(T.revelacion.faltaTerminar);
          return;
        }
      }
      setRevelacion(await revelarLaboratorio(vista.id, forzar));
    });
  };

  const noEntrevistoATodas = caso ? planDeRondas(caso).length < caso.personas.length : false;

  return (
    <section className="laboratorio" aria-labelledby="t-laboratorio">
      <div className="lab-cabeza">
        <h2 id="t-laboratorio">{T.titulo}</h2>
        <p className="aviso-fijo" role="note">{T.avisoFicticio}</p>
      </div>

      {enGrabado && (
        <p className="lab-grabado-aviso" role="alert">{T.avisoGrabadoTitulo}</p>
      )}
      {vista?.aviso && <p className="aviso-estado" role="status">{vista.aviso}</p>}
      {error && <p className="aviso-error" role="alert">{error}</p>}

      <FormularioEmpresa ocupado={ocupadoAlgo} onCrear={crear} />

      {enGrabado && vista?.grabado && (
        <section className="lab-tarjeta" aria-labelledby="lab-grabado-titulo">
          <h3 id="lab-grabado-titulo">{T.grabado.titulo}</h3>
          <p className="ayuda">{T.grabado.ayuda}</p>
          {vista.grabado.comparacionReferencia && (
            <p className="lab-veredicto" role="status">
              {T.grabado.comparacionReferencia}: {T.revelacion.veredictos[vista.grabado.comparacionReferencia.veredicto]}
            </p>
          )}
          {vista.grabado.textos.map((texto, i) => (
            <pre key={i} className="lab-vista-previa">{texto}</pre>
          ))}
        </section>
      )}

      {caso && vista && (
        <section className="lab-tarjeta" aria-labelledby="lab-caso-titulo">
          <h3 id="lab-caso-titulo">{T.caso.titulo}: {caso.empresa.nombre}</h3>
          <p>{caso.empresa.descripcion}</p>
          <p><strong>{T.caso.objetivo}:</strong> {caso.objetivo}</p>
          <h4>{T.caso.personas}</h4>
          <ul>
            {caso.personas.map((p) => (
              <li key={p.id}><strong>{p.rol}.</strong> {p.presentacion}</li>
            ))}
          </ul>
          {caso.documentos.length > 0 && (
            <>
              <h4>{T.caso.documentos}</h4>
              <ul>
                {caso.documentos.map((d) => (
                  <li key={d.id}>{d.titulo}{d.esClave ? '' : ''}</li>
                ))}
              </ul>
              <p className="ayuda">{T.caso.documentoClave}</p>
            </>
          )}
          {!enGrabado && (
            <div className="lab-acciones">
              <button type="button" className="boton" disabled={ocupadoAlgo || vista.estado === 'listo' || vista.estado === 'revelado'} onClick={entrevistar}>
                {ocupado === 'entrevistar' ? T.caso.entrevistando : T.caso.entrevistar}
              </button>
              <button type="button" className="boton boton--secundario" disabled={ocupadoAlgo || vista.intercambios.length === 0 || agenteId !== null} onClick={iniciarAgente}>
                {ocupado === 'agente' ? T.caso.iniciando : T.caso.iniciarAgente}
              </button>
            </div>
          )}
          {vista.intercambios.length > 0 && <p className="aviso-estado" role="status">{T.caso.entrevistasListas}</p>}
          {noEntrevistoATodas && vista.intercambios.length > 0 && <p className="ayuda" role="note">{T.caso.noTodas}</p>}
        </section>
      )}

      {caso && vista && vista.intercambios.length > 0 && <VistaEntrevistas caso={caso} intercambios={vista.intercambios} />}

      {agenteId && (
        <section aria-label={T.caso.iniciarAgente}>
          <p className="ayuda">{T.caso.verAgenteAbajo}</p>
          {/* Se reutiliza el panel del agente: retoma el id guardado en la sesión. */}
          <PanelAgente />
        </section>
      )}

      {caso && !enGrabado && (
        <section className="lab-tarjeta" aria-labelledby="lab-revelar-titulo">
          <h3 id="lab-revelar-titulo">{T.revelacion.titulo}</h3>
          <p className="ayuda">{T.revelacion.ayuda}</p>
          <label className="lab-check">
            <input type="checkbox" checked={forzar} onChange={(e) => setForzar(e.target.checked)} />
            <span>{T.revelacion.forzar}</span>
          </label>
          <div className="lab-acciones">
            <button type="button" className="boton" disabled={ocupadoAlgo || !agenteId} onClick={revelar}>
              {ocupado === 'revelar' ? T.revelacion.revelando : T.revelacion.boton}
            </button>
          </div>
          {avisoRevelar && <p className="lab-aviso-fuga" role="alert">{avisoRevelar}</p>}
        </section>
      )}

      {caso && revelacion && <VistaRevelacion caso={caso} verdad={revelacion.verdad} comparacion={revelacion.comparacion} />}

      <PanelEntrevistaReal idFuente={siguienteIdFuente} onFuenteCreada={onFuenteReal} />
    </section>
  );
}
