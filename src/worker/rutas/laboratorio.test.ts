// Laboratorio y voz con Meta simulada y D1 falsa, al estilo de agente.test.ts.
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../index';
import type { Bindings } from '../env';
import { d1Falsa } from '../gasto/d1-falsa';
import { MODELOS_POR_OMISION } from '../../config/models';
import { ejecutarSimulacion } from '../laboratorio/simular';
import { asegurarTablasLab, asignarAgenteSiVacio, crearLab, gastoLabSesion, leerGrabado, leerLab, limpiarAgenteSiEs, reclamarEntrevistaLab, type FilaLab } from '../laboratorio/almacenLab';
import { CASOS_PREPARADOS } from '../../nucleo/laboratorio/casos';
import { validarCaso } from '../../nucleo/laboratorio/validar';
import type { CasoCrudo, ParametrosLaboratorio } from '../../nucleo/laboratorio/tipos';

const env = (extra: Partial<Bindings> = {}): Bindings => ({
  DB: d1Falsa(), META_API_KEY: 'llave-de-prueba', META_API_BASE_URL: 'https://meta.prueba/v1',
  MODEL_AGENT: MODELOS_POR_OMISION.agente, MODEL_AGENT_CONTRIBUTOR: MODELOS_POR_OMISION.contributor,
  MODEL_TRANSCRIBE: MODELOS_POR_OMISION.transcripcion, DEMO_MODE: 'false', TOPE_SESION_USD: '5', TOPE_GLOBAL_USD: '50', ...extra,
});

const PARAMS: ParametrosLaboratorio = { giro: 'taller de muebles', tamano: 'pequena', sintoma: 'los muebles llegan tarde a los clientes', distractores: 1, documentoClave: false };

const CASO_GENERADO = {
  empresa: { nombre: 'Muebles Prisma', descripcion: 'Taller ficticio de muebles. Desde hace meses los muebles llegan tarde.' },
  objetivo: 'Entender por qué los muebles llegan tarde a los clientes desde hace meses.',
  personas: [
    { rol: 'Jefa de taller', presentacion: 'Coordina la producción.' },
    { rol: 'Encargada de compras', presentacion: 'Compra los materiales.' },
  ],
  documentos: [],
  causa: { enunciado: 'El proveedor de herraje nuevo tarda nueve días.', mecanismo: 'El herraje nuevo llega en nueve días y detiene los cierres.', marcadores: ['proveedor de herraje nuevo', 'tarda nueve dias', 'detiene los cierres'], duenos: ['Jefa de taller', 'Encargada de compras'] },
  distractores: [{ enunciado: 'El personal trabaja lento', porQueEngana: 'Es lo que se dice en el taller.' }],
  hechos: [
    { tipo: 'sintoma', texto: 'Cada semana veo muebles detenidos esperando piezas.', dueno: 'Jefa de taller', revelacion: 'siempre', distractor: null, terminos: ['muebles detenidos', 'esperando piezas'] },
    { tipo: 'causa', texto: 'El proveedor de herraje nuevo tarda nueve dias y eso detiene los cierres de los closets.', dueno: 'Jefa de taller', revelacion: 'incidente', distractor: null, terminos: ['proveedor de herraje nuevo', 'tarda nueve dias'] },
    { tipo: 'sintoma', texto: 'Yo pido materiales y las entregas a clientes se mueven de fecha.', dueno: 'Encargada de compras', revelacion: 'siempre', distractor: null, terminos: ['compras de materiales', 'fechas movidas'] },
    { tipo: 'causa', texto: 'Confirmé que el proveedor de herraje nuevo tarda nueve dias desde febrero.', dueno: 'Encargada de compras', revelacion: 'cuantitativa', distractor: null, terminos: ['herraje nuevo confirmado', 'desde febrero'] },
    { tipo: 'distractor', texto: 'Algunos dicen que el personal trabaja lento por las tardes.', dueno: 'Encargada de compras', revelacion: 'siempre', distractor: 'El personal trabaja lento', terminos: ['personal lento', 'por las tardes'] },
  ],
};

type Cuerpo = { messages: { content: string }[]; response_format?: { json_schema: { name: string } } };
const responder = (datos: unknown) => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(datos) } }], usage: { prompt_tokens: 800, completion_tokens: 200 } }), { status: 200 });

