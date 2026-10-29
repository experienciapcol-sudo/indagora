// Smoke test de la Meta Model API para Indagora (fase F1).
//
// Uso:  node scripts/smoke.mjs [prueba ...]    sin argumentos corre todas.
// Pruebas: estado modelos latencia enum enum4x300 streaming background cache transcripcion contributor
//
// Lee la llave de .dev.vars y los nombres de modelo de las variables de entorno
// (.env.example da los valores por omisión). Solo envía datos ficticios.
// Lleva la cuenta del gasto con el `usage` que devuelve la API y se detiene al pasar
// SMOKE_TOPE_USD (3 USD por omisión). Los resultados quedan en interno/smoke/.

import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const CARPETA_SALIDA = join(RAIZ, 'interno', 'smoke');

// ---------- Configuración ----------

function leerVars(ruta) {
  if (!existsSync(ruta)) return {};
  const vars = {};
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[2] !== '') vars[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return vars;
}

const CLAVES_ENV = ['META_API_KEY', 'META_API_BASE_URL', 'MODEL_AGENT', 'MODEL_AGENT_CONTRIBUTOR', 'MODEL_TRANSCRIBE', 'SMOKE_TOPE_USD'];
const env = { ...leerVars(join(RAIZ, '.env.example')), ...leerVars(join(RAIZ, '.dev.vars')) };
for (const clave of CLAVES_ENV) if (process.env[clave]) env[clave] = process.env[clave];

const BASE = (env.META_API_BASE_URL ?? '').replace(/\/$/, '');
const LLAVE = env.META_API_KEY;
const MODELO = { agente: env.MODEL_AGENT, contributor: env.MODEL_AGENT_CONTRIBUTOR, transcripcion: env.MODEL_TRANSCRIBE };

// Precios por millón de tokens (docs de precios, 28 oct 2026) y por hora de audio.
const PRECIO_MTOK = {
  agente: { entrada: 1.25, cache: 0.15, salida: 4.25 },
  contributor: { entrada: 0.1, cache: 0.002, salida: 0.2 },
};
const PRECIO_HORA_AUDIO = 0.18;
const TOPE_USD = Number(env.SMOKE_TOPE_USD ?? 3);
const MAX_TOKENS = 16000;

// ---------- Gasto ----------

class TopeAlcanzado extends Error {}
let gastoUsd = 0;

function costoTokens(rol, entrada, cache, salida) {
  const p = PRECIO_MTOK[rol];
  return ((entrada - cache) * p.entrada + cache * p.cache + salida * p.salida) / 1e6;
}

// Suma el costo de una llamada. Un conteo de tokens ausente o no numérico detiene todo:
// si el gasto se volviera NaN, el tope dejaría de funcionar.
function registrarCosto(rol, entrada, cache, salida) {
  const costo = costoTokens(rol, entrada, cache ?? 0, salida);
  if (!Number.isFinite(costo)) throw new TopeAlcanzado(`Uso no numérico en la respuesta (entrada=${entrada}, salida=${salida}); se detiene por seguridad`);
  gastoUsd += costo;
  return costo;
}

function revisarTope() {
  // Escrito como !(a < b) para que un NaN también detenga.
  if (!(gastoUsd < TOPE_USD)) throw new TopeAlcanzado(`Tope de ${TOPE_USD} USD alcanzado (gastado ${gastoUsd.toFixed(4)})`);
}

// ---------- HTTP ----------

function encabezados(json) {
  return { Authorization: `Bearer ${LLAVE}`, ...(json ? { 'Content-Type': 'application/json' } : {}) };
}

async function llamar(ruta, { metodo = 'POST', cuerpo, formulario } = {}) {
  revisarTope();
  const inicio = performance.now();
  const res = await fetch(BASE + ruta, {
    method: metodo,
    headers: encabezados(cuerpo !== undefined),
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : formulario,
  });
  const texto = await res.text();
  const ms = Math.round(performance.now() - inicio);
  let json = null;
  try { json = JSON.parse(texto); } catch { /* respuesta no JSON */ }
  const error = res.ok ? null : (json?.error?.message ?? texto.slice(0, 400));
  return { status: res.status, ok: res.ok, ms, json, error };
}

