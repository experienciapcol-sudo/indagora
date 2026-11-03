// Segunda opinión de código con Muse, directo por la API de Meta (sin Claude Code). Muse solo lee;
// nunca edita archivos. Solo se envía código que será público (src/, scripts/, migrations/,
// README.md, video/guion.md); nunca interno/, .dev.vars, .env ni CLAUDE.local.md.
// Cada llamada se cobra en un registro con tope duro: antes de salir se reserva el peor caso
// (entrada estimada + max_tokens de salida) y se rechaza si rebasa el tope; al volver se anota
// el costo real calculado con `usage`.
//   node scripts/revisar-con-muse.mjs                         lista los grupos
//   node scripts/revisar-con-muse.mjs <grupo|todos> [opciones]
//     --paso bugs|abuso|ambos   (ambos por omisión; el arnés solo lleva bugs)
//     --concurrencia N          (3 por omisión)
//     --fase N                  fase del registro de gasto (1 por omisión)
//     --archivos a,b,c          grupo ad hoc con esos archivos (nombre: el primer argumento)
//     --nota archivo.md         instrucciones extra al final del mensaje (p. ej. revalidar)
//     --simular                 solo mide tamaño y peor caso, sin llamar
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const MODELO = process.env.MUSE_MODELO ?? 'muse-wonder-1.0';
const PRECIO = { 'muse-wonder-1.0': { entrada: 4, salida: 20 }, 'muse-spark-1.3': { entrada: 1.25, salida: 4.25 } }[MODELO];
const FACTOR_CACHE = 0.12;
const MAX_SALIDA = 16_000;
const TOPE_LLAMADA_USD = 1.5;
const DIR = process.env.REVISION_DIR ?? 'interno/revision-final';
const REGISTRO = `${DIR}/gasto.json`;