function metaSimulada(opciones: { caso?: unknown; respuestaPersona?: string; asr?: (url: string) => Response } = {}) {
  const cuerpos: Cuerpo[] = [];
  const f = vi.fn(async (url: string, init: RequestInit) => {
    if (String(url).includes('/asr/transcribe')) return opciones.asr ? opciones.asr(String(url)) : new Response(JSON.stringify({ turns: [{ speaker: 'SPEAKER_00', startMs: 0, endMs: 500, transcript: 'hola, cuénteme' }, { speaker: 'SPEAKER_01', startMs: 500, endMs: 1000, transcript: 'los muebles llegan tarde' }] }), { status: 200 });
    const cuerpo = JSON.parse(String(init.body)) as Cuerpo;
    cuerpos.push(cuerpo);
    const nombre = cuerpo.response_format?.json_schema.name;
    if (nombre === 'caso_laboratorio') return responder(opciones.caso ?? CASO_GENERADO);
    if (nombre === 'respuesta_simulada') return responder({ respuesta: opciones.respuestaPersona ?? 'Eso es lo que veo en mi trabajo todos los días, de primera mano.' });
    throw new Error(`Esquema inesperado: ${nombre}`);
  });
  vi.stubGlobal('fetch', f);
  return { f, cuerpos };
}
afterEach(() => vi.unstubAllGlobals());

const post = (ruta: string, e: Bindings, cookie = '', cuerpo?: unknown) => app.request(ruta, { method: 'POST', headers: { 'content-type': 'application/json', cookie, 'cf-connecting-ip': '203.0.113.20' }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) }, e);
async function crear(e: Bindings, cuerpo: unknown = PARAMS) {
  // La D1 falsa no aplica la migración 0007: las tablas se aseguran aquí, en la prueba.
  await asegurarTablasLab(e.DB);
  const r = await post('/api/laboratorio', e, '', cuerpo);
  return { r, cookie: r.headers.get('set-cookie')!.split(';')[0], json: await r.json() as any };
}
function wav(segundos = 1, canales = 1, hz = 16000): Uint8Array {
  const datos = Math.floor(segundos * hz) * canales * 2;
  const b = new Uint8Array(44 + datos);
  const v = new DataView(b.buffer);
  const ascii = (o: number, s: string) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
  ascii(0, 'RIFF'); v.setUint32(4, 36 + datos, true); ascii(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, canales, true); v.setUint32(24, hz, true); v.setUint32(28, hz * canales * 2, true); v.setUint16(32, canales * 2, true); v.setUint16(34, 16, true); ascii(36, 'data'); v.setUint32(40, datos, true);
  return b;
}
const subirAudio = (e: Bindings, bytes: Uint8Array, cookie = '') => {
  const form = new FormData();
  form.append('audio', new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: 'audio/wav' }), 'audio.wav');
  return app.request('/api/voz/transcribir', { method: 'POST', headers: { cookie, 'cf-connecting-ip': '203.0.113.21' }, body: form }, e);
};