function usoChat(rol, u) {
  if (!u) return { uso: null, costo: 0 };
  const uso = { entrada: u.prompt_tokens, cache: u.prompt_tokens_details?.cached_tokens ?? 0, salida: u.completion_tokens, razonamiento: u.completion_tokens_details?.reasoning_tokens ?? null };
  return { uso, costo: registrarCosto(rol, uso.entrada, uso.cache, uso.salida) };
}

// Lo mismo para la Responses API, que nombra distinto los campos de uso.
function usoResponses(rol, u) {
  if (!u) return { uso: null, costo: 0 };
  const uso = { entrada: u.input_tokens, cache: u.input_tokens_details?.cached_tokens ?? 0, salida: u.output_tokens, razonamiento: u.output_tokens_details?.reasoning_tokens ?? null };
  return { uso, costo: registrarCosto(rol, uso.entrada, uso.cache, uso.salida) };
}

function formatoEsquema(esquema) {
  return { type: 'json_schema', json_schema: { name: 'salida', strict: true, schema: esquema } };
}

async function chat({ rol = 'agente', esfuerzo, mensajes, esquema, extra = {} }) {
  const cuerpo = { model: MODELO[rol], reasoning_effort: esfuerzo, messages: mensajes, max_tokens: MAX_TOKENS, ...extra };
  if (esquema) cuerpo.response_format = formatoEsquema(esquema);
  const r = await llamar('/chat/completions', { cuerpo });
  const eleccion = r.json?.choices?.[0];
  return {
    status: r.status, ms: r.ms, error: r.error,
    contenido: eleccion?.message?.content ?? null,
    finish: eleccion?.finish_reason ?? null,
    ...usoChat(rol, r.json?.usage),
  };
}

// Chat Completions con stream: mide el tiempo al primer token visible.
async function chatStream({ rol = 'agente', esfuerzo, mensajes, esquema }) {
  revisarTope();
  const cuerpo = {
    model: MODELO[rol], reasoning_effort: esfuerzo, messages: mensajes, max_tokens: MAX_TOKENS,
    stream: true, stream_options: { include_usage: true }, response_format: formatoEsquema(esquema),
  };
  const inicio = performance.now();
  const res = await fetch(BASE + '/chat/completions', { method: 'POST', headers: encabezados(true), body: JSON.stringify(cuerpo) });
  if (!res.ok) return { status: res.status, error: (await res.text()).slice(0, 400) };

  const decodificador = new TextDecoder();
  let pendiente = '', contenido = '', primerTokenMs = null, finish = null, usage = null, eventos = 0, lineasInvalidas = 0;
  const procesar = (linea) => {
    if (!linea.startsWith('data:')) return;
    const dato = linea.slice(5).trim();
    if (dato === '[DONE]') return;
    let evento;
    try { evento = JSON.parse(dato); } catch { lineasInvalidas++; return; }
    eventos++;
    if (evento.usage) usage = evento.usage;
    const eleccion = evento.choices?.[0];
    if (eleccion?.finish_reason) finish = eleccion.finish_reason;
    const delta = eleccion?.delta?.content;
    if (delta) {
      if (primerTokenMs === null) primerTokenMs = Math.round(performance.now() - inicio);
      contenido += delta;
    }
  };
  for await (const trozo of res.body) {
    pendiente += decodificador.decode(trozo, { stream: true });
    const lineas = pendiente.split('\n');
    pendiente = lineas.pop();
    lineas.forEach(procesar);
  }
  procesar(pendiente + decodificador.decode());
  return { status: res.status, ms: Math.round(performance.now() - inicio), primerTokenMs, eventos, lineasInvalidas, finish, contenido, ...usoChat(rol, usage) };
}

// ---------- Corpus ficticio ----------
// Panadería ficticia con pedidos tardíos. Tres oraciones clave sostienen la causa plantada
// (cambio de proveedor de cajas); dos opiniones sirven de distractor; el resto es relleno.

