// Rutas del Laboratorio y de voz. La verdad nunca sale hasta revelar.
import { Hono } from 'hono';
import { z } from 'zod';
import { CASOS_PREPARADOS } from '../../nucleo/laboratorio/casos';
import { casoPublico } from '../../nucleo/laboratorio/casosPublicos';
import { causaPrincipalDelAgente, comparar } from '../../nucleo/laboratorio/comparar';
import { AVISO_GRABADO } from '../../nucleo/laboratorio/textos';
import type { CasoLaboratorio, DocumentoSimulado, ParametrosLaboratorio, PersonaSimulada } from '../../nucleo/laboratorio/tipos';
import { crearEstado, vistaDe } from '../../nucleo/agente/estado';
import { crearAgente, leerAgente } from '../agente/almacen';
import { leerTopes, resumen, TopeAlcanzado } from '../gasto/gasto';
import { dentroDelLimite } from '../gasto/limite';
import { ErrorMeta } from '../meta/cliente';
import { CasoInvalido, generarCaso } from '../laboratorio/generarCaso';
import { ejecutarSimulacion, SUBTOPE_LAB_USD } from '../laboratorio/simular';
import { ErrorTranscripcion, transcribirAudio } from '../laboratorio/transcribir';
import { asignarAgenteSiVacio, crearLab, gastoLabSesion, guardarLab, leerGrabado, leerLab, limpiarAgenteSiEs, reclamarEntrevistaLab, type FilaLab } from '../laboratorio/almacenLab';
import { ipDe, type Ambiente } from './sesion';

const LIMITE_CASOS = { llamadas: 10, periodoS: 60 };
const LIMITE_PASOS = { llamadas: 30, periodoS: 60 };
const ID = /^[0-9a-f-]{36}$/;

const parametrosZ = z.object({
  giro: z.string().trim().min(3).max(80),
  tamano: z.enum(['micro', 'pequena', 'mediana']),
  sintoma: z.string().trim().min(10).max(200),
  distractores: z.number().int().min(0).max(4),
  documentoClave: z.boolean(),
});
const crearZ = z.union([z.object({ preparado: z.string().min(1).max(80) }), parametrosZ]);

export const rutasLaboratorio = new Hono<Ambiente>();

const deps = (c: any) => ({ env: c.env, db: c.env.DB as D1Database });

function vistaPublica(f: FilaLab, extra: Record<string, unknown> = {}) {
  return {
    // casoPublico retira documentos[].esClave: qué documento es clave no sale antes de revelar.
    id: f.id, estado: f.estado, modo: f.modo, caso: casoPublico(f.caso), agenteId: f.agenteId, gastoLabUsd: f.gastoLabUsd,
    intercambios: f.intercambios.map((x) => ({ n: x.n, persona: x.persona, tipoPregunta: x.tipoPregunta, pregunta: x.pregunta, respuesta: x.respuesta, fuga: x.fuga, hechosRevelados: x.hechosRevelados.length })),
    ...extra,
  };
}

// Una grabación guardada tampoco puede filtrar verdad, esClave ni la causa de referencia.
function sanitizarGrabado(g: unknown): unknown {
  if (typeof g !== 'object' || g === null) return g;
  const copia = JSON.parse(JSON.stringify(g)) as Record<string, any>;
  delete copia.verdad;
  if (copia.caso?.documentos) copia.caso = casoPublico(copia.caso);
  if (copia.comparacionReferencia) copia.comparacionReferencia = { veredicto: copia.comparacionReferencia.veredicto };
  return copia;
}

async function respuestaGrabada(c: any) {
  const grabado = await leerGrabado(c.env.DB);
  if (grabado) return c.json({ modo: 'grabado', aviso: AVISO_GRABADO, grabado: sanitizarGrabado(grabado) });
  // Los casos preparados son la corrida grabada de respaldo cuando aún no hay fila en D1.
  // Solo el veredicto de referencia: su causaPrincipalAgente contiene marcadores.
  const p = CASOS_PREPARADOS[0];
  return c.json({ modo: 'grabado', aviso: AVISO_GRABADO, grabado: { caso: casoPublico(p.caso), intercambios: p.intercambios, fuentes: p.fuentes, comparacionReferencia: { veredicto: p.comparacionReferencia.veredicto } } });
}

