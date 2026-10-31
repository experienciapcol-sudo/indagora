import { describe, expect, it } from 'vitest';
import { leerCabeceraWav } from '../../nucleo/laboratorio/voz';
import { codificarWavBytes, duracionSegundos, formatoTiempo, mezclarAMono, remuestrearLineal } from './wavCliente';

describe('conversión a WAV en el cliente', () => {
  it('produce un WAV mono de 16 bits a 16 kHz que el servidor acepta', () => {
    const muestras = new Float32Array(16000).fill(0.25);
    const info = leerCabeceraWav(codificarWavBytes(muestras, 16000));
    expect(info.valida).toBe(true);
    expect(info.canales).toBe(1);
    expect(info.bits).toBe(16);
    expect(info.muestraHz).toBe(16000);
    expect(info.duracionS).toBeCloseTo(1, 5);
  });

  it('remuestrea de 48 kHz a 16 kHz reduciendo las muestras a un tercio', () => {
    const salida = remuestrearLineal(new Float32Array(4800), 48000);
    expect(salida.length).toBe(1600);
    expect(duracionSegundos(salida, 16000)).toBeCloseTo(0.1, 5);
  });

  it('mezcla dos canales por promedio', () => {
    const mono = mezclarAMono([new Float32Array([1, -1]), new Float32Array([0.5, 0.5])]);
    expect([...mono]).toEqual([0.75, -0.25]);
  });

  it('limita las muestras fuera de rango sin romper la cabecera', () => {
    const bytes = codificarWavBytes(new Float32Array([2, -2, 0]), 16000);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('RIFF');
    expect(leerCabeceraWav(bytes).valida).toBe(true);
  });

  it('formatea el tiempo como m:ss', () => {
    expect(formatoTiempo(65)).toBe('1:05');
    expect(formatoTiempo(600)).toBe('10:00');
  });
});