const CLAVES = [
  { texto: 'Desde marzo compramos las cajas de cartón a un proveedor nuevo porque el anterior cerró.', hablante: 'Gerente' },
  { texto: 'Las cajas del proveedor nuevo tardan ocho días en llegar; antes tardaban dos.', hablante: 'Encargada de producción' },
  { texto: 'Los pedidos de pan suelto, que no llevan caja, salen a tiempo todos los días.', hablante: 'Repartidor' },
];
const OPINIONES = [
  { texto: 'Yo creo que los repartidores se tardan porque platican mucho en la ruta.', hablante: 'Gerente' },
  { texto: 'La gente de la tarde no tiene ganas de trabajar.', hablante: 'Encargada de producción' },
];
const HABLANTES = ['Gerente', 'Encargada de producción', 'Repartidor'];
const SUJETOS = ['El panadero del primer turno', 'La encargada de caja', 'El ayudante de hornos', 'La supervisora de limpieza', 'El chofer de la ruta norte', 'La cajera de la tarde', 'El maestro pastelero', 'La auxiliar de almacén', 'El vigilante', 'La practicante'];
const VERBOS = ['revisa', 'limpia', 'prepara', 'registra', 'acomoda', 'calibra', 'cuenta', 'surte', 'anota', 'prueba'];
const OBJETOS = ['la amasadora', 'el horno dos', 'el inventario de harina', 'la báscula', 'la vitrina', 'las charolas', 'el refrigerador', 'la lista de precios', 'el tablero de turnos', 'la batidora'];
const DETALLES = ['antes de las seis', 'cada lunes', 'al cerrar', 'dos veces por semana', 'con la lista impresa', 'después del primer horneado', 'cuando hay fila', 'sin contratiempos', 'junto con el ayudante', 'por la tarde'];

function relleno(i) {
  return `${SUJETOS[i % 10]} ${VERBOS[Math.floor(i / 10) % 10]} ${OBJETOS[Math.floor(i / 100) % 10]} ${DETALLES[(i * 7) % 10]}.`;
}

export function crearTranscripcion(n) {
  const especiales = new Map([
    [Math.floor(n * 0.1), { ...OPINIONES[0], tipo: 'opinion' }],
    [Math.floor(n * 0.2), { ...CLAVES[0], tipo: 'clave' }],
    [Math.floor(n * 0.55), { ...CLAVES[1], tipo: 'clave' }],
    [Math.floor(n * 0.7), { ...OPINIONES[1], tipo: 'opinion' }],
    [Math.floor(n * 0.85), { ...CLAVES[2], tipo: 'clave' }],
  ]);
  const oraciones = [];
  for (let i = 0; i < n; i++) {
    const id = 's' + String(i + 1).padStart(3, '0');
    const turno = Math.floor(i / 6) + 1;
    const especial = especiales.get(i);
    oraciones.push(especial
      ? { id, turno, hablante: especial.hablante, texto: especial.texto, tipo: especial.tipo }
      : { id, turno, hablante: HABLANTES[(turno - 1) % 3], texto: relleno(i), tipo: 'relleno' });
  }
  return oraciones;
}

const SISTEMA = 'Eres un analista de diagnóstico organizacional. Lees entrevistas ficticias segmentadas en oraciones con identificador. '
  + 'Solo señalas oraciones por su identificador; nunca escribes citas. Distingues hechos específicos, cifras y opiniones.';

function mensajesAnalista(oraciones, prefijo = '') {
  const lineas = oraciones.map((o) => `[${o.id}] (${o.hablante}, turno ${o.turno}) ${o.texto}`).join('\n');
  return [
    { role: 'system', content: prefijo + SISTEMA },
    { role: 'user', content: 'Objetivo: entender por qué los pedidos para cafeterías de una panadería ficticia llegan tarde.\n\n'
      + `Entrevistas:\n${lineas}\n\nSeñala entre 3 y 8 oraciones relevantes para el objetivo, clasifícalas y propón la causa más probable.` },
  ];
}

export function esquemaAnalista(ids) {
  return {
    type: 'object', additionalProperties: false, required: ['hallazgos', 'causa_probable'],
    properties: {
      hallazgos: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false, required: ['oracion_id', 'tipo', 'resumen'],
          properties: {
            oracion_id: { type: 'string', enum: ids },
            tipo: { type: 'string', enum: ['hecho', 'cifra', 'opinion'] },
            resumen: { type: 'string' },
          },
        },
      },
      causa_probable: { type: 'string' },
    },
  };
}

