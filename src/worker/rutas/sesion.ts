// Cada navegador recibe una sesión anónima en una cookie; el tope por sesión se cuenta sobre ella.
import { getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import type { Bindings } from '../env';

const COOKIE = 'indagora_sesion';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type Ambiente = { Bindings: Bindings; Variables: { sesion: string } };

export const conSesion = createMiddleware<Ambiente>(async (c, next) => {
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

// La cookie se puede descartar; la IP frena a quien la renueva en cada petición.
export const ipDe = (c: { req: { header: (n: string) => string | undefined } }) => c.req.header('cf-connecting-ip') ?? 'sin-ip';