describe('laboratorio', () => {
  it('genera y guarda un caso; el GET público no contiene ningún marcador de la causa', async () => {
    metaSimulada();
    const e = env();
    const { r, cookie, json } = await crear(e);
    expect(r.status).toBe(200);
    expect(json.caso.empresa.nombre).toBe('Muebles Prisma');
    const get = await app.request(`/api/laboratorio/${json.id}`, { headers: { cookie } }, e);
    const texto = JSON.stringify(await get.json());
    for (const m of ['proveedor de herraje nuevo', 'tarda nueve dias', 'detiene los cierres']) expect(texto.toLowerCase()).not.toContain(m);
  });

  it('un hecho de causa en persona no designada reintenta y, si persiste, devuelve 422 sin guardar', async () => {
    const malo = structuredClone(CASO_GENERADO) as any;
    malo.causa.duenos = ['Encargada de compras'];
    const { f } = metaSimulada({ caso: malo });
    const e = env();
    const { r } = await crear(e);
    expect(r.status).toBe(422);
    expect(f.mock.calls.filter((c) => !String(c[0]).includes('/asr/')).length).toBe(2);
  });

  it('entrevista con aislamiento: el prompt de apertura no contiene hechos de causa ajenos', async () => {
    const { cuerpos } = metaSimulada();
    const e = env();
    const { cookie, json } = await crear(e);
    const r = await post(`/api/laboratorio/${json.id}/entrevistar`, e, cookie);
    expect(r.status).toBe(200);
    const vista = await r.json() as any;
    expect(vista.intercambios.length).toBeGreaterThan(0);
    const apertura = cuerpos.map((c) => c.messages.map((m) => m.content).join('\n')).find((t) => t.includes('Para empezar'))!;
    expect(apertura.toLowerCase()).not.toContain('proveedor de herraje nuevo');
    expect(vista.intercambios[0].hechosRevelados).toBeTypeOf('number'); // en público solo el conteo
  });

  it('una respuesta que fuga un hecho no autorizado se reintenta y termina en respaldo con fuga:true', async () => {
    metaSimulada({ respuestaPersona: 'El proveedor de herraje nuevo tarda nueve dias y detiene los cierres.' });
    const e = env();
    const preparado = CASOS_PREPARADOS[1];
    const crudoOk = validarCaso({
      id: 'x', empresa: preparado.caso.empresa, objetivo: preparado.caso.objetivo,
      personas: preparado.caso.personas.map((p) => ({ rol: p.rol, presentacion: p.presentacion })), documentos: [],
      causa: { ...preparado.verdad.causa, duenos: preparado.verdad.duenosCausa.map((d) => preparado.caso.personas.find((p) => p.id === d)?.rol ?? d) },
      distractores: preparado.verdad.distractores.map((d) => ({ enunciado: d.enunciado, porQueEngana: d.porQueEngana })),
      hechos: preparado.verdad.hechos.filter((h) => !h.dueno.startsWith('D')).map((h) => ({ tipo: h.tipo, texto: h.texto, dueno: preparado.caso.personas.find((p) => p.id === h.dueno)?.rol ?? h.dueno, revelacion: h.revelacion, distractor: h.distractor ? preparado.verdad.distractores.find((d) => d.id === h.distractor)?.enunciado ?? null : null, terminos: h.terminos })),
    } as CasoCrudo, preparado.caso.parametros);
    expect('errores' in crudoOk).toBe(false);
    if ('errores' in crudoOk) return;
    // Se ejerce simular directamente con la verdad de la tienda y una respuesta que fuga.
    const r = await ejecutarSimulacion({ env: e, db: e.DB }, 'sesion-prueba', crudoOk.caso, crudoOk.verdad);
    // generarCaso ya validó la fixture generada, no esta simulación.
    expect(r.intercambios.some((x) => x.fuga)).toBe(false); // la respuesta de CASO_GENERADO no se usa aquí
    const { cookie, json } = await crear(e);
    const ent = await post(`/api/laboratorio/${json.id}/entrevistar`, e, cookie);
    const vista = await ent.json() as any;
    expect(vista.intercambios.some((x: any) => x.fuga)).toBe(true);
    // Solo las respuestas sustituidas por fuga deben estar limpias: en las rondas
    // autorizadas (incidente/cuantitativa) el hecho de causa sí puede aparecer.
    const sustituidas = vista.intercambios.filter((x: any) => x.fuga);
    expect(sustituidas.length).toBeGreaterThan(0);
    expect(sustituidas.every((x: any) => !x.respuesta.toLowerCase().includes('detiene los cierres'))).toBe(true);
  });

  it('un caso preparado entrevista sin llamar a Meta y crea el agente; revelar sin forzar tras listo no expone antes de tiempo', async () => {
    const { f } = metaSimulada();
    const e = env();
    const { cookie, json } = await crear(e, { preparado: 'lab-tienda-linea' });
    expect(json.caso.id).toBe('lab-tienda-linea');
    const ent = await post(`/api/laboratorio/${json.id}/entrevistar`, e, cookie);
    expect(ent.status).toBe(200);
    expect(f.mock.calls.length).toBe(0);
    const ini = await post(`/api/laboratorio/${json.id}/iniciar-agente`, e, cookie);
    expect(ini.status).toBe(200);
    const agenteId = (await ini.json() as any).agenteId as string;
    const rev = await post(`/api/laboratorio/${json.id}/revelar`, e, cookie, {});
    expect(rev.status).toBe(409);
    const forzado = await post(`/api/laboratorio/${json.id}/revelar`, e, cookie, { forzar: true });
    expect(forzado.status).toBe(200);
    const revJson = await forzado.json() as any;
    expect(revJson.causaOculta.enunciado).toContain('Costura Loma');
    expect(revJson.comparacion).toBeTruthy();
    const getAgente = await app.request(`/api/agente/${agenteId}`, { headers: { cookie } }, e);
    expect(getAgente.status).toBe(200);
  });

  it('al llegar al tope responde una corrida grabada sin llamar a Meta', async () => {
    const { f } = metaSimulada();
    const e = env({ TOPE_SESION_USD: '0', TOPE_GLOBAL_USD: '0' });
    const { r, json } = await crear(e);
    expect(r.status).toBe(200);
    expect(json.modo).toBe('grabado');
    expect(json.aviso).toContain('corrida grabada');
    expect(f.mock.calls.length).toBe(0);
  });
});