// Revisa la salida del analista: ids reales, claves encontradas, opiniones bien rotuladas.
export function evaluarAnalista(contenido, oraciones) {
  let salida;
  try { salida = JSON.parse(contenido); } catch { return { jsonValido: false }; }
  if (typeof salida !== 'object' || salida === null) return { jsonValido: false };
  const porId = new Map(oraciones.map((o) => [o.id, o]));
  const hallazgos = salida.hallazgos ?? [];
  const elegidas = hallazgos.map((h) => porId.get(h.oracion_id)).filter(Boolean);
  const opinionesElegidas = hallazgos.filter((h) => porId.get(h.oracion_id)?.tipo === 'opinion');
  return {
    jsonValido: true,
    hallazgos: hallazgos.length,
    idsInvalidos: hallazgos.length - elegidas.length,
    clavesEncontradas: `${new Set(elegidas.filter((o) => o.tipo === 'clave').map((o) => o.id)).size}/3`,
    opinionesRotuladas: `${opinionesElegidas.filter((h) => h.tipo === 'opinion').length}/${opinionesElegidas.length}`,
    causa: salida.causa_probable,
  };
}

// ---------- Pruebas ----------

function resumenLlamada(r, oraciones) {
  return {
    status: r.status, ms: r.ms, finish: r.finish, uso: r.uso, costoUsd: +(r.costo ?? 0).toFixed(5), error: r.error ?? undefined,
    evaluacion: r.contenido && oraciones ? evaluarAnalista(r.contenido, oraciones) : undefined,
  };
}

function mediana(xs) {
  const v = [...xs].sort((a, b) => a - b);
  return v.length ? v[Math.floor((v.length - 1) / 2)] : null;
}