const GRUPOS = {
  'nucleo-evidencia': ['src/nucleo/tipos.ts', 'src/nucleo/segmentar.ts', 'src/nucleo/lexico.ts', 'src/nucleo/verificar.ts', 'src/nucleo/niveles.ts'],
  'nucleo-agente': ['src/nucleo/agente/tipos.ts', 'src/nucleo/agente/estado.ts', 'src/nucleo/agente/seleccion.ts', 'src/nucleo/agente/criterio.ts', 'src/nucleo/agente/guardas.ts', 'src/nucleo/agente/aplicar.ts'],
  'worker-agente': ['src/worker/agente/bucle.ts', 'src/worker/agente/ejecutores.ts', 'src/worker/agente/almacen.ts', 'src/worker/agente/prompts.ts', 'src/worker/rutas/agente.ts', 'migrations/0004_agentes.sql', 'migrations/0005_grabaciones_caso.sql'],
  'meta-gasto': ['src/config/models.ts', 'src/worker/meta/cliente.ts', 'src/worker/meta/esquema.ts', 'src/worker/gasto/gasto.ts', 'src/worker/gasto/limite.ts', 'migrations/0001_gasto.sql', 'migrations/0002_totales.sql', 'migrations/0003_limites.sql'],
  'sesion-rutas': ['src/worker/index.ts', 'src/worker/env.ts', 'src/worker/hash.ts', 'src/worker/rutas/sesion.ts', 'src/worker/rutas/gasto.ts', 'src/worker/rutas/analizar.ts', 'src/worker/analista/analista.ts'],
  'entregables-nucleo': ['src/nucleo/entregables/tipos.ts', 'src/nucleo/entregables/elegibilidad.ts', 'src/nucleo/entregables/aplicar.ts', 'src/nucleo/entregables/generar.ts', 'src/nucleo/entregables/pareto.ts', 'src/nucleo/entregables/prioridad.ts', 'src/nucleo/entregables/informe.ts', 'src/nucleo/entregables/guia.ts', 'src/nucleo/entregables/matriz.ts'],
  'entregables-worker': ['src/worker/entregables/generador.ts', 'src/worker/entregables/prompts.ts', 'src/worker/entregables/almacenEntregables.ts', 'src/worker/rutas/entregables.ts', 'migrations/0006_entregables.sql', 'src/client/entregables/api.ts', 'src/client/entregables/logica.ts', 'src/client/entregables/PanelEntregables.tsx', 'src/client/entregables/VistaIntervencion.tsx', 'src/client/entregables/VistaIndicadores.tsx', 'src/client/entregables/VistaVerificacion.tsx', 'src/client/entregables/Informe.tsx'],
  'laboratorio-nucleo': ['src/nucleo/laboratorio/tipos.ts', 'src/nucleo/laboratorio/casos.ts', 'src/nucleo/laboratorio/casosPublicos.ts', 'src/nucleo/laboratorio/validar.ts', 'src/nucleo/laboratorio/entrevistas.ts', 'src/nucleo/laboratorio/hablantes.ts', 'src/nucleo/laboratorio/revelacion.ts', 'src/nucleo/laboratorio/comparar.ts', 'src/nucleo/laboratorio/voz.ts', 'src/nucleo/laboratorio/normalizar.ts'],
  'laboratorio-worker': ['src/worker/rutas/laboratorio.ts', 'src/worker/laboratorio/almacenLab.ts', 'src/worker/laboratorio/generarCaso.ts', 'src/worker/laboratorio/prompts.ts', 'src/worker/laboratorio/simular.ts', 'src/worker/laboratorio/transcribir.ts', 'src/worker/laboratorio/tiposLab.ts', 'migrations/0007_laboratorio.sql', 'src/nucleo/laboratorio/casosPublicos.ts', 'src/nucleo/laboratorio/revelacion.ts'],
  'interfaz-base': ['src/client/App.tsx', 'src/client/api.ts', 'src/client/sesion.ts', 'src/client/idioma.ts', 'src/client/PanelFuentes.tsx', 'src/client/TarjetaAfirmacion.tsx', 'src/client/Transcripcion.tsx', 'src/client/ResultadoFuente.tsx', 'src/client/PanelAnalisis.tsx', 'src/client/Rechazos.tsx', 'src/client/Encabezado.tsx'],
  'interfaz-agente': ['src/client/agente/PanelAgente.tsx', 'src/client/agente/api.ts', 'src/client/agente/logica.ts', 'src/client/agente/ConsolaTraza.tsx', 'src/client/agente/DetalleEvidencia.tsx', 'src/client/agente/PruebaCausas.tsx', 'src/client/agente/Verificaciones.tsx', 'src/client/agente/Criterio.tsx', 'src/client/agente/Ishikawa.tsx', 'src/client/agente/ChipEvidencia.tsx', 'src/client/agente/Presupuesto.tsx'],
  'interfaz-laboratorio': ['src/client/laboratorio/PanelLaboratorio.tsx', 'src/client/laboratorio/api.ts', 'src/client/laboratorio/AsignadorHablantes.tsx', 'src/client/laboratorio/asignacion.ts', 'src/client/laboratorio/FormularioEmpresa.tsx', 'src/client/laboratorio/GrabadoraVoz.tsx', 'src/client/laboratorio/wavCliente.ts', 'src/client/laboratorio/PanelEntrevistaReal.tsx', 'src/client/laboratorio/VistaEntrevistas.tsx', 'src/client/laboratorio/VistaRevelacion.tsx'],
  arnes: ['scripts/arnes/tipos.ts', 'scripts/arnes/casos.ts', 'scripts/arnes/flujos.ts', 'scripts/arnes/metricas.ts', 'scripts/arnes/arnes.ts', 'scripts/arnes/arnes.eval.ts'],
};
const SOLO_BUGS = new Set(['arnes']);

// Lo único que puede salir de la máquina: código y textos que serán públicos.
const PERMITIDO = /^(src|scripts|migrations)\/[^]+$|^README\.md$|^video\/guion\.md$/;
const PROHIBIDO = /(^|\/)(\.dev\.vars|\.env[^/]*|CLAUDE\.local\.md|interno|node_modules|\.git|\.wrangler|dist)(\/|$)/;