rutasLaboratorio.post('/laboratorio', async (c) => {
  if (!(await dentroDelLimite(c.env.DB, `lab:${ipDe(c)}`, LIMITE_CASOS))) return c.json({ error: 'Demasiados casos seguidos; espera un minuto.' }, 429);
  const cuerpo = crearZ.safeParse(await c.req.json().catch(() => null));
  if (!cuerpo.success) return c.json({ error: 'Petición inválida: elige un caso preparado o describe giro (3-80), síntoma (10-200), tamaño, distractores (0-4) y documento clave.' }, 400);
  const sesion = c.get('sesion');
  const id = crypto.randomUUID();

  const preparadoId = 'preparado' in cuerpo.data ? (cuerpo.data as { preparado: string }).preparado : null;
  if (preparadoId !== null) {
    const preparado = CASOS_PREPARADOS.find((x) => x.caso.id === preparadoId);
    if (!preparado) return c.json({ error: 'No existe ese caso preparado.' }, 404);
    const fila: FilaLab = { id, sesion, agenteId: null, estado: 'generado', modo: 'en_vivo', caso: preparado.caso, verdad: preparado.verdad, fuentes: null, intercambios: [], gastoLabUsd: 0 };
    await crearLab(c.env.DB, fila);
    return c.json(vistaPublica(fila));
  }

  const p = cuerpo.data as ParametrosLaboratorio;
  if ((await gastoLabSesion(c.env.DB, sesion)) >= SUBTOPE_LAB_USD) return respuestaGrabada(c);
  try {
    const { caso, verdad, costoUsd } = await generarCaso(deps(c), sesion, p, id);
    const fila: FilaLab = { id, sesion, agenteId: null, estado: 'generado', modo: 'en_vivo', caso, verdad, fuentes: null, intercambios: [], gastoLabUsd: costoUsd };
    await crearLab(c.env.DB, fila);
    return c.json(vistaPublica(fila));
  } catch (e) {
    if (e instanceof TopeAlcanzado) return respuestaGrabada(c);
    if (e instanceof CasoInvalido) return c.json({ error: e.message, errores: e.errores }, 422);
    if (e instanceof ErrorMeta && e.tipo === 'demo') return respuestaGrabada(c);
    throw e;
  }
});

rutasLaboratorio.get('/laboratorio/:id', async (c) => {
  const id = c.req.param('id');
  const fila = ID.test(id) ? await leerLab(c.env.DB, id, c.get('sesion')) : null;
  if (!fila) return c.json({ error: 'No existe ese laboratorio en esta sesión.' }, 404);
  return c.json(vistaPublica(fila));
});

