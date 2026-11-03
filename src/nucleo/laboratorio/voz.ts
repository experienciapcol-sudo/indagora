// Cabecera WAV y segmentos de diarización a texto con etiquetas. Código puro sobre bytes.
import type { InfoWav, SegmentoDiarizado } from './tipos';

function textoAscii(b: Uint8Array, desde: number, largo: number): string {
  return String.fromCharCode(...b.slice(desde, desde + largo));
}
function u16(b: Uint8Array, o: number): number { return b[o] | (b[o + 1] << 8); }
function u32(b: Uint8Array, o: number): number { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }

export function leerCabeceraWav(b: Uint8Array): InfoWav {
  const base: InfoWav = { valida: false, motivo: null, duracionS: 0, canales: 0, muestraHz: 0, bits: 0 };
  if (b.length < 44 || textoAscii(b, 0, 4) !== 'RIFF' || textoAscii(b, 8, 4) !== 'WAVE') {
    return { ...base, motivo: 'El archivo no es un WAV válido.' };
  }
  let formato = 0, canales = 0, muestraHz = 0, bits = 0, bytesDatos = 0;
  let offset = 12;
  while (offset + 8 <= b.length) {
    const id = textoAscii(b, offset, 4);
    const tam = u32(b, offset + 4);
    const datos = offset + 8;
    if (id === 'fmt ' && datos + 16 <= b.length) {
      formato = u16(b, datos); canales = u16(b, datos + 2); muestraHz = u32(b, datos + 4); bits = u16(b, datos + 14);
    }
    // Todo lo que viene después de la cabecera de data cuenta: el ASR recibe el archivo entero,
    // así que un tamaño declarado menor no puede abaratar la reserva de gasto.
    if (id === 'data') { bytesDatos = b.length - datos; break; }
    offset = datos + tam + (tam % 2);
  }
  const info: InfoWav = { ...base, canales, muestraHz, bits };
  if (!bytesDatos) return { ...info, motivo: 'El WAV no trae datos de audio.' };
  info.duracionS = muestraHz && canales && bits ? bytesDatos / (muestraHz * canales * (bits / 8)) : 0;
  if (formato !== 1 || bits !== 16) return { ...info, motivo: 'El audio debe ser WAV PCM de 16 bits.' };
  if (canales !== 1) return { ...info, motivo: 'El audio debe ser mono; este archivo tiene más de un canal.' };
  if (muestraHz !== 16000 && muestraHz !== 24000) return { ...info, motivo: 'El audio debe estar a 16 o 24 kHz.' };
  if (info.duracionS > 600) return { ...info, motivo: 'El audio dura más de 10 minutos.' };
  return { ...info, valida: true };
}

export function textoDeSegmentos(segmentos: SegmentoDiarizado[]): string {
  const etiquetas = new Map<string, string>();
  const lineas: string[] = [];
  for (const s of segmentos) {
    if (!s.texto.trim()) continue;
    if (!etiquetas.has(s.hablante)) etiquetas.set(s.hablante, `Hablante ${etiquetas.size + 1}`);
    lineas.push(`${etiquetas.get(s.hablante)}: ${s.texto.trim()}`);
  }
  return lineas.join('\n');
}