describe('correcciones de la revisión de F6', () => {
  it('ninguna ruta pública filtra la causa: preparado sin esClave, marcadores ni verdad', async () => {
    metaSimulada();
    const e = env();
    const { r, cookie, json } = await crear(e, { preparado: 'lab-clinica-dental' });
    expect(r.status).toBe(200);
    const texto = JSON.stringify(json);
    expect(texto).not.toContain('esClave');
    expect(texto).not.toContain('Avisamed');
    expect(texto).not.toContain('teléfono viejo');
    const get = await app.request(`/api/laboratorio/${json.id}`, { headers: { cookie } }, e);
    expect(JSON.stringify(await get.json())).not.toContain('esClave');
  });

  it('la corrida grabada de respaldo no trae la causa de referencia ni esClave', async () => {
    metaSimulada();
    const e = env({ TOPE_SESION_USD: '0', TOPE_GLOBAL_USD: '0' });
    const { json } = await crear(e);
    const texto = JSON.stringify(json);
    expect(json.modo).toBe('grabado');
    expect(texto).not.toContain('Avisamed');
    expect(texto).not.toContain('esClave');
  });

  it('una segunda entrevista sobre el mismo laboratorio recibe 409 y no sobrescribe', async () => {
    metaSimulada();
    const e = env();
    const { cookie, json } = await crear(e, { preparado: 'lab-tienda-linea' });
    const primera = await post(`/api/laboratorio/${json.id}/entrevistar`, e, cookie);
    expect(primera.status).toBe(200);
    const segunda = await post(`/api/laboratorio/${json.id}/entrevistar`, e, cookie);
    expect(segunda.status).toBe(409);
  });

  it('iniciar-agente dos veces devuelve el mismo agente', async () => {
    metaSimulada();
    const e = env();
    const { cookie, json } = await crear(e, { preparado: 'lab-tienda-linea' });
    await post(`/api/laboratorio/${json.id}/entrevistar`, e, cookie);
    const a = await (await post(`/api/laboratorio/${json.id}/iniciar-agente`, e, cookie)).json() as any;
    const b = await (await post(`/api/laboratorio/${json.id}/iniciar-agente`, e, cookie)).json() as any;
    expect(a.agenteId).toBeTruthy();
    expect(b.agenteId).toBe(a.agenteId);
  });

  it('si el gasto no se puede comprobar, falla cerrada en vez de valer cero', async () => {
    const dbRota = { prepare() { throw new Error('sin tabla'); } } as unknown as D1Database;
    await expect(gastoLabSesion(dbRota, 's1')).rejects.toThrow('sin tabla');
  });

  it('leerGrabado devuelve la grabación más reciente', async () => {
    const e = env();
    await asegurarTablasLab(e.DB);
    await e.DB.prepare('INSERT INTO laboratorios_grabados (id, contenido, creado_en) VALUES (?1, ?2, ?3)').bind('g1', JSON.stringify({ marca: 'vieja' }), '2026-01-01T00:00:00Z').run();
    await e.DB.prepare('INSERT INTO laboratorios_grabados (id, contenido, creado_en) VALUES (?1, ?2, ?3)').bind('g2', JSON.stringify({ marca: 'nueva' }), '2026-02-01T00:00:00Z').run();
    expect(await leerGrabado(e.DB)).toEqual({ marca: 'nueva' });
  });

  it('un Content-Length enorme se rechaza con 413 sin leer el cuerpo ni llamar al ASR', async () => {
    const { f } = metaSimulada();
    const e = env();
    const r = await app.request('/api/voz/transcribir', {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=x', 'content-length': String(40 * 1024 * 1024), 'cf-connecting-ip': '203.0.113.30' },
      body: '--x--',
    }, e);
    expect(r.status).toBe(413);
    expect(f.mock.calls.length).toBe(0);
  });
});