const PASOS = {
  bugs: `PASO A · BUGS. Busca bugs reales: lógica incorrecta, estados que se pueden corromper, condiciones de carrera, errores de asincronía (promesas sin esperar, efectos de React con dependencias o limpieza incorrectas, respuestas que llegan fuera de orden), límites (vacíos, uno, máximo), validaciones que se pueden evadir, formas de que el modelo meta una conclusión sin evidencia, manejo de errores que pierde estado o dinero ya gastado. No reportes asuntos de seguridad de abuso salvo que sean un bug de lógica.`,
  casos: `PASO C · CASOS DE PRUEBA HOSTILES. Esta vez no reportes hallazgos e ignora el formato de hallazgos: propone de 12 a 16 casos de prueba concretos para atacar este código por sus entradas públicas (texto de entrevistas, roles, títulos, indicación del consultor, notas, parámetros del Laboratorio, cuerpos HTTP). Cubre: instrucciones al modelo dentro del texto de una entrevista, hablantes falsos o que se hacen pasar por el entrevistador, citas o ids que no existen, números sin origen, Unicode raro (ancho cero, dirección invertida, homoglifos, emojis, saltos de línea internos), entradas vacías o gigantes, dos pasos en paralelo, reanudar un caso, y revelar durante la entrevista. Para cada caso da, en Markdown: "### K<n> · <título>", la ruta y el cuerpo exacto (texto literal listo para pegar, todo ficticio y en español), la invariante del producto que debe sostenerse, y si necesita una llamada real al modelo o basta una prueba sin red.`,
  afirmaciones: `PASO D · AFIRMACIONES SIN RESPALDO. Lee el README y el guion del video como lo haría un jurado escéptico. Señala cada afirmación que el propio texto o el código recibido no respalde: cifras (pasos, segundos, dólares, conteos, tasas), absolutos ("cero", "nunca", "siempre", "todo"), comparaciones con otras condiciones, descripciones de cómo funciona el código que no coincidan con lo que muestra el código, y términos que prometan más de lo que hay (por ejemplo "verified", "learns", "multi-agent swarm", "zero hallucinations"). Para cada una da: "### A<n> · <archivo>:<línea>", la frase literal, por qué no está respaldada o qué la contradice, y una reescritura más precisa. Máximo 20, de la más grave a la menos grave.`,
  abuso: `PASO B · ABUSO Y SEGURIDAD. Piensa como un visitante hostil de la URL pública. Busca: evasión de los topes de gasto (por sesión, global, subtope del Laboratorio, límites por IP, presupuesto del caso), manipulación de la cookie o la sesión, acceso a casos de otra sesión (IDOR), cuerpos enormes o malformados (JSON, audio, campos larguísimos, arreglos gigantes), inyección de instrucciones al modelo por el texto de entrevistas, notas, nombres de empresa o la indicación del consultor, fuga de la causa oculta o de los hechos prohibidos del Laboratorio hacia el navegador o hacia un prompt que no debe verla, XSS o inyección en lo que se renderiza (dangerouslySetInnerHTML, href/src construidos, nombres de archivo), y DEMO_MODE que gaste o grabe lo que no debe.`,
};

const sistema = `Eres un revisor de código senior e independiente. El proyecto es Indagora: un agente de diagnóstico organizacional (Cloudflare Workers + Hono + D1 + React, TypeScript). Reglas del producto: el modelo nunca escribe citas, solo señala ids de oraciones y el código las reconstruye y verifica; los niveles de evidencia N0 a N4 los calcula el código; con una sola fuente nada pasa de N2; una causa con N0 a N2 solo admite acciones de verificación y solo N3 o N4 admite intervención; el código aprueba o rechaza cada acción del agente; todo gasto de IA pasa por un tope por sesión y global reservado en D1 antes de llamar.

Decisiones ya tomadas que NO debes reportar:
- GET /api/gasto y la vista del agente muestran el gasto global.
- No hay cabeceras de seguridad extra, ni CSRF por Origin, ni límites por minuto en las rutas GET ni en confirmar.
- Con peticiones paralelas sin cookie se pueden crear algo más de 4 sesiones por IP (bajo impacto).
- La reserva de gasto usa max_tokens como cota de salida y estima la entrada como caracteres/3.
- El candado de un paso del agente no tiene dueño; vence a los 7 minutos.
- La comprobación cifra_sin_origen compara dígitos, no números escritos con letras.
- Los casos preparados del Laboratorio guardan la causa oculta en el servidor por diseño; solo es fallo si llega al navegador antes de revelar, o a un prompt que no debe verla.
- DEMO_MODE solo reproduce grabaciones de casos preparados; un paso sin grabación termina con error explícito.

Reglas de tu respuesta:
- Reporta solo lo que puedas señalar con archivo y línea exactos del código que recibiste. Si un fallo depende de código que no ves, dilo en "Confianza".
- No reportes estilo, nombres, falta de pruebas ni preferencias. No inventes: si algo está bien, no lo menciones. Cero hallazgos es una respuesta válida.
- Máximo 10 hallazgos, ordenados por severidad (alta/media/baja).
- Formato exacto por hallazgo, en español y Markdown:
### H<n> · <alta|media|baja> · <archivo>:<línea o rango>
**Qué falla:** una oración.
**Escenario:** entrada o estado concreto que lo dispara y qué pasa.
**Confianza:** alta, media o baja, con la razón en pocas palabras.`;

