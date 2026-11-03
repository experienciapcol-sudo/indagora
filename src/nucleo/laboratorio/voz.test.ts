import { describe, expect, it } from 'vitest';
import { leerCabeceraWav, textoDeSegmentos } from './voz';

function wav(muestraHz = 16000, canales = 1, segundos = 2, bits = 16): Uint8Array {
  const bytesDatos = muestraHz * canales * (bits / 8) * segundos;
  const b = new Uint8Array(44 + bytesDatos);
  const dv = new DataView(b.buffer);
  const ascii = (o: number, s: string) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
  ascii(0, 'RIFF'); dv.setUint32(4, 36 + bytesDatos, true); ascii(8, 'WAVE');
  ascii(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, canales, true); dv.setUint32(24, muestraHz, true);
  dv.setUint32(28, muestraHz * canales * (bits / 8), true); dv.setUint16(32, canales * (bits / 8), true);
  dv.setUint16(34, bits, true); ascii(36, 'data'); dv.setUint32(40, bytesDatos, true);
  return b;
}

describe('voz', () => {
  it('WAV 16 kHz mono 16 bits → duración exacta', () => {
    const info = leerCabeceraWav(wav());
    expect(info.valida).toBe(true);
    expect(info.duracionS).toBe(2);
    expect(info).toMatchObject({ canales: 1, muestraHz: 16000, bits: 16 });
  });
  it('estéreo y 44.1 kHz → motivos correctos', () => {
    expect(leerCabeceraWav(wav(16000, 2)).motivo).toContain('mono');
    expect(leerCabeceraWav(wav(44100, 1)).motivo).toContain('16 o 24 kHz');
  });
  it('un chunk data que declara menos bytes de los que trae no abarata la duración', () => {
    const b = wav(16000, 1, 10);
    new DataView(b.buffer).setUint32(40, 2, true);
    expect(leerCabeceraWav(b).duracionS).toBe(10);
  });
  it('lo que no es WAV se rechaza', () => {
    expect(leerCabeceraWav(new Uint8Array([1, 2, 3])).motivo).toContain('no es un WAV');
  });
  it('segmentos con tres hablantes → Hablante 1 a 3 en orden de aparición', () => {
    const texto = textoDeSegmentos([
      { hablante: 'SPEAKER_01', inicioS: 0, finS: 1, texto: 'segundo en hablar' },
      { hablante: 'SPEAKER_00', inicioS: 1, finS: 2, texto: 'primero etiquetado' },
      { hablante: 'SPEAKER_02', inicioS: 2, finS: 3, texto: 'tercero' },
      { hablante: 'SPEAKER_01', inicioS: 3, finS: 4, texto: 'otra vez' },
    ]);
    expect(texto.split('\n').map((l) => l.split(':')[0])).toEqual(['Hablante 1', 'Hablante 2', 'Hablante 3', 'Hablante 1']);
  });
});