const PRUEBAS = {
  async estado() {
    const res = await fetch(BASE + '/status');
    return { status: res.status, cuerpo: (await res.text()).slice(0, 300) };
  },

  async modelos() {
    const r = await llamar('/models', { metodo: 'GET' });
    const ids = (r.json?.data ?? []).map((m) => m.id).sort();
    return {
      status: r.status, error: r.error ?? undefined, ids,
      voz: ids.filter((id) => /voice|tts|speech|audio|transcri|speak/i.test(id)),
      configurados: Object.fromEntries(Object.entries(MODELO).map(([rol, id]) => [rol, { id, existe: ids.includes(id) }])),
      detalle: r.json?.data,
    };
  },

  // `salida` llega desde principal() para conservar lo ya medido si el tope corta la prueba.
  async latencia(salida) {
    const oraciones = crearTranscripcion(120);
    const esquema = esquemaAnalista(oraciones.map((o) => o.id));
    for (const esfuerzo of ['minimal', 'low', 'medium']) {
      const llamadas = [];
      salida[esfuerzo] = { llamadas };
      for (let i = 0; i < 5; i++) {
        llamadas.push(resumenLlamada(await chat({ esfuerzo, mensajes: mensajesAnalista(oraciones), esquema }), oraciones));
      }
      const ok = llamadas.filter((l) => l.status === 200);
      salida[esfuerzo] = {
        medianaMs: mediana(ok.map((l) => l.ms)),
        minMs: Math.min(...ok.map((l) => l.ms)),
        maxMs: Math.max(...ok.map((l) => l.ms)),
        razonamientoMedio: Math.round(ok.reduce((s, l) => s + (l.uso?.razonamiento ?? 0), 0) / (ok.length || 1)),
        costoUsd: +ok.reduce((s, l) => s + l.costoUsd, 0).toFixed(5),
        llamadas,
      };
    }
    return salida;
  },

  async enum(salida) {
    for (const n of [400, 950]) {
      const oraciones = crearTranscripcion(n);
      const esquema = esquemaAnalista(oraciones.map((o) => o.id));
      const llamadas = [];
      salida[`enum_${n}`] = llamadas;
      for (let i = 0; i < 2; i++) {
        llamadas.push(resumenLlamada(await chat({ esfuerzo: 'low', mensajes: mensajesAnalista(oraciones), esquema }), oraciones));
      }
    }
    return salida;
  },

  // Cuatro propiedades con el mismo enum de 300: copiado en cada una y compartido con $ref.
  async enum4x300() {
    const oraciones = crearTranscripcion(300);
    const ids = oraciones.map((o) => o.id);
    const campos = ['causa', 'sintoma', 'opinion', 'cifra'];
    const variante = (propiedad, extra = {}) => ({
      type: 'object', additionalProperties: false, required: campos,
      properties: Object.fromEntries(campos.map((c) => [c, propiedad])), ...extra,
    });
    const mensajes = mensajesAnalista(oraciones);
    mensajes[1].content += '\nAdemás, para cada campo (causa, síntoma, opinión, cifra) señala la oración más representativa.';
    // Un 200 no prueba que el enum se haya respetado: se revisa que cada valor sea un id real.
    const conRevision = (r) => {
      let fuera = null;
      try { fuera = campos.filter((c) => !ids.includes(JSON.parse(r.contenido)[c])).length; } catch { /* sin JSON */ }
      return { ...resumenLlamada(r), valoresFueraDelEnum: fuera };
    };
    return {
      copiado: conRevision(await chat({ esfuerzo: 'low', mensajes, esquema: variante({ type: 'string', enum: ids }) })),
      compartido: conRevision(await chat({
        esfuerzo: 'low', mensajes,
        esquema: variante({ $ref: '#/$defs/oracion' }, { $defs: { oracion: { type: 'string', enum: ids } } }),
      })),
    };
  },

  async streaming() {
    const oraciones = crearTranscripcion(120);
    const r = await chatStream({ esfuerzo: 'low', mensajes: mensajesAnalista(oraciones), esquema: esquemaAnalista(oraciones.map((o) => o.id)) });
    return { ...resumenLlamada(r, oraciones), primerTokenMs: r.primerTokenMs, eventos: r.eventos, lineasInvalidas: r.lineasInvalidas };
  },

  // Responses API con background: true y salida estructurada en text.format.
  async background() {
    const oraciones = crearTranscripcion(120);
    const [sistema, usuario] = mensajesAnalista(oraciones);
    const inicio = performance.now();
    const alta = await llamar('/responses', {
      cuerpo: {
        model: MODELO.agente, reasoning: { effort: 'low' }, instructions: sistema.content, input: usuario.content,
        text: { format: { type: 'json_schema', name: 'salida', strict: true, schema: esquemaAnalista(oraciones.map((o) => o.id)) } },
        background: true, max_output_tokens: MAX_TOKENS,
      },
    });
    if (!alta.ok) return { status: alta.status, error: alta.error };
    const id = alta.json.id;
    const enCurso = (estado) => ['queued', 'in_progress'].includes(estado);
    let actual = alta.json, consultas = 0, errorConsulta = null;
    while (enCurso(actual.status) && performance.now() - inicio < 180000) {
      await new Promise((r) => setTimeout(r, 1000));
      const r = await fetch(`${BASE}/responses/${id}`, { headers: encabezados(false) });
      consultas++;
      // Un 404 breve es normal mientras el servidor guarda la respuesta (docs): se reintenta.
      if (r.status === 404) continue;
      if (!r.ok) { errorConsulta = `${r.status}: ${(await r.text()).slice(0, 200)}`; break; }
      actual = await r.json();
    }
    // Si se agotó el tiempo, se cancela para que no siga gastando fuera de la cuenta.
    if (enCurso(actual.status)) {
      const r = await fetch(`${BASE}/responses/${id}/cancel`, { method: 'POST', headers: encabezados(false) });
      if (r.ok) actual = await r.json();
    }
    const texto = (actual.output ?? []).filter((o) => o.type === 'message')
      .flatMap((o) => o.content ?? []).filter((c) => c.type === 'output_text').map((c) => c.text).join('');
    const { uso, costo } = usoResponses('agente', actual.usage);
    return {
      estadoInicial: alta.json.status, msAlta: alta.ms, estadoFinal: actual.status, msTotal: Math.round(performance.now() - inicio), consultas,
      uso, costoUsd: +costo.toFixed(5), error: actual.error ?? errorConsulta ?? undefined,
      evaluacion: texto ? evaluarAnalista(texto, oraciones) : undefined,
    };
  },

  // Dos llamadas con el mismo prefijo nuevo y prompt_cache_key: la segunda debería leer de caché.
  async cache() {
    const oraciones = crearTranscripcion(400);
    const prefijo = `Corrida ${Date.now()}. `;
    const esquema = esquemaAnalista(oraciones.map((o) => o.id));
    const llamada = async () => resumenLlamada(await chat({
      esfuerzo: 'minimal', mensajes: mensajesAnalista(oraciones, prefijo), esquema, extra: { prompt_cache_key: 'indagora-smoke' },
    }), oraciones);
    const primera = await llamada();
    const segunda = await llamada();
    return { primera, segunda };
  },

  async transcripcion() {
    const ruta = join(CARPETA_SALIDA, 'entrevista-ficticia.wav');
    if (!existsSync(ruta)) return { error: `Falta ${ruta}. Genéralo con scripts/audio-ficticio.ps1` };
    const formulario = new FormData();
    formulario.append('request', new Blob([JSON.stringify({
      mode: 'DIARIZATION', model: MODELO.transcripcion, audioEncoding: 'WAV', languageBias: ['Spanish'],
    })], { type: 'application/json' }));
    formulario.append('audio', new Blob([readFileSync(ruta)], { type: 'audio/wav' }), 'entrevista-ficticia.wav');
    const r = await llamar(`/asr/transcribe?sessionId=indagora-smoke-${Date.now()}`, { formulario });
    if (!r.ok) return { status: r.status, ms: r.ms, error: r.error };
    const segundos = Math.floor(Number(r.json.audioDurationMs) / 1000);
    const costo = (segundos / 3600) * PRECIO_HORA_AUDIO;
    if (!Number.isFinite(costo)) throw new TopeAlcanzado('La transcripción no informó la duración del audio; se detiene por seguridad');
    gastoUsd += costo;
    const turnos = r.json.turns ?? [];
    return {
      status: r.status, ms: r.ms, segundosAudio: segundos, costoUsd: +costo.toFixed(5),
      turnos: turnos.length, hablantes: [...new Set(turnos.map((t) => t.speaker))],
      detalle: turnos.map((t) => ({ hablante: t.speaker, inicioMs: t.startMs, finMs: t.endMs, texto: t.transcript })),
    };
  },

  // ¿El modo Contributor está disponible para esta cuenta? Una llamada mínima.
  async contributor() {
    const r = await chat({ rol: 'contributor', esfuerzo: 'minimal', mensajes: [{ role: 'user', content: 'Responde solo: ok' }] });
    return { modelo: MODELO.contributor, ...resumenLlamada(r), respuesta: r.contenido };
  },
};

