// Segunda opinión de código con Muse, directo por la API de Meta (sin Claude Code).
// Solo lee archivos de src/ y scripts/ (código que será público); nunca interno/, .dev.vars ni
// CLAUDE.local.md. Gasta créditos de Meta: imprime el costo real de cada llamada con su `usage`.
//   node scripts/revisar-con-muse.mjs <grupo>   (grupos abajo; sin argumento lista los grupos)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const MODELO = process.env.MUSE_MODELO ?? 'muse-wonder-1.0';
const PRECIO = { 'muse-wonder-1.0': { entrada: 4, salida: 20 }, 'muse-spark-1.3': { entrada: 1.25, salida: 4.25 } }[MODELO];
const TOPE_USD = 1.5; // por llamada, contando el peor caso de salida
const MAX_SALIDA = 16_000;

const GRUPOS = {
  'nucleo-agente': ['src/nucleo/agente/tipos.ts', 'src/nucleo/agente/estado.ts', 'src/nucleo/agente/seleccion.ts', 'src/nucleo/agente/criterio.ts', 'src/nucleo/agente/guardas.ts', 'src/nucleo/agente/aplicar.ts'],
  'worker-agente': ['src/worker/agente/bucle.ts', 'src/worker/agente/ejecutores.ts', 'src/worker/agente/almacen.ts', 'src/worker/agente/prompts.ts', 'src/worker/rutas/agente.ts', 'src/nucleo/agente/tipos.ts'],
  'nucleo-evidencia': ['src/nucleo/tipos.ts', 'src/nucleo/segmentar.ts', 'src/nucleo/lexico.ts', 'src/nucleo/verificar.ts', 'src/nucleo/niveles.ts'],
  'cliente-meta': ['src/config/models.ts', 'src/worker/meta/cliente.ts', 'src/worker/meta/esquema.ts', 'src/worker/gasto/gasto.ts', 'src/worker/gasto/limite.ts', 'src/worker/rutas/sesion.ts', 'src/worker/rutas/analizar.ts', 'src/worker/analista/analista.ts'],
};

const grupo = process.argv[2];
if (!GRUPOS[grupo]) {
  console.log('Grupos:', Object.keys(GRUPOS).join(', '));
  process.exit(grupo ? 1 : 0);
}

const llave = readFileSync('.dev.vars', 'utf8').match(/^META_API_KEY=(.+)$/m)?.[1]?.trim();
if (!llave) throw new Error('Falta META_API_KEY en .dev.vars');

const numerar = (ruta) => readFileSync(ruta, 'utf8').split('\n').map((l, i) => `${String(i + 1).padStart(4)}| ${l}`).join('\n');
const archivos = GRUPOS[grupo].map((r) => `=== ${r} ===\n${numerar(r)}`).join('\n\n');

const sistema = `Eres un revisor de código senior. El proyecto es Indagora: un agente de diagnóstico organizacional (Cloudflare Workers + Hono + D1 + React, TypeScript). Reglas del producto: el modelo nunca escribe citas, solo señala ids de oraciones y el código las reconstruye y verifica; los niveles de evidencia N0 a N4 los calcula el código; una causa con N0 a N2 solo admite acciones de verificación y solo N3 o N4 admite intervención; el código aprueba o rechaza cada acción del agente; todo gasto de IA pasa por un tope por sesión y global.

Busca BUGS REALES: lógica incorrecta, condiciones de carrera, estados que se pueden corromper, validaciones que se pueden evadir, formas de gastar sin tope, formas de que el modelo meta una conclusión sin evidencia, errores de asincronía, límites. Ignora estilo, nombres y preferencias. Para cada hallazgo da: severidad (alta/media/baja), archivo:línea, qué falla en una oración, y un escenario concreto de entrada o estado que lo dispara. Si no estás seguro, dilo. Máximo 12 hallazgos, ordenados por severidad. Responde en español y en Markdown. No inventes problemas: si algo está bien, no lo menciones.`;

const usuario = `Revisa este código (cada línea lleva su número).\n\n${archivos}`;
const estimadoEntrada = Math.ceil((sistema.length + usuario.length) / 3);
const peorCaso = (estimadoEntrada * PRECIO.entrada + MAX_SALIDA * PRECIO.salida) / 1e6;
console.log(`${grupo}: ~${estimadoEntrada} tokens de entrada, peor caso ${peorCaso.toFixed(2)} USD con ${MODELO}`);
if (peorCaso > TOPE_USD) throw new Error(`Peor caso ${peorCaso.toFixed(2)} USD supera el tope de ${TOPE_USD}`);

const inicio = Date.now();
const r = await fetch('https://api.meta.ai/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${llave}`, 'content-type': 'application/json' },
  body: JSON.stringify({ model: MODELO, reasoning_effort: 'medium', max_tokens: MAX_SALIDA, messages: [{ role: 'system', content: sistema }, { role: 'user', content: usuario }] }),
  signal: AbortSignal.timeout(600_000),
});
const cuerpo = await r.json().catch(() => null);
if (!r.ok) throw new Error(`HTTP ${r.status}: ${cuerpo?.error?.message ?? ''}`);
const u = cuerpo.usage;
const costo = ((u.prompt_tokens - (u.prompt_tokens_details?.cached_tokens ?? 0)) * PRECIO.entrada + (u.prompt_tokens_details?.cached_tokens ?? 0) * PRECIO.entrada * 0.12 + u.completion_tokens * PRECIO.salida) / 1e6;
const texto = cuerpo.choices[0].message.content ?? '';
console.log(`${((Date.now() - inicio) / 1000).toFixed(0)} s; entrada ${u.prompt_tokens}, salida ${u.completion_tokens} (razonamiento ${u.completion_tokens_details?.reasoning_tokens ?? '?'}); ~${costo.toFixed(3)} USD; finish=${cuerpo.choices[0].finish_reason}`);
mkdirSync('interno/revision-muse', { recursive: true });
const salida = `interno/revision-muse/${grupo}.md`;
writeFileSync(salida, `# Revisión de Muse (${MODELO}): ${grupo}\n\nCosto aproximado: ${costo.toFixed(3)} USD\n\n${texto}\n`);
console.log(`Guardado en ${salida}`);
