// Sección "Cómo funciona": el recorrido del producto con el caso ficticio del taller. Estática:
// no llama a la API ni al modelo. Arriba, un mapa de un vistazo (quién hace cada paso); abajo,
// cada estación con un artefacto real del caso.
import type { ReactNode } from 'react';
import type { Nivel } from '../../nucleo/tipos';
import { FUENTES_EJEMPLO, ORACIONES_EJEMPLO, type ClaveOracion } from './datos';
import { TEXTOS_FLUJO, type Carril } from './textos';
import './flujo.css';

const T = TEXTOS_FLUJO;
const A = T.artefactos;
const ESCALA = [1, 2, 3, 4] as const;
// En inglés los roles del caso (que está en español) se muestran traducidos.
const rol = (r: string) => T.roles?.[r] ?? r;

function Oracion({ clave, nivel }: { clave: ClaveOracion; nivel?: Nivel }) {
  const o = ORACIONES_EJEMPLO[clave];
  return (
    <blockquote className="flujo-oracion">
      <p>«{T.traduccion?.[clave] ?? o.texto}»</p>
      <footer>
        <code className="flujo-id">{o.id}</code>
        <span>{rol(o.hablante)}</span>
        {nivel !== undefined && <span className={`flujo-nivel nivel-${nivel}`}>N{nivel}</span>}
      </footer>
    </blockquote>
  );
}

function Medidor() {
  return (
    <ol className="flujo-medidor">
      {A.niveles.map((n) => (
        <li key={n.nivel} className={`nivel-${n.nivel}`}>
          <span className="insignia__escala" aria-hidden="true">
            {ESCALA.map((i) => <i key={i} className={i <= n.nivel ? 'lleno' : ''} />)}
          </span>
          <span className="flujo-medidor__n">N{n.nivel} · {n.nombre}</span>
          <span className="flujo-medidor__quien">{n.quien}</span>
        </li>
      ))}
    </ol>
  );
}

const ARTEFACTOS: (() => ReactNode)[] = [
  () => (
    <>
      <p className="flujo-artefacto__titulo">{A.fuentes}</p>
      <ul className="flujo-fuentes">
        {FUENTES_EJEMPLO.map((f) => (
          <li key={f.id}>
            <code className="flujo-id">{f.id}</code> {rol(f.rol)} <span className="flujo-tenue">· {f.tipo === 'documento' ? A.documento : A.entrevista}</span>
          </li>
        ))}
      </ul>
      <p className="flujo-artefacto__titulo">{A.oracion}</p>
      <Oracion clave="plazoJefe" />
    </>
  ),
  () => (
    <>
      <p className="flujo-artefacto__titulo">{A.citaReconstruida}</p>
      <Oracion clave="plazoCompras" />
      <p className="flujo-rechazo">{A.rechazo}</p>
    </>
  ),
  () => <Medidor />,
  () => (
    <>
      <table className="flujo-esnoes">
        <tbody>
          <tr><th scope="row">{A.es}</th><td>{A.esTexto}</td></tr>
          <tr><th scope="row">{A.noEs}</th><td>{A.noEsTexto}</td></tr>
        </tbody>
      </table>
      <Oracion clave="mesas" nivel={3} />
      <p className="flujo-rechazo">{A.bloqueo}</p>
      <p className="flujo-causa">{A.causa}</p>
    </>
  ),
  () => (
    <ul className="flujo-entregables">
      {A.entregables.map((x) => (
        <li key={x.nombre}>
          <strong>{x.nombre}</strong>
          <span className="flujo-tenue">{x.metodo}</span>
        </li>
      ))}
    </ul>
  ),
];

const FILA: Record<Carril, number> = { consultor: 1, modelo: 2, codigo: 3 };
const CARRILES: Carril[] = ['consultor', 'modelo', 'codigo'];

export function PanelFlujo({ onIrAlAgente }: { onIrAlAgente: () => void }) {
  return (
    <section className="flujo" aria-labelledby="flujo-titulo">
      <h2 id="flujo-titulo">{T.titulo}</h2>
      <p className="flujo-intro">{T.intro}</p>

      <div className="flujo-contraste" role="group" aria-label={T.contraste.etiqueta}>
        <div className="flujo-contraste__lado">
          <p className="flujo-artefacto__titulo">{T.contraste.dijo}</p>
          <Oracion clave="flojo" nivel={1} />
        </div>
        <span className="flujo-contraste__flecha" aria-hidden="true">→</span>
        <div className="flujo-contraste__lado flujo-contraste__lado--evidencia">
          <p className="flujo-artefacto__titulo">{T.contraste.mostro}</p>
          <p className="flujo-contraste__causa">{T.contraste.causa}</p>
          <Oracion clave="registro" nivel={4} />
        </div>
      </div>

      <ul className="flujo-promesas">
        {T.promesas.map((p) => <li key={p}>{p}</li>)}
      </ul>

      <nav className="flujo-mapa" aria-label={T.carriles.etiqueta}>
        {CARRILES.map((c) => (
          <span key={c} className={`flujo-mapa__carril flujo-mapa__carril--${c}`} style={{ gridRow: FILA[c] }}>
            {T.carriles[c]}
          </span>
        ))}
        <ol className="flujo-mapa__nodos">
          {T.estaciones.map((e, i) => {
            const filas = e.carriles.map((c) => FILA[c]);
            return (
              <li key={e.corto} style={{ gridColumn: i + 2, gridRow: `${Math.min(...filas)} / ${Math.max(...filas) + 1}` }}>
                <a href={`#estacion-${i + 1}`} className={`flujo-nodo ${e.carriles.map((c) => `flujo-nodo--${c}`).join(' ')}`}>
                  <span className="flujo-nodo__n">{i + 1}</span>
                  <span className="flujo-nodo__texto">{e.corto}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <ol className="flujo-estaciones" aria-label={T.estacionesEtiqueta}>
        {T.estaciones.map((e, i) => (
          <li key={e.titulo} id={`estacion-${i + 1}`} className="flujo-estacion" tabIndex={-1}>
            <div className="flujo-estacion__texto">
              <p className="flujo-estacion__cabeza">
                <span className="flujo-nodo__n" aria-hidden="true">{i + 1}</span>
                {e.carriles.map((c) => (
                  <span key={c} className={`flujo-quien flujo-quien--${c}`}>{T.carriles[c]}</span>
                ))}
              </p>
              <h3>{e.titulo}</h3>
              <p>{e.texto}</p>
              <p className="flujo-metodo">{e.metodo}</p>
            </div>
            <div className="flujo-artefacto">{ARTEFACTOS[i]()}</div>
          </li>
        ))}
      </ol>

      <div className="flujo-cta">
        <button type="button" className="boton" onClick={onIrAlAgente}>{T.cta.boton}</button>
        <p className="flujo-tenue">{T.cta.nota}</p>
      </div>
      {T.notaTraduccion && <p className="flujo-tenue">{T.notaTraduccion}</p>}
      <p className="flujo-tenue">{T.pie}</p>
    </section>
  );
}