// ---------- Principal ----------

async function principal() {
  if (!LLAVE) {
    console.error('Falta META_API_KEY en .dev.vars');
    process.exit(1);
  }
  if (!Number.isFinite(TOPE_USD) || TOPE_USD <= 0) {
    console.error(`SMOKE_TOPE_USD debe ser un número positivo (llegó "${env.SMOKE_TOPE_USD}")`);
    process.exit(1);
  }
  const pedidas = process.argv.slice(2);
  const desconocidas = pedidas.filter((p) => !PRUEBAS[p]);
  if (desconocidas.length) {
    console.error(`Pruebas desconocidas: ${desconocidas.join(', ')}. Disponibles: ${Object.keys(PRUEBAS).join(', ')}`);
    process.exit(1);
  }
  const resultados = { fecha: new Date().toISOString(), base: BASE, modelos: MODELO, topeUsd: TOPE_USD, pruebas: {} };
  for (const nombre of pedidas.length ? pedidas : Object.keys(PRUEBAS)) {
    const antes = gastoUsd;
    const salida = {};
    resultados.pruebas[nombre] = salida;
    process.stdout.write(`▶ ${nombre} ... `);
    try {
      Object.assign(salida, await PRUEBAS[nombre](salida));
      console.log(`listo (${(gastoUsd - antes).toFixed(4)} USD)`);
    } catch (e) {
      salida.excepcion = e.message;
      console.log(`falló: ${e.message}`);
      if (e instanceof TopeAlcanzado) break;
    }
  }
  resultados.gastoUsd = +gastoUsd.toFixed(5);
  mkdirSync(CARPETA_SALIDA, { recursive: true });
  const archivo = join(CARPETA_SALIDA, `resultados-${resultados.fecha.replace(/[:.]/g, '-')}.json`);
  writeFileSync(archivo, JSON.stringify(resultados, null, 2));
  console.log(`\nGasto de esta corrida: ${gastoUsd.toFixed(4)} USD. Resultados: ${archivo}`);
}

// Corre solo si se ejecuta directamente (no al importarlo desde las pruebas). Se compara la
// ruta real en vez de usar import.meta.main, que no existe antes de Node 24.2.
const esPrincipal = process.argv[1] && existsSync(process.argv[1])
  && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (esPrincipal) principal();