describe('correcciones de rutas del Laboratorio', () => {
  it('revelar con un cuerpo inválido {"forzar": 1} no revela un laboratorio recién generado', async () => {
    metaSimulada();
    const e = env();
    const { cookie, json } = await crear(e, { preparado: 'lab-tienda-linea' });
    expect(json.estado).toBe('generado');
    const r = await post(`/api/laboratorio/${json.id}/revelar`, e, cookie, { forzar: 1 });
    expect(r.status).toBe(409);
    const texto = JSON.stringify(await r.json());
    expect(texto).not.toContain('causaOculta');
    expect(texto).not.toContain('Costura Loma');
    const get = await app.request(`/api/laboratorio/${json.id}`, { headers: { cookie } }, e);
    expect((await get.json() as any).estado).toBe('generado');
  });

  it('revelar sin agente en estado entrevistando responde 409 aunque venga forzar', async () => {
    metaSimulada();
    const e = env();
    const { cookie, json } = await crear(e, { preparado: 'lab-tienda-linea' });
    const sesion = (await leerLab(e.DB, json.id, (await leerSesionDe(e, cookie)) ?? ''))?.sesion;
    expect(sesion).toBeTruthy();
    expect(await reclamarEntrevistaLab(e.DB, json.id, sesion!)).toBe(true);
    const r = await post(`/api/laboratorio/${json.id}/revelar`, e, cookie, { forzar: true });
    expect(r.status).toBe(409);
    expect(JSON.stringify(await r.json())).not.toContain('Costura Loma');
  });

  it('limpiarAgenteSiEs solo limpia si el hueco sigue siendo el id reclamado', async () => {
    const e = env();
    await asegurarTablasLab(e.DB);
    const fila: FilaLab = { id: '11111111-1111-4111-8111-111111111111', sesion: 's-limpieza', agenteId: null, estado: 'listo', modo: 'en_vivo', caso: CASOS_PREPARADOS[0].caso, verdad: CASOS_PREPARADOS[0].verdad, fuentes: CASOS_PREPARADOS[0].fuentes, intercambios: [], gastoLabUsd: 0 };
    await crearLab(e.DB, fila);
    expect(await asignarAgenteSiVacio(e.DB, fila.id, fila.sesion, 'agente-nuevo')).toBe(true);
    expect(await limpiarAgenteSiEs(e.DB, fila.id, fila.sesion, 'agente-ajeno')).toBe(false);
    expect((await leerLab(e.DB, fila.id, fila.sesion))?.agenteId).toBe('agente-nuevo');
    // Otro cambio concurrente no debe pisarse: solo se limpia el id propio.
    expect(await limpiarAgenteSiEs(e.DB, fila.id, fila.sesion, 'agente-nuevo')).toBe(true);
    expect((await leerLab(e.DB, fila.id, fila.sesion))?.agenteId).toBeNull();
  });
});

// La sesión real viaja en la cookie firmada; para tocar D1 en la prueba se
// recupera leyendo la fila recién creada por su id con cualquier sesión no:
// en su lugar se busca la sesión recorriendo la fila vía la propia ruta no
// es posible, así que se extrae de la cookie no firmada no aplica; se usa el
// reclamo con la sesión obtenida del almacén mediante una lectura directa.
async function leerSesionDe(e: Bindings, _cookie: string): Promise<string | null> {
  const f = await e.DB.prepare('SELECT sesion FROM laboratorios LIMIT 1').first<{ sesion: string }>().catch(() => null);
  return f?.sesion ?? null;
}

describe('voz', () => {
  it('transcribe un WAV válido, mapea hablantes y cobra duración × 0,18/h', async () => {
    metaSimulada();
    const e = env();
    const r = await subirAudio(e, wav(1));
    expect(r.status).toBe(200);
    const j = await r.json() as any;
    expect(j.texto).toContain('Hablante 1:');
    expect(j.texto).toContain('Hablante 2:');
    expect(j.costoUsd).toBeCloseTo(0.18 / 3600, 8);
    expect(j.duracionS).toBeCloseTo(1, 3);
  });

  it('un WAV estéreo se rechaza sin llamar al ASR', async () => {
    const { f } = metaSimulada();
    const r = await subirAudio(env(), wav(1, 2));
    expect(r.status).toBe(400);
    expect(f.mock.calls.length).toBe(0);
  });

  it('si el ASR responde error HTTP, devuelve 502 visible y no reintenta solo', async () => {
    const { f } = metaSimulada({ asr: () => new Response('falla', { status: 500 }) });
    const r = await subirAudio(env(), wav(1));
    expect(r.status).toBe(502);
    expect(f.mock.calls.filter((c) => String(c[0]).includes('/asr/')).length).toBe(1);
  });
});
