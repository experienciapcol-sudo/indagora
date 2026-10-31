// Rutas del agente. El navegador solo pide pasos; el estado vive en D1 y solo lo cambia el Worker.
//   POST /api/agente                     crea un caso (el del taller o fuentes propias)
//   POST /api/agente/:id/paso            corre un paso del bucle
//   POST /api/agente/:id/confirmar       el consultor confirma o retira una corroboración
//   GET  /api/agente/:id                 estado y lo que calcula el código
import { Hono } from 'hono';
import { z } from 'zod';
import { CASO_TALLER } from '../../nucleo/casos/taller';
import { crearEstado, nivelesDe, vistaDe } from '../../nucleo/agente/estado';
import type { EstadoAgente, RespuestaPaso, VistaAgente } from '../../nucleo/agente/tipos';
import { crearAgente, existeAgente, guardarAgente, leerAgente, soltarCandado, tomarCandado } from '../agente/almacen';
import { darPaso } from '../agente/bucle';
import { resumen } from '../gasto/gasto';
import { dentroDelLimite } from '../gasto/limite';
import { publicarGrabaciones } from '../meta/cliente';
import { fuenteZ } from './analizar';
import { ipDe, type Ambiente } from './sesion';

const LIMITE_PASOS = { llamadas: 30, periodoS: 60 };
const LIMITE_CASOS = { llamadas: 10, periodoS: 60 };
const ID = /^[0-9a-f-]{36}$/;

const peticionCrear = z.union([
  // `fuentes`: qué fuentes del caso preparado se usan (todas si no se indica).
  z.object({ caso: z.literal('taller'), fuentes: z.array(z.string().regex(/^[ED]\d{1,2}$/)).min(1).max(8).optional() }),
  z.object({
    titulo: z.string().trim().min(1).max(120),
    objetivo: z.string().trim().min(1).max(400),
    fuentes: z
      .array(fuenteZ)
      .min(1)
      .max(8)
      .refine((f) => new Set(f.map((x) => x.id)).size === f.length, 'ids de fuente repetidos'),
  }),
]);

const peticionPaso = z.object({ indicacion: z.string().max(300).nullable().optional() });
const peticionConfirmar =z.object({ clave: z.string().max(40), confirmada: z.boolean() });

export const rutasAgente = new Hono<Ambiente>();

const vista = async (db: D1Database, sesion: string, e: EstadoAgente): Promise<VistaAgente> => vistaDe(e, await resumen(db, sesion));

rutasAgente.post('/agente', async (c) => {
  const cuerpo = peticionCrear.safeParse(await c.req.json().catch(() => null));
  if (!cuerpo.success) return c.json({ error: 'Petición inválida: indica el caso o un título, un objetivo y de 1 a 8 fuentes.' }, 400);
  if (!(await dentroDelLimite(c.env.DB, `agente:${ipDe(c)}`, LIMITE_CASOS))) return c.json({ error: 'Demasiados casos seguidos; espera un minuto.' }, 429);
  const d = cuerpo.data;
  const base =
    'caso' in d
      ? { titulo: CASO_TALLER.titulo, objetivo: CASO_TALLER.objetivo, fuentes: CASO_TALLER.fuentes.filter((f) => !d.fuentes || d.fuentes.includes(f.id)) }
      : d;
  if (base.fuentes.length === 0) return c.json({ error: 'Ninguna de esas fuentes está en el caso.' }, 400);
  const e = crearEstado({ id: crypto.randomUUID(), ...base });
  const sesion = c.get('sesion');
  await crearAgente(c.env.DB, sesion, e);
  return c.json(await vista(c.env.DB, sesion, e));
});

rutasAgente.get('/agente/:id', async (c) => {
  const id = c.req.param('id');
  const sesion = c.get('sesion');
  const fila = ID.test(id) ? await leerAgente(c.env.DB, id, sesion) : null;
  if (!fila) return c.json({ error: 'No existe ese caso en esta sesión.' }, 404);
  return c.json(await vista(c.env.DB, sesion, fila.estado));
});

