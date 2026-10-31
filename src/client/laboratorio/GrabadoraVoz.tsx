import { useEffect, useRef, useState } from 'react';
import { leerCabeceraWav } from '../../nucleo/laboratorio/voz';
import { TEXTOS_LAB } from './textos';
import { codificarWavMono16k, duracionSegundos, formatoBytes, formatoTiempo, MAX_SEGUNDOS, mezclarAMono, tamanoEstimadoWav } from './wavCliente';

interface Props {
  ocupado: boolean;
  onListo: (audio: Blob) => void;
}

// Graba con MediaRecorder cuando está disponible y, al detener, decodifica el audio
// capturado y lo convierte a WAV mono de 16 kHz. También acepta subir un WAV ya hecho.
export function GrabadoraVoz({ ocupado, onListo }: Props) {
  const T = TEXTOS_LAB.voz;
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [urlPrevia, setUrlPrevia] = useState<string | null>(null);
  const [error, setError] = useState('');
  const grabadora = useRef<MediaRecorder | null>(null);
  const partes = useRef<Blob[]>([]);
  const flujo = useRef<MediaStream | null>(null);
  const temporizador = useRef<number | null>(null);

  const detenerFlujo = () => {
    flujo.current?.getTracks().forEach((t) => t.stop());
    flujo.current = null;
    if (temporizador.current !== null) window.clearInterval(temporizador.current);
    temporizador.current = null;
  };

  useEffect(() => () => {
    detenerFlujo();
    if (urlPrevia) URL.revokeObjectURL(urlPrevia);
    // Solo limpieza al desmontar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function entregar(blob: Blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (!leerCabeceraWav(bytes).valida && blob.type.includes('wav')) {
      setError(T.errores.noWav);
      return;
    }
    if (urlPrevia) URL.revokeObjectURL(urlPrevia);
    setUrlPrevia(URL.createObjectURL(blob));
    onListo(blob);
  }

  async function empezar() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(T.errores.sinMicrofono);
      return;
    }
    try {
      flujo.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(T.errores.permiso);
      return;
    }
    partes.current = [];
    const recorder = new MediaRecorder(flujo.current);
    grabadora.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size) partes.current.push(e.data);
    };
    recorder.onstop = () => {
      void (async () => {
        detenerFlujo();
        setGrabando(false);
        try {
          const crudo = new Blob(partes.current);
          const contexto = new AudioContext();
          const bufer = await contexto.decodeAudioData(await crudo.arrayBuffer());
          const canales = Array.from({ length: bufer.numberOfChannels }, (_, i) => bufer.getChannelData(i));
          const mono = mezclarAMono(canales);
          await contexto.close();
          if (duracionSegundos(mono, bufer.sampleRate) > MAX_SEGUNDOS) setError(T.avisoNueve);
          await entregar(codificarWavMono16k(mono, bufer.sampleRate));
        } catch {
          setError(T.errores.decodificar);
        }
      })();
    };
    recorder.start(1000);
    setSegundos(0);
    setGrabando(true);
    temporizador.current = window.setInterval(() => {
      setSegundos((s) => {
        if (s + 1 >= MAX_SEGUNDOS) recorder.stop();
        return s + 1;
      });
    }, 1000);
  }

  function detener() {
    if (grabadora.current?.state === 'recording') grabadora.current.stop();
  }

  async function alSubir(archivo: File | undefined) {
    setError('');
    if (!archivo) return;
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const info = leerCabeceraWav(bytes);
    if (!info.valida) {
      setError(info.motivo ?? T.errores.noWav);
      return;
    }
    await entregar(archivo);
  }

  return (
    <div className="lab-grabadora">
      <div className="lab-acciones">
        {grabando ? (
          <button type="button" className="boton boton--peligro" onClick={detener}>
            {T.detener}
          </button>
        ) : (
          <button type="button" className="boton" disabled={ocupado} onClick={() => void empezar()}>
            {T.grabar}
          </button>
        )}
        {grabando && (
          <span role="status">
            {T.grabando(formatoTiempo(segundos))} · {formatoBytes(tamanoEstimadoWav(segundos * 16000))}
          </span>
        )}
      </div>
      {grabando && segundos >= 540 && <p className="lab-aviso-fuga" role="alert">{T.avisoNueve}</p>}
      <p className="ayuda">{T.subirAyuda} {T.archivoAyuda}</p>
      <label className="campo">
        <span>{T.subir}</span>
        <input type="file" accept=".wav,audio/wav,audio/x-wav" disabled={ocupado || grabando} onChange={(e) => void alSubir(e.target.files?.[0])} />
      </label>
      {urlPrevia && (
        <div>
          <p>{T.escuchar}</p>
          <audio controls src={urlPrevia} aria-label={T.escuchar} />
        </div>
      )}
      {error && <p className="aviso-error" role="alert">{error}</p>}
    </div>
  );
}