rutasLaboratorio.post('/laboratorio/:id/entrevistar', async (c) => {
  const id = c.req.param('id');
  if (!ID.test(id)) return c.json({ error: 'No existe ese laboratorio en esta sesión.' }, 404);
  if (!(await dentroDelLimite(c.env.DB, `lab-paso:${ipDe(c)}`, LIMITE_PASOS))) return c.json({ error: 'Demasiadas entrevistas seguidas; espera un minuto.' }, 429);
  const sesion = c.get('sesion');
  const fila = await leerLab(c.env.DB, id, sesion);
  if (!fila) return c.json({ error: 'No existe ese laboratorio en esta sesión.' }, 404);
  if (!fila.verdad) return c.json({ error: 'Este laboratorio no tiene un caso en vivo para entrevistar.' }, 400);
  // Reclamo atómico: una segunda entrevista en paralelo recibe conflicto, no sobrescribe.
  if (!(await reclamarEntrevistaLab(c.env.DB, id, sesion))) {
    return c.json({ error: 'Este laboratorio ya se está entrevistando o ya fue entrevistado.' }, 409);
  }
  const previo = { caso: JSON.parse(JSON.stringify(fila.caso)) as FilaLab['caso'], intercambios: fila.intercambios, fuentes: fila.fuentes, gastoLabUsd: fila.gastoLabUsd };
  fila.estado = 'entrevistando';
  try {
    const preparado = CASOS_PREPARADOS.find((x) => x.caso.id === fila.caso.id);
    let sinPresupuesto = false;
    if (fila.caso.origen === 'preparado' && preparado) {
      fila.intercambios = preparado.intercambios;
      fila.fuentes = preparado.fuentes;
    } else {
      const r = await ejecutarSimulacion(deps(c), sesion, fila.caso, fila.verdad);
      fila.intercambios = r.intercambios;
      fila.fuentes = r.fuentes;
      fila.gastoLabUsd = r.gastoLabUsd;
      sinPresupuesto = r.sinPresupuesto;
    }
    // También sin presupuesto se persiste todo con estado terminal antes de responder.
    fila.estado = 'listo';
    await guardarLab(c.env.DB, fila);
    if (sinPresupuesto) return c.json(vistaPublica(fila, { aviso: 'Sin presupuesto de simulación: las rondas restantes usaron respuestas de respaldo y no se creó diagnóstico en vivo.', sinPresupuesto: true }));
    return c.json(vistaPublica(fila));
  } catch (e) {
    // No dejar el laboratorio atrapado en 'entrevistando': vuelve a 'generado'.
    fila.caso = previo.caso; fila.intercambios = previo.intercambios; fila.fuentes = previo.fuentes; fila.gastoLabUsd = previo.gastoLabUsd;
    fila.estado = 'generado';
    await guardarLab(c.env.DB, fila).catch(() => undefined);
    throw e;
  }
});

rutasLaboratorio.post('/laboratorio/:id/iniciar-agente', async (c) => {
  const id = c.req.param('id');
  const sesion = c.get('sesion');
  const fila = ID.test(id) ? await leerLab(c.env.DB, id, sesion) : null;
  if (!fila) return c.json({ error: 'No existe ese laboratorio en esta sesión.' }, 404);
  if (!fila.fuentes?.length) return c.json({ error: 'Primero hay que entrevistar: todavía no hay fuentes para el agente.' }, 409);
  const g = await resumen(c.env.DB, sesion);
  const topes = leerTopes(c.env);
  if (g.sesionUsd >= topes.sesionUsd) return c.json({ error: 'Se alcanzó el tope de gasto de esta sesión; no se crea el agente.', aviso: AVISO_GRABADO }, 402);
  if (fila.agenteId) return c.json({ agenteId: fila.agenteId });
  // Primero se reclama el hueco con un id nuevo y solo entonces se crea ese agente:
  // la petición que pierde la carrera devuelve el id ganador y no crea un huérfano.
  const nuevoId = crypto.randomUUID();
  if (!(await asignarAgenteSiVacio(c.env.DB, id, sesion, nuevoId))) {
    const ganadora = await leerLab(c.env.DB, id, sesion);
    if (ganadora?.agenteId) return c.json({ agenteId: ganadora.agenteId });
    return c.json({ error: 'Ya se está creando el agente de este laboratorio.' }, 409);
  }
  const e = crearEstado({ id: nuevoId, titulo: fila.caso.empresa.nombre, objetivo: fila.caso.objetivo, fuentes: fila.fuentes });
  try {
    await crearAgente(c.env.DB, sesion, e);
  } catch (err) {
    // UPDATE puntual: solo se limpia si el hueco sigue siendo el id recién
    // reclamado; guardarLab con la fila leída antes pisaría cambios ajenos.
    await limpiarAgenteSiEs(c.env.DB, id, sesion, nuevoId).catch(() => undefined);
    throw err;
  }
  fila.agenteId = e.id;
  return c.json({ agenteId: e.id, vista: vistaDe(e, await resumen(c.env.DB, sesion)) });
});