rutasAgente.post('/agente/:id/paso', async (c) => {
  const id = c.req.param('id');
  const sesion = c.get('sesion');
  const db = c.env.DB;
  // Cuerpo opcional: { indicacion } del consultor para este paso.
  const cuerpo = peticionPaso.safeParse((await c.req.json().catch(() => null)) ?? {});
  if (!cuerpo.success) return c.json({ error: 'La indicación debe ser un texto de hasta 300 caracteres.' }, 400);
  if (!ID.test(id)) return c.json({ error: 'No existe ese caso en esta sesión.' }, 404);
  if (!(await dentroDelLimite(db, `paso:${ipDe(c)}`, LIMITE_PASOS))) return c.json({ error: 'Demasiados pasos seguidos; espera un minuto.' }, 429);
  if (!(await tomarCandado(db, id, sesion))) {
    return (await existeAgente(db, id, sesion)) ? c.json({ error: 'Ya hay un paso en curso para este caso.' }, 409) : c.json({ error: 'No existe ese caso en esta sesión.' }, 404);
  }
  try {
    // Se relee con el candado tomado: nadie más lo cambia mientras corre el paso.
    const fila = (await leerAgente(db, id, sesion))!;
    const nuevos = await darPaso({ env: c.env, db }, sesion, fila.estado, cuerpo.data.indicacion?.trim() || null);
    if (!(await guardarAgente(db, sesion, fila.estado, fila.version))) return c.json({ error: 'El caso cambió mientras corría el paso; vuelve a cargarlo.' }, 409);
    // Una corrida que terminó bien se vuelve la grabación de DEMO_MODE (solo casos preparados).
    if (fila.estado.terminado?.motivo === 'criterio' && nuevos.some((ev) => ev.tipo === 'fin')) await publicarGrabaciones(db, id);
    const respuesta: RespuestaPaso = { vista: await vista(db, sesion, fila.estado), nuevos };
    return c.json(respuesta);
  } finally {
    await soltarCandado(db, id, sesion);
  }
});

rutasAgente.post('/agente/:id/confirmar', async (c) => {
  const id = c.req.param('id');
  const sesion = c.get('sesion');
  const db = c.env.DB;
  const cuerpo = peticionConfirmar.safeParse(await c.req.json().catch(() => null));
  if (!cuerpo.success) return c.json({ error: 'Petición inválida.' }, 400);
  if (!ID.test(id)) return c.json({ error: 'No existe ese caso en esta sesión.' }, 404);
  if (!(await tomarCandado(db, id, sesion))) {
    return (await existeAgente(db, id, sesion)) ? c.json({ error: 'Hay un paso en curso; confirma cuando termine.' }, 409) : c.json({ error: 'No existe ese caso en esta sesión.' }, 404);
  }
  try {
    const fila = (await leerAgente(db, id, sesion))!;
    const e = fila.estado;
    const { clave, confirmada } = cuerpo.data;
    const confirmadas = new Set(e.confirmadas);
    // Solo se confirma una corroboración que el código dejó pendiente.
    const pendiente = [...nivelesDe(e).values()].some((n) => n.pendientes.includes(clave));
    if (confirmada && !pendiente && !confirmadas.has(clave)) return c.json({ error: 'Esa corroboración no está propuesta ni cumple las condiciones.' }, 400);
    if (confirmada) confirmadas.add(clave);
    else confirmadas.delete(clave);
    e.confirmadas = [...confirmadas].sort();
    // El nivel de la evidencia cambió: el siguiente paso revisa el criterio de paro de nuevo.
    if (e.terminado?.motivo === 'espera' || e.terminado?.motivo === 'criterio') e.terminado = null;
    if (!(await guardarAgente(db, sesion, e, fila.version))) return c.json({ error: 'El caso cambió; vuelve a cargarlo.' }, 409);
    return c.json(await vista(db, sesion, e));
  } finally {
    await soltarCandado(db, id, sesion);
  }
});
