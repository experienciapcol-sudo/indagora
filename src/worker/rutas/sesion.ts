// Cada navegador recibe una sesión anónima en una cookie firmada; el tope por sesión se cuenta
// sobre ella. La firma impide inventar o fijar una sesión ajena; el límite diario por IP impide
// que borrar la cookie dé presupuesto nuevo sin fin.
import { getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import type { Bindings } from '../env';
import { dentroDelLimite } from '../gasto/limite';
import { sha256Hex } from '../hash';

const COOKIE = 'indagora_sesion';
const VALOR = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([0-9a-f]{64})$/;
// Sesiones nuevas por IP y día; pasado eso, esa IP comparte una sola sesión ese día.
export const SESIONES_POR_DIA = 4;
// Solo en http (local y pruebas). En https sin secreto se falla cerrado.
const SECRETO_LOCAL = 'indagora-solo-local';

export type Ambiente = { Bindings: Bindings; Variables: { sesion: string } };

const llaves = new Map<string, Promise<CryptoKey>>();
function llave(secreto: string): Promise<CryptoKey> {
  let k = llaves.get(secreto);
  if (!k) {
    k = crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    llaves.set(secreto, k);
  }
  return k;
}

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const bytes = (h: string) => new Uint8Array(h.match(/../g)!.map((x) => parseInt(x, 16)));

export async function firmar(sesion: string, secreto: string): Promise<string> {
  return `${sesion}.${hex(await crypto.subtle.sign('HMAC', await llave(secreto), new TextEncoder().encode(sesion)))}`;
}

// Devuelve la sesión si la firma es válida; verify compara en tiempo constante.
export async function verificar(valor: string | undefined, secreto: string): Promise<string | null> {
  const m = valor ? VALOR.exec(valor) : null;
  if (!m) return null;
  const ok = await crypto.subtle.verify('HMAC', await llave(secreto), bytes(m[2]), new TextEncoder().encode(m[1]));
  return ok ? m[1] : null;
}

// Sesión compartida de una IP en un día, con forma de UUID.
async function sesionDeIp(ip: string, ahoraMs: number): Promise<string> {
  const h = await sha256Hex(`indagora:sesion-ip:${ip}:${Math.floor(ahoraMs / 86_400_000)}`);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export const conSesion = createMiddleware<Ambiente>(async (c, next) => {
  const https = new URL(c.req.url).protocol === 'https:';
  const secreto = c.env.SESION_SECRETO?.trim() || (https ? null : SECRETO_LOCAL);
  if (!secreto) throw new Error('Falta el secreto SESION_SECRETO');
  let sesion = await verificar(getCookie(c, COOKIE), secreto);
  if (!sesion) {
    const ip = ipDe(c);
    sesion = (await dentroDelLimite(c.env.DB, `sesion:${ip}`, { llamadas: SESIONES_POR_DIA, periodoS: 86_400 }))
      ? crypto.randomUUID()
      : await sesionDeIp(ip, Date.now());
    // Secure solo en https: algunos navegadores descartan cookies Secure en http://localhost.
    setCookie(c, COOKIE, await firmar(sesion, secreto), { httpOnly: true, secure: https, sameSite: 'Lax', path: '/', maxAge: 60 * 60 * 24 });
  }
  c.set('sesion', sesion);
  await next();
});

// La cookie se puede descartar; la IP frena a quien la renueva en cada petición.
export const ipDe = (c: { req: { header: (n: string) => string | undefined } }) => c.req.header('cf-connecting-ip') ?? 'sin-ip';
