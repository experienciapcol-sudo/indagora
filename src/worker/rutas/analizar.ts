// POST /api/analizar: analiza una fuente. Sin estado: el navegador guarda la sesión y manda
// en `previas` las afirmaciones de las fuentes ya analizadas.
import { Hono } from 'hono';
import { z } from 'zod';
import type { PeticionAnalisis, RespuestaAnalisis } from '../../nucleo/tipos';
import { ErrorAnalisis, analizarFuente, MAX_PREVIAS } from '../analista/analista';
import { resumen, TopeAlcanzado } from '../gasto/gasto';
import { dentroDelLimite } from '../gasto/limite';
import { ErrorMeta } from '../meta/cliente';
import { ipDe, type Ambiente } from './sesion';

const LIMITE = { llamadas: 10, periodoS: 60 };
const ID_FUENTE = /^[ED]\d{1,2}$/;

export const fuenteZ = z.object({
  id: z.string().regex(ID_FUENTE),
  tipo: z.enum(['entrevista', 'documento']),
  rol: z.string().trim().min(1).max(80),
  modalidad: z.enum(['transcripcion', 'notas']),
  titulo: z.string().max(120),
  entrevistador: z.string().trim().max(40).nullable(),
  texto: z.string().trim().min(1).max(60_000),
  hablantesConocidos: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
});

const peticion = z.object({
  fuente: fuenteZ,
  previas: z
    .array(
      z.object({
        id: z.string().regex(/^[ED]\d{1,2}-A\d{2,3}$/),
        fuente: z.string().regex(ID_FUENTE),
        rol: z.string().max(80),
        resumen: z.string().max(400),
      }),
    )
    // Cota del cuerpo; el analista manda al modelo solo las primeras MAX_PREVIAS.
    .max(MAX_PREVIAS * 5),
}) satisfies z.ZodType<PeticionAnalisis>;

export const rutasAnalizar = new Hono<Ambiente>();

rutasAnalizar.post('/analizar', async (c) => {
  const cuerpo = peticion.safeParse(await c.req.json().catch(() => null));
  if (!cuerpo.success) return c.json({ error: 'Petición inválida: revisa la fuente (id, rol, texto de hasta 60,000 caracteres).' }, 400);
  if (!(await dentroDelLimite(c.env.DB, `analizar:${ipDe(c)}`, LIMITE))) {
    return c.json({ error: 'Demasiados análisis seguidos; espera un minuto.' }, 429);
  }
  const sesion = c.get('sesion');
  const { fuente, previas } = cuerpo.data;
  try {
    const r = await analizarFuente({ env: c.env, db: c.env.DB }, { sesion, fuente, previas });
    const respuesta: RespuestaAnalisis = { fuente, ...r, gasto: await resumen(c.env.DB, sesion) };
    return c.json(respuesta);
  } catch (e) {
    if (e instanceof ErrorAnalisis) return c.json({ error: e.message }, 400);
    if (e instanceof TopeAlcanzado) return c.json({ error: e.message, alcance: e.alcance }, 429);
    if (e instanceof ErrorMeta && e.tipo === 'demo') return c.json({ error: e.message }, 503);
    if (e instanceof ErrorMeta && e.tipo !== 'config') return c.json({ error: e.message }, 502);
    throw e;
  }
});
