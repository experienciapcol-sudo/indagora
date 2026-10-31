// Conversión a WAV mono de 16 bits a 16 kHz en el navegador. Código puro sobre muestras:
// no toca el DOM, así que se prueba sin micrófono ni AudioContext.
export const HZ_DESTINO = 16000;
export const MAX_SEGUNDOS = 600;

// Mezcla los canales a mono por promedio, muestra a muestra.
export function mezclarAMono(canales: readonly Float32Array[]): Float32Array {
  if (canales.length === 0) return new Float32Array(0);
  const largo = Math.min(...canales.map((c) => c.length));
  const salida = new Float32Array(largo);
  for (let i = 0; i < largo; i++) {
    let suma = 0;
    for (const canal of canales) suma += canal[i];
    salida[i] = suma / canales.length;
  }
  return salida;
}

// Remuestreo lineal simple: suficiente para voz y sin dependencias.
export function remuestrearLineal(muestras: Float32Array, hzOrigen: number, hzDestino: number = HZ_DESTINO): Float32Array {
  if (hzOrigen <= 0 || hzDestino <= 0) throw new Error('Frecuencia de muestreo inválida.');
  if (hzOrigen === hzDestino) return new Float32Array(muestras);
  const largo = Math.floor((muestras.length * hzDestino) / hzOrigen);
  const salida = new Float32Array(largo);
  for (let i = 0; i < largo; i++) {
    const posicion = (i * hzOrigen) / hzDestino;
    const base = Math.floor(posicion);
    const resto = posicion - base;
    const a = muestras[base] ?? 0;
    const b = muestras[Math.min(base + 1, muestras.length - 1)] ?? a;
    salida[i] = a + (b - a) * resto;
  }
  return salida;
}

function escribirTexto(vista: DataView, offset: number, texto: string) {
  for (let i = 0; i < texto.length; i++) vista.setUint8(offset + i, texto.charCodeAt(i));
}

// Codifica muestras (a hzOrigen) como bytes WAV PCM mono de 16 bits a 16 kHz.
export function codificarWavBytes(muestras: Float32Array, hzOrigen: number): Uint8Array {
  const remuestreadas = remuestrearLineal(muestras, hzOrigen, HZ_DESTINO);
  const bytesDatos = remuestreadas.length * 2;
  const bytes = new Uint8Array(44 + bytesDatos);
  const vista = new DataView(bytes.buffer);
  escribirTexto(vista, 0, 'RIFF');
  vista.setUint32(4, 36 + bytesDatos, true);
  escribirTexto(vista, 8, 'WAVE');
  escribirTexto(vista, 12, 'fmt ');
  vista.setUint32(16, 16, true);
  vista.setUint16(20, 1, true); // PCM
  vista.setUint16(22, 1, true); // mono
  vista.setUint32(24, HZ_DESTINO, true);
  vista.setUint32(28, HZ_DESTINO * 2, true);
  vista.setUint16(32, 2, true);
  vista.setUint16(34, 16, true);
  escribirTexto(vista, 36, 'data');
  vista.setUint32(40, bytesDatos, true);
  for (let i = 0; i < remuestreadas.length; i++) {
    const limitada = Math.max(-1, Math.min(1, remuestreadas[i]));
    vista.setInt16(44 + i * 2, limitada < 0 ? limitada * 0x8000 : limitada * 0x7fff, true);
  }
  return bytes;
}

export function codificarWavMono16k(muestras: Float32Array, hzOrigen: number = HZ_DESTINO): Blob {
  const bytes = codificarWavBytes(muestras, hzOrigen);
  // Copia a un ArrayBuffer propio: Blob no acepta vistas sobre búferes compartidos en tipos estrictos.
  const copia = new Uint8Array(bytes.length);
  copia.set(bytes);
  return new Blob([copia.buffer], { type: 'audio/wav' });
}

export function duracionSegundos(muestras: Float32Array, hzOrigen: number): number {
  return hzOrigen > 0 ? muestras.length / hzOrigen : 0;
}

export function tamanoEstimadoWav(muestrasDestino: number): number {
  return 44 + muestrasDestino * 2;
}

export function formatoTiempo(totalSegundos: number): string {
  const s = Math.max(0, Math.floor(totalSegundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function formatoBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