// El paso de casos pide otra salida: su propio sistema, sin el formato de hallazgos.
const SISTEMA_CASOS = `Eres un probador de software hostil e independiente. El proyecto es Indagora (Cloudflare Workers + Hono + D1 + React, TypeScript): un agente de diagnóstico organizacional donde el modelo solo señala ids de oraciones y el código reconstruye y verifica las citas, calcula los niveles N0 a N4 (una sola fuente no pasa de N2; solo N3 o N4 admite intervención) y aprueba o rechaza cada acción. Tu trabajo NO es reportar bugs: es diseñar casos de prueba concretos que intenten romper esas reglas. Responde en español y en Markdown, solo con los casos pedidos, sin preámbulo.`;

const SISTEMA_AFIRMACIONES = `Eres un revisor editorial escéptico e independiente de un proyecto de hackatón llamado Indagora (agente de diagnóstico organizacional). No revisas bugs: revisas si cada afirmación pública está respaldada. Sé literal y concreto. Responde en español y en Markdown, solo con lo pedido, sin preámbulo.`;

const args = process.argv.slice(2);
const opcion = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const simular = args.includes('--simular');
const objetivo = args[0];
const archivosAdHoc = opcion('archivos');
if (archivosAdHoc && objetivo) GRUPOS[objetivo] = archivosAdHoc.split(',').map((s) => s.trim()).filter(Boolean);
if (!objetivo || (objetivo !== 'todos' && !GRUPOS[objetivo])) {
  console.log('Grupos:', Object.keys(GRUPOS).join(', '), '| todos');
  process.exit(objetivo ? 1 : 0);
}
const pasoPedido = opcion('paso', 'ambos');
const concurrencia = Number(opcion('concurrencia', 3));
const fase = String(opcion('fase', 1));
const notaRuta = opcion('nota');
const nota = notaRuta ? readFileSync(notaRuta, 'utf8') : '';

const numerar = (ruta) => readFileSync(ruta, 'utf8').split('\n').map((l, i) => `${String(i + 1).padStart(4)}| ${l}`).join('\n');
function codigoDe(grupo) {
  for (const r of GRUPOS[grupo]) {
    if (!PERMITIDO.test(r) || PROHIBIDO.test(r) || r.includes('..')) throw new Error(`Archivo no permitido para Muse: ${r}`);
    if (!existsSync(r)) throw new Error(`No existe: ${r}`);
  }
  return GRUPOS[grupo].map((r) => `=== ${r} ===\n${numerar(r)}`).join('\n\n');
}

// El código va primero y la tarea al final: el segundo paso del mismo grupo reutiliza el caché.
const trabajos = [];
for (const grupo of objetivo === 'todos' ? Object.keys(GRUPOS) : [objetivo]) {
  const pasos = pasoPedido === 'ambos' ? (SOLO_BUGS.has(grupo) ? ['bugs'] : ['bugs', 'abuso']) : [pasoPedido];
  const codigo = codigoDe(grupo);
  for (const paso of pasos) {
    const usuario = `Código a revisar (cada línea lleva su número):\n\n${codigo}\n\n---\n${PASOS[paso]}${nota ? `\n\n${nota}` : ''}`;
    const entrada = Math.ceil((sistema.length + usuario.length) / 3);
    trabajos.push({ grupo, paso, usuario, entrada, peor: (entrada * PRECIO.entrada + MAX_SALIDA * PRECIO.salida) / 1e6 });
  }
}

const registro = JSON.parse(readFileSync(REGISTRO, 'utf8'));
const peorTotal = trabajos.reduce((s, t) => s + t.peor, 0);
console.log(`${trabajos.length} llamadas con ${MODELO}; peor caso ${peorTotal.toFixed(2)} USD; gastado ${registro.totalUsd.toFixed(3)} de ${registro.topeUsd} (pausa en ${registro.pausaUsd}).`);
for (const t of trabajos) console.log(`  ${t.grupo}/${t.paso}: ~${t.entrada} tokens de entrada, peor caso ${t.peor.toFixed(2)} USD`);
if (simular) process.exit(0);

