import { useState } from 'react';
import type { FormEvent } from 'react';
import type { FuenteEntrada, Modalidad, TipoFuente } from '../nucleo/tipos';
import { siguienteId } from './sesion';
import { TEXTOS } from './textos';

export interface InfoCaso {
  titulo: string;
  objetivo: string;
  descripcion: string;
}

interface Props {
  fuentes: readonly FuenteEntrada[];
  caso: InfoCaso | null;
  bloqueado: boolean;
  onAgregar: (fuente: FuenteEntrada) => void;
  onQuitar: (id: string) => void;
  onCargarCaso: () => void;
}

export function PanelFuentes({ fuentes, caso, bloqueado, onAgregar, onQuitar, onCargarCaso }: Props) {
  const T = TEXTOS.fuentes;
  const [tipo, setTipo] = useState<TipoFuente>('entrevista');
  const [modalidad, setModalidad] = useState<Modalidad>('transcripcion');
  const [rol, setRol] = useState('');
  const [titulo, setTitulo] = useState('');
  const [entrevistador, setEntrevistador] = useState('');
  const [texto, setTexto] = useState('');

  const idNuevo = siguienteId(fuentes, tipo);
  const completo = rol.trim() !== '' && titulo.trim() !== '' && texto.trim() !== '';

  function agregar(e: FormEvent) {
    e.preventDefault();
    if (!completo || bloqueado) return;
    onAgregar({
      id: idNuevo,
      tipo,
      rol: rol.trim(),
      modalidad,
      titulo: titulo.trim(),
      entrevistador: tipo === 'entrevista' && entrevistador.trim() !== '' ? entrevistador.trim() : null,
      texto: texto.trim(),
    });
    setTitulo('');
    setTexto('');
  }

  return (
    <section className="panel" aria-labelledby="t-fuentes">
      <div className="panel__cabeza">
        <h2 id="t-fuentes">{T.titulo}</h2>
        <button type="button" className="boton boton--secundario panel__accion" onClick={onCargarCaso} disabled={bloqueado}>
          {T.cargarCaso}
        </button>
      </div>

      {caso && fuentes.length > 0 && (
        <aside className="caso" aria-label={caso.titulo}>
          <p className="caso__marca">{T.casoFicticio}</p>
          <p className="caso__titulo">{caso.titulo}</p>
          <p className="caso__descripcion">{caso.descripcion}</p>
          <p className="caso__objetivo">
            <span>{T.objetivo}</span>
            {caso.objetivo}
          </p>
        </aside>
      )}

      {fuentes.length === 0 ? (
        <p className="vacio">{T.vacio}</p>
      ) : (
        <ul className="fuentes" aria-label={T.titulo}>
          {fuentes.map((f) => (
            <li key={f.id} className="fuente">
              <span className="id">{f.id}</span>
              <span className="fuente__titulo">{f.titulo}</span>
              <span className="fuente__meta">
                {TEXTOS.tipos[f.tipo]} · {f.rol} · {TEXTOS.modalidades[f.modalidad]}
              </span>
              <button
                type="button"
                className="boton boton--texto"
                onClick={() => onQuitar(f.id)}
                disabled={bloqueado}
                aria-label={T.quitarFuente(f.id)}
              >
                {T.quitar}
              </button>
            </li>
          ))}
        </ul>
      )}

      <details className="agregar" open={fuentes.length === 0}>
        <summary>{T.agregar}</summary>
        <form onSubmit={agregar} className="formulario">
          <div className="formulario__fila">
            <label className="campo">
              <span>{T.campos.tipo}</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoFuente)}>
                <option value="entrevista">{TEXTOS.tipos.entrevista}</option>
                <option value="documento">{TEXTOS.tipos.documento}</option>
              </select>
            </label>
            <label className="campo">
              <span>{T.campos.modalidad}</span>
              <select value={modalidad} onChange={(e) => setModalidad(e.target.value as Modalidad)}>
                <option value="transcripcion">{TEXTOS.modalidades.transcripcion}</option>
                <option value="notas">{TEXTOS.modalidades.notas}</option>
              </select>
            </label>
            <label className="campo">
              <span>{T.campos.rol}</span>
              <input value={rol} onChange={(e) => setRol(e.target.value)} placeholder={T.campos.rolEjemplo} required />
            </label>
          </div>
          <p className="ayuda">{TEXTOS.modalidadAyuda} {T.campos.rolAyuda}.</p>

          <div className="formulario__fila">
            <label className="campo campo--ancho">
              <span>{T.campos.titulo}</span>
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={T.campos.tituloEjemplo} required />
            </label>
            {tipo === 'entrevista' && (
              <label className="campo">
                <span>{T.campos.entrevistador}</span>
                <input
                  value={entrevistador}
                  onChange={(e) => setEntrevistador(e.target.value)}
                  placeholder={T.campos.entrevistadorEjemplo}
                  aria-describedby="ayuda-entrevistador"
                />
              </label>
            )}
          </div>
          {tipo === 'entrevista' && (
            <p className="ayuda" id="ayuda-entrevistador">
              {T.campos.entrevistadorAyuda}
            </p>
          )}

          <label className="campo">
            <span>{T.campos.texto}</span>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={8}
              required
              aria-describedby="ayuda-texto"
              spellCheck={false}
            />
          </label>
          <p className="ayuda" id="ayuda-texto">
            {T.campos.textoAyuda} {T.soloFicticios}
          </p>

          <button type="submit" className="boton" disabled={!completo || bloqueado}>
            {T.botonAgregar(idNuevo)}
          </button>
        </form>
      </details>
    </section>
  );
}