rutasLaboratorio.post('/laboratorio/:id/revelar', async (c) => {
  const id = c.req.param('id');
  const sesion = c.get('sesion');
  const cuerpo = z.object({ forzar: z.boolean().optional() }).safeParse(await c.req.json().catch(() => ({})));
  // Un cuerpo inválido (p. ej. { "forzar": 1 }) equivale a forzar ausente: nunca revela.
  const forzar = cuerpo.success && cuerpo.data.forzar === true;
  const fila = ID.test(id) ? await leerLab(c.env.DB, id, sesion) : null;
  if (!fila || !fila.verdad) return c.json({ error: 'No existe ese laboratorio en esta sesión.' }, 404);
  let causaPrincipal: string | null = null;
  let textosEvidencia: string[] = [];
  if (fila.agenteId) {
    const agente = await leerAgente(c.env.DB, fila.agenteId, sesion);
    if (!agente) return c.json({ error: 'No existe el agente de este laboratorio en esta sesión.' }, 404);
    if (!agente.estado.terminado && !forzar) {
      return c.json({ error: 'El agente todavía no termina; pide revelar con { "forzar": true } si quieres ver la causa ya.' }, 409);
    }
    const vista = vistaDe(agente.estado, await resumen(c.env.DB, sesion));
    causaPrincipal = causaPrincipalDelAgente(agente.estado, vista);
    textosEvidencia = agente.estado.afirmaciones.map((a) => `${a.cita} ${a.resumen}`);
  } else if (fila.estado === 'entrevistando') {
    // Aunque venga forzar: la entrevista en curso va a guardar esta fila.
    return c.json({ error: 'El laboratorio se está entrevistando; espera a que termine para revelar.' }, 409);
  } else if (!forzar && fila.estado !== 'listo' && fila.estado !== 'revelado') {
    return c.json({ error: 'Todavía no hay diagnóstico; pide revelar con { "forzar": true } si quieres ver la causa ya.' }, 409);
  }
  const comparacion = comparar(fila.verdad, causaPrincipal, textosEvidencia);
  const nombreDueno = (dueno: string) => fila.caso.personas.find((x: PersonaSimulada) => x.id === dueno)?.rol ?? fila.caso.documentos.find((x: DocumentoSimulado) => x.id === dueno)?.titulo ?? dueno;
  fila.estado = 'revelado';
  await guardarLab(c.env.DB, fila);
  return c.json({
    ...vistaPublica(fila),
    verdad: fila.verdad,
    causaOculta: fila.verdad.causa,
    distractores: fila.verdad.distractores,
    guardadaPor: fila.verdad.hechos.filter((h) => h.tipo === 'causa').map((h) => ({ hecho: h.id, texto: h.texto, dueno: h.dueno, nombre: nombreDueno(h.dueno) })),
    comparacion,
  });
});

const MAX_AUDIO_BYTES = 32 * 1024 * 1024;

rutasLaboratorio.post('/voz/transcribir', async (c) => {
  if (!(await dentroDelLimite(c.env.DB, `voz:${ipDe(c)}`, LIMITE_PASOS))) return c.json({ error: 'Demasiadas transcripciones seguidas; espera un minuto.' }, 429);
  // Rechazo por Content-Length ANTES de interpretar el formulario o leer el cuerpo:
  // se deja margen para las fronteras del multipart sobre los 32 MB de audio.
  const declarado = Number(c.req.header('content-length') ?? '');
  if (Number.isFinite(declarado) && declarado > MAX_AUDIO_BYTES + 1024 * 1024) {
    return c.json({ error: 'El audio supera los 32 MB.' }, 413);
  }
  const form = await c.req.formData().catch(() => null);
  const audio = form?.get('audio');
  if (!(audio instanceof File)) return c.json({ error: 'Falta el archivo de audio (campo "audio").' }, 400);
  // Sin Content-Length fiable (p. ej. chunked) se corta por el tamaño ya declarado
  // del archivo, sin materializarlo en un Uint8Array; transcribirAudio revalida.
  if (audio.size > MAX_AUDIO_BYTES) return c.json({ error: 'El audio supera los 32 MB.' }, 413);
  const bytes = new Uint8Array(await audio.arrayBuffer());
  try {
    const r = await transcribirAudio(deps(c), c.get('sesion'), bytes);
    return c.json({ ...r, limpiezaDisponible: true });
  } catch (e) {
    if (e instanceof TopeAlcanzado) return c.json({ error: e.message }, 402);
    if (e instanceof ErrorTranscripcion) return c.json({ error: e.message }, e.status as any);
    throw e;
  }
});

// Referencia para que el tipo del caso quede ligado a esta ruta.
export type { CasoLaboratorio };
