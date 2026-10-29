// Rutas de F2: consulta del gasto y una llamada real mínima para comprobar el despliegue.
// El texto que va a Meta es fijo y ficticio; el visitante no puede enviar contenido propio.
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
import type { Bindings } from '../env';
import { leerTopes, resumen, TopeAlcanzado } from '../gasto/gasto';
import { ErrorMeta, llamarMeta } from '../meta/cliente';
import { definirSalida } from '../meta/esquema';

const COOKIE = 'indagora_sesion';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type Ambiente = { Bindings: Bindings; Variables: { sesion: string } };

export const rutasGasto = new Hono<Ambiente>();

// Cada navegador recibe una sesión anónima; el tope por sesión se cuenta sobre ella.
rutasGasto.use('*', async (c, next) => {
  let sesion = getCookie(c, COOKIE);
  if (!sesion || !UUID.test(sesion)) {
    sesion = crypto.randomUUID();
    // Secure solo en https: algunos navegadores descartan cookies Secure en http://localhost.
    const secure = new URL(c.req.url).protocol === 'https:';
    setCookie(c, COOKIE, sesion, { httpOnly: true, secure, sameSite: 'Lax', path: '/', maxAge: 60 * 60 * 24 });
  }
  c.set('sesion', sesion);
  await next();
});

rutasGasto.get('/gasto', async (c) => {
  const g = await resumen(c.env.DB, c.get('sesion'));
  return c.json({ ...g, topes: leerTopes(c.env), demo: c.env.DEMO_MODE === 'true' });
});

const salidaPrueba = definirSalida(
  'clasificacion_prueba',
  z.object({
    tipo: z.enum(['opinion', 'testimonio_especifico']),
    razon: z.string(),
  }),
);

const ORACION_FICTICIA = 'La entrega del lunes salió dos días tarde porque faltó una pieza del proveedor.';

rutasGasto.post('/prueba', async (c) => {
  const sesion = c.get('sesion');
  // La cookie de sesión se puede descartar; el límite por IP frena a quien la renueva en cada petición.
  const ip = c.req.header('cf-connecting-ip') ?? 'sin-ip';
  if (!(await c.env.LIMITE_META.limit({ key: ip })).success) {
    return c.json({ error: 'Demasiadas llamadas seguidas; espera un minuto.' }, 429);
  }
  try {
    const r = await llamarMeta(
      { env: c.env, db: c.env.DB },
      {
        sesion,
        proposito: 'prueba-despliegue',
        rol: 'contributor',
        esfuerzo: 'minimal',
        maxTokens: 800,
        clave: 'prueba-despliegue',
        grabar: true,
        salida: salidaPrueba,
        mensajes: [
          {
            role: 'system',
            content:
              'Clasificas oraciones de entrevistas ficticias. "opinion" es un juicio general; "testimonio_especifico" narra un hecho concreto con cuándo, cuánto o qué. Responde en español con una razón de una línea.',
          },
          { role: 'user', content: ORACION_FICTICIA },
        ],
      },
    );
    return c.json({ oracion: ORACION_FICTICIA, resultado: r.datos, modelo: r.modelo, costoUsd: r.costoUsd, demo: r.demo, ms: r.ms, gasto: await resumen(c.env.DB, sesion) });
  } catch (e) {
    if (e instanceof TopeAlcanzado) return c.json({ error: e.message, alcance: e.alcance }, 429);
    if (e instanceof ErrorMeta && e.tipo === 'demo') return c.json({ error: e.message }, 503);
    if (e instanceof ErrorMeta && e.tipo !== 'config') return c.json({ error: e.message }, 502);
    throw e;
  }
});
