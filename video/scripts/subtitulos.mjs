// Tiempos de palabra de la narración con whisper.cpp local → src/subtitulos.json (tipo Caption de Remotion).
//   node scripts/subtitulos.mjs
import { installWhisperCpp, downloadWhisperModel, transcribe, toCaptions } from '@remotion/install-whisper-cpp';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const to = resolve('whisper.cpp');
await installWhisperCpp({ to, version: '1.5.5' });
await downloadWhisperModel({ model: 'small.en', folder: to });
const salida = await transcribe({
  inputPath: resolve('.tomas-tmp/narracion-16k.wav'),
  whisperPath: to,
  whisperCppVersion: '1.5.5',
  model: 'small.en',
  tokenLevelTimestamps: true,
});
const { captions } = toCaptions({ whisperCppOutput: salida });
writeFileSync('src/subtitulos.json', JSON.stringify(captions, null, 2));
console.log(captions.length, 'palabras; última termina en', captions.at(-1).endMs / 1000, 's');
