// Corre el caso del taller con el agente contra un servidor (local por omisión) y guarda la
// vista final en interno/corridas/. Gasta créditos de Meta salvo con DEMO_MODE.
//   node scripts/correr-agente.mjs [url-base] [fuentes, p. ej. E1,E2,E3]
import { mkdirSync, writeFileSync } from 'node:fs';

const base = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '');
const fuentes = process.argv[3]?.split(',');
const MAX_PETICIONES = 30;

async function pedir(ruta, cookie) {
  const r = await fetch(`${base}${ruta}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: ruta === '/api/agente' ? JSON.stringify({ caso: 'taller', fuentes }) : undefined });
  const cuerpo = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${ruta}: HTTP ${r.status} ${cuerpo?.error ?? ''}`);
  return { cuerpo, cookie: r.headers.get('set-cookie')?.split(';')[0] ?? cookie };
}

const linea = (ev) => {
  switch (ev.tipo) {
    case 'decision':
      return `#${ev.paso} ${ev.accion}${ev.parametros ? ` (${ev.parametros})` : ''}: ${ev.justificacion}`;
    case 'rechazo':
      return `   ✗ ${ev.origen}/${ev.motivo}: ${ev.detalle}`;
    case 'resultado':
      return `   ✓ ${ev.resumen} [${(ev.ms / 1000).toFixed(1)} s, ${ev.costoUsd.toFixed(4)} USD${ev.demo ? ', grabada' : ''}]`;
    default:
      return `   ${ev.tipo}: ${ev.detalle}`;
  }
};

const inicio = Date.now();
let { cuerpo: vista, cookie } = await pedir('/api/agente');
const id = vista.estado.id;
console.log(`Caso ${id}`);
for (let i = 0; i < MAX_PETICIONES && !vista.estado.terminado; i++) {
  const r = await pedir(`/api/agente/${id}/paso`, cookie);
  vista = r.cuerpo.vista;
  for (const ev of r.cuerpo.nuevos) console.log(linea(ev));
}
const segundos = ((Date.now() - inicio) / 1000).toFixed(0);
console.log(`\nTerminado: ${vista.estado.terminado?.motivo ?? 'no'} en ${segundos} s; ${vista.estado.presupuesto.pasos} pasos; ${vista.estado.presupuesto.usd.toFixed(4)} USD`);
mkdirSync('interno/corridas', { recursive: true });
const archivo = `interno/corridas/agente-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
writeFileSync(archivo, JSON.stringify({ base, segundos: Number(segundos), vista }, null, 2));
console.log(`Guardado en ${archivo}`);
