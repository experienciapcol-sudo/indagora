import { useState } from 'react';
import type { FuenteEntrada } from '../../nucleo/tipos';
import { textoDeSegmentos } from '../../nucleo/laboratorio/voz';
import { formatoUsdLocal } from './formato';
import { AsignadorHablantes } from './AsignadorHablantes';
import { GrabadoraVoz } from './GrabadoraVoz';
import { esAbortada, transcribirAudio } from './api';
import { TEXTOS_LAB } from './textos';

interface Props {
  idFuente: string;
  onFuenteCreada: (fuente: FuenteEntrada) => void;
}

// Entrada real al análisis: audio transcrito o texto pegado; ambos pasan por la
// misma pantalla de asignación de hablantes y producen una FuenteEntrada normal.
export function PanelEntrevistaReal({ idFuente, onFuenteCreada }: Props) {
  const T = TEXTOS_LAB.voz;
  const [audio, setAudio] = useState<Blob | null>(null);
  const [transcribiendo, setTranscribiendo] = useState(false);
  const [texto, setTexto] = useState('');
  const [origen, setOrigen] = useState<'voz' | 'pegado' | null>(null);
  const [referencias, setReferencias] = useState<Record<string, string>>({});
  const [pegado, setPegado] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [creada, setCreada] = useState(false);

  async function transcribir() {
    if (!audio) {
      setError(T.errores.vacio);
      return;
    }
    setTranscribiendo(true);
    setError('');
    try {
      const resp = await transcribirAudio(audio);
      setTexto(resp.texto || textoDeSegmentos(resp.segmentos));
      const mapa: Record<string, string> = {};
      const vistos = new Map<string, string>();
      for (const s of resp.segmentos) {
        if (!vistos.has(s.hablante)) vistos.set(s.hablante, `Hablante ${vistos.size + 1}`);
        mapa[vistos.get(s.hablante)!] = s.hablante;
      }
      setReferencias(mapa);
      setOrigen('voz');
      setMensaje(TEXTOS_LAB.voz.transcripcionLista(`${Math.round(resp.duracionS)} s`, formatoUsdLocal(resp.costoUsd)));
    } catch (e) {
      if (!esAbortada(e)) setError(e instanceof Error ? e.message : TEXTOS_LAB.errores.sinConexion);
    } finally {
      setTranscribiendo(false);
    }
  }

  function usarPegado() {
    if (!pegado.trim()) {
      setError(T.errores.textoVacio);
      return;
    }
    setError('');
    setTexto(pegado);
    setReferencias({});
    setOrigen('pegado');
  }

  return (
    <section className="lab-tarjeta" aria-labelledby="lab-voz-titulo">
      <h3 id="lab-voz-titulo">{T.titulo}</h3>
      <p className="ayuda">{TEXTOS_LAB.voz.ayudaReal ?? T.titulo}</p>

      <GrabadoraVoz ocupado={transcribiendo} onListo={setAudio} />
      <div className="lab-acciones">
        <button type="button" className="boton" disabled={!audio || transcribiendo} onClick={() => void transcribir()}>
          {transcribiendo ? T.transcribiendo : T.transcribir}
        </button>
      </div>
      {mensaje && <p className="aviso-estado" role="status">{mensaje}</p>}

      <h4>{T.pegarTitulo}</h4>
      <label className="campo">
        <span className="solo-lectores">{T.pegarTitulo}</span>
        <textarea rows={7} value={pegado} placeholder={T.pegarEjemplo} onChange={(e) => setPegado(e.target.value)} aria-describedby="lab-pegado-ayuda" spellCheck={false} />
      </label>
      <p className="ayuda" id="lab-pegado-ayuda">{T.pegarAyuda}</p>
      <button type="button" className="boton boton--secundario" onClick={usarPegado}>
        {T.usarTexto}
      </button>

      {error && <p className="aviso-error" role="alert">{error}</p>}

      {texto && origen && (
        <AsignadorHablantes
          key={`${origen}-${texto.length}`}
          texto={texto}
          limpiarInicial={origen === 'voz'}
          referencias={referencias}
          idFuente={idFuente}
          onConfirmar={(fuente) => {
            onFuenteCreada(fuente);
            setCreada(true);
          }}
        />
      )}
      {creada && <p className="aviso-estado" role="status">{TEXTOS_LAB.hablantes.creado}</p>}
    </section>
  );
}