const llave = readFileSync('.dev.vars', 'utf8').match(/^META_API_KEY=(.+)$/m)?.[1]?.trim();
if (!llave) throw new Error('Falta META_API_KEY en .dev.vars');

let reservado = 0;
const guardar = () => writeFileSync(REGISTRO, JSON.stringify(registro, null, 2));

async function correr(t) {
  if (t.peor > TOPE_LLAMADA_USD) throw new Error(`${t.grupo}/${t.paso}: peor caso ${t.peor.toFixed(2)} supera ${TOPE_LLAMADA_USD} por llamada`);
  // Se detiene en la pausa (no solo en el tope): pasar de ahí lo decide el usuario.
  const limite = Math.min(registro.topeUsd, registro.pausaUsd);
  if (registro.totalUsd + reservado + t.peor > limite) {
    console.log(`RECHAZADA ${t.grupo}/${t.paso}: ${registro.totalUsd.toFixed(3)} gastado + ${reservado.toFixed(2)} en vuelo + ${t.peor.toFixed(2)} rebasa ${limite}`);
    return;
  }
  reservado += t.peor;
  const inicio = Date.now();
  try {
    const r = await fetch('https://api.meta.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${llave}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODELO,
        reasoning_effort: 'medium',
        max_tokens: MAX_SALIDA,
        prompt_cache_key: `revision-${t.grupo}`,
        messages: [{ role: 'system', content: t.paso === 'casos' ? SISTEMA_CASOS : t.paso === 'afirmaciones' ? SISTEMA_AFIRMACIONES : sistema }, { role: 'user', content: t.usuario }],
      }),
      signal: AbortSignal.timeout(600_000),
    });
    const cuerpo = await r.json().catch(() => null);
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${cuerpo?.error?.message ?? ''}`);
    const u = cuerpo.usage;
    const cache = u.prompt_tokens_details?.cached_tokens ?? 0;
    const usd = ((u.prompt_tokens - cache) * PRECIO.entrada + cache * PRECIO.entrada * FACTOR_CACHE + u.completion_tokens * PRECIO.salida) / 1e6;
    const fin = cuerpo.choices[0].finish_reason;
    registro.totalUsd += usd;
    registro.porFase[fase] = (registro.porFase[fase] ?? 0) + usd;
    registro.llamadas.push({ t: new Date().toISOString(), fase, grupo: t.grupo, paso: t.paso, entrada: u.prompt_tokens, cache, salida: u.completion_tokens, usd: Number(usd.toFixed(4)), ms: Date.now() - inicio, fin });
    guardar();
    const texto = cuerpo.choices[0].message.content ?? '';
    mkdirSync(`${DIR}/muse`, { recursive: true });
    writeFileSync(`${DIR}/muse/${t.grupo}-${t.paso}.md`, `# Muse (${MODELO}) · ${t.grupo} · ${t.paso}\n\nCosto: ${usd.toFixed(4)} USD · entrada ${u.prompt_tokens} (caché ${cache}) · salida ${u.completion_tokens} · fin ${fin}\n\n${texto}\n`);
    console.log(`OK ${t.grupo}/${t.paso}: ${((Date.now() - inicio) / 1000).toFixed(0)} s, ${usd.toFixed(3)} USD (caché ${cache}), fin=${fin}; total ${registro.totalUsd.toFixed(3)}`);
  } catch (e) {
    console.log(`ERROR ${t.grupo}/${t.paso}: ${e.message}`);
  } finally {
    reservado -= t.peor;
  }
}

// Cada trabajador toma un grupo entero: sus pasos van seguidos y el segundo encuentra el caché.
const cola = [...new Set(trabajos.map((t) => t.grupo))].map((g) => trabajos.filter((t) => t.grupo === g));
await Promise.all(Array.from({ length: concurrencia }, async () => {
  while (cola.length) for (const t of cola.shift()) await correr(t);
}));
console.log(`Fin. Gasto total del registro: ${registro.totalUsd.toFixed(3)} USD (fase ${fase}: ${(registro.porFase[fase] ?? 0).toFixed(3)}).`);
