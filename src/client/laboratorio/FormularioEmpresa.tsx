import { useState } from 'react';
import type { FormEvent } from 'react';
import { CASOS_PREPARADOS_PUBLICOS as CASOS_PREPARADOS } from '../../nucleo/laboratorio/casosPublicos';
import type { ParametrosLaboratorio } from '../../nucleo/laboratorio/tipos';
import { TEXTOS_LAB } from './textos';

interface Props {
  ocupado: boolean;
  onCrear: (cuerpo: { preparado: string } | ParametrosLaboratorio) => void;
}

export function FormularioEmpresa({ ocupado, onCrear }: Props) {
  const T = TEXTOS_LAB.formulario;
  const [giro, setGiro] = useState('');
  const [tamano, setTamano] = useState<ParametrosLaboratorio['tamano']>('pequena');
  const [sintoma, setSintoma] = useState('');
  const [distractores, setDistractores] = useState(2);
  const [documentoClave, setDocumentoClave] = useState(true);

  const valido = giro.trim().length >= 3 && giro.trim().length <= 80 && sintoma.trim().length >= 10 && sintoma.trim().length <= 200;

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || ocupado) return;
    onCrear({ giro: giro.trim(), tamano, sintoma: sintoma.trim(), distractores: distractores as ParametrosLaboratorio['distractores'], documentoClave });
  }

  return (
    <div className="lab-formulario">
      <form onSubmit={enviar} className="lab-tarjeta" aria-labelledby="lab-form-titulo">
        <h3 id="lab-form-titulo">{T.titulo}</h3>
        <p className="ayuda">{T.ayuda}</p>
        <label className="campo">
          <span>{T.giro}</span>
          <input value={giro} minLength={3} maxLength={80} required placeholder={T.giroEjemplo} onChange={(e) => setGiro(e.target.value)} />
        </label>
        <label className="campo">
          <span>{T.tamano}</span>
          <select value={tamano} onChange={(e) => setTamano(e.target.value as ParametrosLaboratorio['tamano'])}>
            <option value="micro">{T.tamanos.micro}</option>
            <option value="pequena">{T.tamanos.pequena}</option>
            <option value="mediana">{T.tamanos.mediana}</option>
          </select>
        </label>
        <label className="campo">
          <span>{T.sintoma}</span>
          <textarea value={sintoma} rows={3} minLength={10} maxLength={200} required placeholder={T.sintomaEjemplo} onChange={(e) => setSintoma(e.target.value)} aria-describedby="lab-sintoma-ayuda" />
        </label>
        <p className="ayuda" id="lab-sintoma-ayuda">{T.sintomaAyuda}</p>
        <label className="campo">
          <span>{T.distractores}: {distractores}</span>
          <input type="range" min={0} max={4} step={1} value={distractores} onChange={(e) => setDistractores(Number(e.target.value))} />
        </label>
        <label className="lab-check">
          <input type="checkbox" checked={documentoClave} onChange={(e) => setDocumentoClave(e.target.checked)} />
          <span>{T.documentoClave}</span>
        </label>
        <button type="submit" className="boton" disabled={!valido || ocupado}>
          {ocupado ? T.creando : T.crear}
        </button>
      </form>

      <section className="lab-tarjeta" aria-labelledby="lab-preparadas-titulo">
        <h3 id="lab-preparadas-titulo">{T.preparadas}</h3>
        <p className="ayuda">{T.preparadasAyuda}</p>
        <div className="lab-preparadas">
          {CASOS_PREPARADOS.map((preparado) => (
            <article key={preparado.caso.id} className="lab-preparada">
              <h4>{preparado.caso.empresa.nombre}</h4>
              <p>{preparado.caso.empresa.descripcion}</p>
              <p className="lab-meta">
                {T.personas(preparado.caso.personas.length)} · {preparado.caso.parametros.documentoClave ? T.conDocumentoClave : T.sinDocumentoClave}
              </p>
              <p className="lab-meta">{preparado.caso.personas.map((p) => p.rol).join(' · ')}</p>
              <button type="button" className="boton boton--secundario" disabled={ocupado} onClick={() => onCrear({ preparado: preparado.caso.id })}>
                {T.usarPreparada}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
