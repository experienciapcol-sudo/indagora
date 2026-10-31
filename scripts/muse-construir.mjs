// Construcción delegada a Muse (muse-wonder-1.0) por la API de Meta, sin Claude Code.
// Cada tarea vive en interno/muse/tareas/NN-nombre.md. El script arma el contexto, llama a Muse,
// aplica los archivos que devuelve, corre tsc + vitest + vite build y, si algo falla, se lo
// devuelve a Muse (hasta 3 rondas). Solo hace commit en verde; si no, deshace todo.
// Nunca hace push ni despliega. Tope duro de gasto en interno/muse/gasto.json.
//   node scripts/muse-construir.mjs --cola            corre las tareas pendientes en orden
//   node scripts/muse-construir.mjs 03                corre una tarea (por prefijo de id)
//   node scripts/muse-construir.mjs --cola --simular  solo mide contexto y costo, sin llamar
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';

const MODELO = process.env.MUSE_MODELO ?? 'muse-wonder-1.0';
const PRECIO = { entrada: 4, cache: 0.48, salida: 20 }; // USD por millón de tokens
const TOPE_USD = Number(process.env.TOPE_MUSE_USD ?? 30);
const MAX_SALIDA = 32_000;
const MAX_CONTEXTO_CHARS = 260_000;
const MAX_REPARACIONES = 3;
const DIR = 'interno/muse';
const GASTO = `${DIR}/gasto.json`;
const ESTADO = `${DIR}/estado.json`;
const AVANCE = `${DIR}/AVANCE.md`;

const log = (...a) => console.log(`[${new Date().toTimeString().slice(0, 8)}]`, ...a);
const leerJson = (ruta, porOmision) => (existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf8')) : porOmision);
const escribirJson = (ruta, v) => {
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, JSON.stringify(v, null, 2));
};
const limpia = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '').trim();
const lista = (v) => (v ? v.split(',').map(limpia).filter(Boolean) : []);
const recortar = (s, n) => (s.length <= n ? s : `${s.slice(0, n / 2)}\n[…]\n${s.slice(-n / 2)}`);

class TopeError extends Error {}

// ---------- qué puede leer y escribir Muse ----------

// Nunca sale de la máquina: claves, reglas privadas, planeación (salvo lo que se escribe para Muse).
const PROHIBIDO_LEER = /(^|\/)(\.dev\.vars|\.env[^/]*|CLAUDE\.local\.md[^/]*|node_modules|\.git|\.claude|\.wrangler|dist)(\/|$)/;
function puedeLeer(p) {
  if (!p || p.includes('..') || p.startsWith('/') || /^[a-zA-Z]:/.test(p) || PROHIBIDO_LEER.test(p)) return false;
  return p.startsWith('interno/') ? p.startsWith('interno/muse/') : true;
}

// Aunque una tarea lo liste, Muse no toca lo que protege la tesis del producto ni el gasto.
const NUNCA_ESCRIBIR = [
  /^\.(git|claude|wrangler)\//,
  /^(node_modules|dist)\//,
  /^(wrangler\.jsonc|package(-lock)?\.json|tsconfig[^/]*\.json|\.gitignore|\.gitattributes|\.env[^/]*|\.dev\.vars|CLAUDE[^/]*\.md|vite\.config\.ts|vitest[^/]*\.ts)$/,
  /^migrations\/000[1-5]_/,
  /^src\/config\//,
  /^src\/worker\/(meta|gasto|analista)\//,
  /^src\/worker\/rutas\/(sesion|gasto|analizar)(\.test)?\.ts$/,
  /^src\/nucleo\/(niveles|verificar|lexico|segmentar|tipos)(\.test)?\.ts$/,
  /^src\/nucleo\/agente\//,
  /^src\/nucleo\/casos\/(taller|taller\.verdad|evaluar)(\.test)?\.ts$/,
  /^scripts\/(muse-|smoke|revisar|correr|evaluar-agente)/,
  /^interno\/(?!muse\/)/,
  /^interno\/muse\/(gasto|estado)\.json$|^interno\/muse\/(AVANCE|CONTEXTO|LEEME)/,
];
const puedeEscribir = (p, salida) =>
  !p.includes('..') && !p.startsWith('/') && !/^[a-zA-Z]:/.test(p) && !NUNCA_ESCRIBIR.some((r) => r.test(p)) && salida.some((s) => (s.endsWith('/') ? p.startsWith(s) : p === s));

function expandir(entrada) {
  const e = limpia(entrada).replace(/\/$/, '');
  if (!puedeLeer(e)) throw new Error(`Ruta no permitida como contexto: ${e}`);
  if (!existsSync(e)) throw new Error(`No existe el archivo de contexto: ${e}`);
  if (!statSync(e).isDirectory()) return [e];
  return readdirSync(e, { recursive: true })
    .map((f) => `${e}/${limpia(String(f))}`)
    .filter((f) => /\.(ts|tsx|css|sql|md)$/.test(f) && !/\.test\.ts$/.test(f) && statSync(f).isFile());
}

// ---------- tareas ----------

function leerTarea(archivo) {
  const crudo = readFileSync(archivo, 'utf8');
  const i = crudo.search(/^---\s*$/m);
  const cabecera = crudo.slice(0, i);
  const h = Object.fromEntries(cabecera.split('\n').map((l) => l.match(/^(\w+):\s*(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
  const id = basename(archivo).split('-')[0];
  return {
    id,
    archivo,
    titulo: h.titulo ?? basename(archivo),
    modo: h.modo ?? 'codigo',
    esfuerzo: h.esfuerzo ?? 'medium',
    contexto: lista(h.contexto),
    salida: lista(h.salida),
    depende: lista(h.depende),
    instrucciones: crudo.slice(i).replace(/^---\s*\n/, ''),
  };
}

// ---------- llamada a Muse ----------

const llaveMeta = () => {
  const l = readFileSync('.dev.vars', 'utf8').match(/^META_API_KEY=(.+)$/m)?.[1]?.trim();
  if (!l) throw new Error('Falta META_API_KEY en .dev.vars');
  return l;
};

async function llamar(mensajes, esfuerzo, tarea) {
  const entradaEst = Math.ceil(JSON.stringify(mensajes).length / 3);
  const peor = (entradaEst * PRECIO.entrada + MAX_SALIDA * PRECIO.salida) / 1e6;
  const g = leerJson(GASTO, { totalUsd: 0, llamadas: [] });
  if (g.totalUsd + peor > TOPE_USD) throw new TopeError(`Tope de construcción: ${g.totalUsd.toFixed(2)} USD gastados + ${peor.toFixed(2)} del peor caso supera ${TOPE_USD} USD`);
  const cuerpo = JSON.stringify({ model: MODELO, reasoning_effort: esfuerzo, max_tokens: MAX_SALIDA, messages: mensajes });
  let ultimo;
  for (let n = 1; n <= 2; n++) {
    const inicio = Date.now();
    try {
      const r = await fetch('https://api.meta.ai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${llaveMeta()}`, 'content-type': 'application/json' },
        body: cuerpo,
        signal: AbortSignal.timeout(900_000),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) {
        ultimo = new Error(`HTTP ${r.status}: ${j?.error?.message ?? ''}`);
        if (r.status === 429 || r.status >= 500) {
          await new Promise((res) => setTimeout(res, 8000));
          continue;
        }
        throw ultimo;
      }
      const u = j.usage;
      const cache = u.prompt_tokens_details?.cached_tokens ?? 0;
      const usd = ((u.prompt_tokens - cache) * PRECIO.entrada + cache * PRECIO.cache + u.completion_tokens * PRECIO.salida) / 1e6;
      const ms = Date.now() - inicio;
      const actual = leerJson(GASTO, { totalUsd: 0, llamadas: [] });
      actual.totalUsd += usd;
      actual.llamadas.push({ t: new Date().toISOString(), tarea, entrada: u.prompt_tokens, salida: u.completion_tokens, usd: Number(usd.toFixed(4)), ms });
      escribirJson(GASTO, actual);
      log(`  Muse: ${(ms / 1000).toFixed(0)} s, entrada ${u.prompt_tokens}, salida ${u.completion_tokens}, ${usd.toFixed(3)} USD (acumulado ${actual.totalUsd.toFixed(2)} de ${TOPE_USD})`);
      return { texto: j.choices[0].message.content ?? '', finish: j.choices[0].finish_reason, usd };
    } catch (e) {
      ultimo = e;
      if (e instanceof TopeError) throw e;
      log(`  Falló la llamada (${e.message}); intento ${n} de 2`);
      await new Promise((res) => setTimeout(res, 8000));
    }
  }
  throw ultimo;
}

// ---------- protocolo de archivos ----------

const sinCercas = (cuerpo) => {
  const c = [...cuerpo];
  if (c[0]?.trim().startsWith('```')) c.shift();
  if (c.at(-1)?.trim() === '```') c.pop();
  return c;
};

function analizar(texto) {
  const l = texto.split(/\r?\n/);
  const archivos = [];
  const ediciones = [];
  const notas = [];
  const errores = [];
  const hasta = (desde, re) => {
    let j = desde;
    while (j < l.length && !re.test(l[j])) j++;
    return { cuerpo: l.slice(desde, j), siguiente: j + 1, cerrado: j < l.length };
  };
  for (let i = 0; i < l.length; i++) {
    let m;
    if ((m = l[i].match(/^@@ARCHIVO\s+(\S+)\s*$/))) {
      const r = hasta(i + 1, /^@@FIN\s*$/);
      if (!r.cerrado) errores.push(`El bloque @@ARCHIVO ${m[1]} no termina con @@FIN (¿se cortó la salida?)`);
      else archivos.push({ ruta: limpia(m[1]), contenido: `${sinCercas(r.cuerpo).join('\n')}\n` });
      i = r.siguiente - 1;
    } else if ((m = l[i].match(/^@@EDITAR\s+(\S+)\s*$/))) {
      const b = hasta(i + 1, /^@@POR\s*$/);
      const p = hasta(b.siguiente, /^@@FIN\s*$/);
      const buscar = b.cuerpo.slice(l[i + 1]?.match(/^@@BUSCAR\s*$/) ? 1 : 0);
      if (!b.cerrado || !p.cerrado) errores.push(`El bloque @@EDITAR ${m[1]} está incompleto (falta @@POR o @@FIN)`);
      else ediciones.push({ ruta: limpia(m[1]), buscar: sinCercas(buscar).join('\n'), por: sinCercas(p.cuerpo).join('\n') });
      i = p.siguiente - 1;
    } else if (l[i].match(/^@@NOTA\s*$/)) {
      const r = hasta(i + 1, /^@@FIN\s*$/);
      notas.push(r.cuerpo.join('\n').trim());
      i = r.siguiente - 1;
    }
  }
  return { archivos, ediciones, notas, errores };
}

const tocados = new Map(); // ruta -> contenido original (null si no existía)
const recordar = (ruta) => {
  if (!tocados.has(ruta)) tocados.set(ruta, existsSync(ruta) ? readFileSync(ruta, 'utf8') : null);
};
const escribir = (ruta, contenido) => {
  recordar(ruta);
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, contenido);
};
function deshacer() {
  for (const [ruta, original] of tocados) {
    if (original === null) {
      if (existsSync(ruta)) unlinkSync(ruta);
    } else writeFileSync(ruta, original);
  }
  tocados.clear();
}

function aplicar(texto, salida) {
  const { archivos, ediciones, notas, errores } = analizar(texto);
  for (const a of archivos) {
    if (!puedeEscribir(a.ruta, salida)) errores.push(`No puedes escribir ${a.ruta}: está fuera de la lista permitida o protegida`);
    else escribir(a.ruta, a.contenido);
  }
  for (const e of ediciones) {
    if (!puedeEscribir(e.ruta, salida)) {
      errores.push(`No puedes editar ${e.ruta}: está fuera de la lista permitida o protegida`);
      continue;
    }
    if (!existsSync(e.ruta)) {
      errores.push(`No existe ${e.ruta} para editarlo; usa @@ARCHIVO`);
      continue;
    }
    const actual = readFileSync(e.ruta, 'utf8');
    const veces = e.buscar ? actual.split(e.buscar).length - 1 : 0;
    if (veces !== 1) errores.push(`En ${e.ruta}, el texto de @@BUSCAR aparece ${veces} veces (debe ser exactamente 1). Texto buscado: ${recortar(e.buscar, 300)}`);
    else escribir(e.ruta, actual.replace(e.buscar, () => e.por));
  }
  return { errores, notas, nArchivos: archivos.length + ediciones.length };
}

// ---------- verificación y commit ----------

function ejecutar(cmd, timeout) {
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8', timeout, maxBuffer: 80e6 });
  return { ok: r.status === 0, salida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}
function verificar() {
  for (const [cmd, t] of [['npx tsc -b', 300_000], ['npx vitest run', 600_000], ['npx vite build', 300_000]]) {
    const r = ejecutar(cmd, t);
    log(`  ${r.ok ? '✓' : '✗'} ${cmd}`);
    if (!r.ok) return { ok: false, salida: `Falló \`${cmd}\`:\n${recortar(r.salida.replace(/\x1b\[[0-9;]*m/g, ''), 7000)}` };
  }
  return { ok: true, salida: '' };
}
const git = (...a) => spawnSync('git', a, { encoding: 'utf8' });
function confirmar(t, rutas) {
  const versionables = rutas.filter((r) => git('check-ignore', '-q', r).status !== 0);
  if (versionables.length === 0) return null;
  git('add', '--', ...versionables);
  const c = git('commit', '-q', '-m', `[muse] ${t.titulo}`, '-m', `Construido por ${MODELO} con scripts/muse-construir.mjs (tarea ${t.id}). Pendiente de revisión por Claude.`);
  if (c.status !== 0) throw new Error(`git commit falló: ${c.stderr}`);
  return git('rev-parse', '--short', 'HEAD').stdout.trim();
}

// ---------- prompts ----------

const SISTEMA_CODIGO = `Eres un ingeniero de software senior que construye Indagora (TypeScript, Cloudflare Workers + Hono + D1 + React + Zod + vitest). Trabajas sin supervisión: lo que entregues se aplica, se compila y se prueba automáticamente; si falla, recibirás el error y deberás corregirlo.

PROTOCOLO DE SALIDA (obligatorio, sin cercas de código markdown dentro de los bloques):
@@ARCHIVO ruta/relativa.ts
contenido completo del archivo
@@FIN
(archivo nuevo o reemplazo completo; úsalo para archivos nuevos o chicos)

@@EDITAR ruta/relativa.ts
@@BUSCAR
texto exacto que existe UNA sola vez en el archivo
@@POR
texto que lo reemplaza
@@FIN
(úsalo para cambiar archivos grandes ya existentes; el texto de BUSCAR debe coincidir carácter por carácter)

@@NOTA
cualquier cosa que el revisor humano deba saber (decisiones, límites, cambios que necesitas en archivos protegidos)
@@FIN

REGLAS
- Solo puedes escribir las rutas de "Archivos que puedes escribir". Hay archivos protegidos (guardas, niveles, verificador, cliente de Meta, gasto): si necesitas un cambio ahí, NO lo hagas; descríbelo con precisión en @@NOTA.
- Sigue el estilo del código existente: comentarios breves en español, nombres en español, sin dependencias nuevas, TypeScript estricto (sin variables sin usar).
- Toda lógica nueva lleva pruebas vitest en un archivo .test.ts junto al código. Solo datos ficticios.
- Reglas del producto (inviolables): el modelo nunca escribe citas, solo señala ids de oraciones o afirmaciones y el código reconstruye y verifica; los niveles N0 a N4 los calcula el código; una causa con N0 a N2 solo admite acciones de verificación y solo N3 o N4 admite intervención; toda llamada a Meta pasa por llamarMeta con esquema estricto definido una vez con Zod (definirSalida) y esfuerzo explícito; todo gasto pasa por los topes existentes; nada de claves en el código.
- No inventes APIs: usa solo lo que ves en los archivos de contexto.
- Entrega todo en una sola respuesta, completo y coherente. Si el trabajo es muy grande, prioriza lo que compila y se prueba, y dilo en @@NOTA.`;

const SISTEMA_DOCUMENTO = `Eres un ingeniero de software senior y revisor de Indagora. Escribe el documento pedido en Markdown, en español, completo y concreto, sin preámbulo ni despedida y sin envolverlo en cercas de código. Cuando cites código, indica archivo y función. No inventes lo que no ves en los archivos de contexto.`;

function mensajeInicial(t, archivos) {
  const ctx = archivos.map((f) => `=== ${f} ===\n${readFileSync(f, 'utf8')}`).join('\n\n');
  const escribible = t.salida.map((s) => `- ${s}`).join('\n');
  return `# Tarea ${t.id}: ${t.titulo}\n\n## Archivos de contexto\n\n${ctx}\n\n## Archivos que puedes escribir\n${escribible}\n\n## Instrucciones\n\n${t.instrucciones}`;
}

// ---------- una tarea ----------

function contextoDe(t) {
  const archivos = [...new Set(['CLAUDE.md', `${DIR}/CONTEXTO.md`, ...t.contexto].flatMap(expandir))];
  const chars = archivos.reduce((s, f) => s + statSync(f).size, 0);
  if (chars > MAX_CONTEXTO_CHARS) throw new Error(`Contexto demasiado grande (${chars} caracteres, máximo ${MAX_CONTEXTO_CHARS}): reduce "contexto" en la tarea ${t.id}`);
  return { archivos, chars };
}

async function hacer(t, estado) {
  const { archivos, chars } = contextoDe(t);
  log(`Tarea ${t.id}: ${t.titulo} (${t.modo}; ${archivos.length} archivos, ~${Math.ceil(chars / 3)} tokens de contexto)`);
  const sistema = t.modo === 'documento' ? SISTEMA_DOCUMENTO : SISTEMA_CODIGO;
  const mensajes = [{ role: 'system', content: sistema }, { role: 'user', content: mensajeInicial(t, archivos) }];
  let costo = 0;
  const notas = [];

  if (t.modo === 'documento') {
    const r = await llamar(mensajes, t.esfuerzo, t.id);
    costo += r.usd;
    if (r.finish === 'length') throw new Error('El documento se cortó por max_tokens');
    const destino = t.salida[0];
    if (!puedeEscribir(destino, t.salida)) throw new Error(`Destino no permitido: ${destino}`);
    writeFileSync((mkdirSync(dirname(destino), { recursive: true }), destino), r.texto.trim() + '\n');
    const commit = confirmar(t, [destino]);
    return { costo, commit, archivos: [destino], notas };
  }

  let respuesta = await llamar(mensajes, t.esfuerzo, t.id);
  costo += respuesta.usd;
  for (let ronda = 0; ; ronda++) {
    const a = aplicar(respuesta.texto, t.salida);
    notas.push(...a.notas);
    if (respuesta.finish === 'length') a.errores.push('Tu respuesta se cortó por el límite de salida: divide el trabajo en archivos más chicos y entrega lo esencial primero.');
    if (a.nArchivos === 0 && a.errores.length === 0) a.errores.push('No entregaste ningún bloque @@ARCHIVO ni @@EDITAR.');
    let problema = a.errores.length ? `Errores al aplicar tu respuesta:\n- ${a.errores.join('\n- ')}` : '';
    if (!problema) {
      const v = verificar();
      if (v.ok) {
        const rutas = [...tocados.keys()];
        const commit = confirmar(t, rutas);
        tocados.clear();
        return { costo, commit, archivos: rutas, notas };
      }
      problema = v.salida;
    }
    if (ronda >= MAX_REPARACIONES) {
      deshacer();
      throw new Error(`No quedó en verde tras ${MAX_REPARACIONES} reparaciones. Último problema:\n${recortar(problema, 1500)}`);
    }
    log(`  Ronda ${ronda + 1} de reparación`);
    const estadoArchivos = [...tocados.keys()].filter((r) => existsSync(r)).map((r) => `=== ${r} (estado actual) ===\n${recortar(readFileSync(r, 'utf8'), 40_000)}`).join('\n\n');
    mensajes.push({ role: 'assistant', content: respuesta.texto }, { role: 'user', content: `${problema}\n\nCorrige y responde con los bloques necesarios (@@ARCHIVO para reemplazar archivos completos o @@EDITAR). Lo ya aplicado sigue aplicado.\n\n${estadoArchivos}` });
    respuesta = await llamar(mensajes, t.esfuerzo, t.id);
    costo += respuesta.usd;
  }
}

// ---------- principal ----------

function anotarAvance(t, r, extra = '') {
  const gasto = leerJson(GASTO, { totalUsd: 0 }).totalUsd;
  const linea = `\n## ${t.id} ${t.titulo}: ${r.estado}\n- Fecha: ${new Date().toISOString()}\n- Costo de esta tarea: ${(r.costo ?? 0).toFixed(3)} USD (acumulado de construcción: ${gasto.toFixed(2)} de ${TOPE_USD})\n${r.commit ? `- Commit: ${r.commit}\n` : ''}${r.archivos?.length ? `- Archivos: ${r.archivos.join(', ')}\n` : ''}${r.motivo ? `- Motivo: ${r.motivo}\n` : ''}${(r.notas ?? []).map((n) => `- Nota de Muse: ${n.replace(/\n/g, ' ')}`).join('\n')}${extra}\n`;
  if (!existsSync(AVANCE)) writeFileSync(AVANCE, '# Avance de la construcción delegada a Muse\n\nLo escribe scripts/muse-construir.mjs. Revisar cada commit "[muse]" antes de darlo por bueno.\n');
  appendFileSync(AVANCE, linea);
}

async function main() {
  const args = process.argv.slice(2);
  const simular = args.includes('--simular');
  const ids = args.filter((a) => !a.startsWith('--'));
  const todas = readdirSync(`${DIR}/tareas`).filter((f) => f.endsWith('.md')).sort().map((f) => leerTarea(`${DIR}/tareas/${f}`));
  const elegidas = ids.length ? todas.filter((t) => ids.some((i) => t.id.startsWith(i))) : args.includes('--cola') ? todas : [];
  if (elegidas.length === 0) return console.log('Uso: node scripts/muse-construir.mjs --cola | <id> [--simular]');
  const estado = leerJson(ESTADO, {});

  if (simular) {
    let total = 0;
    for (const t of elegidas) {
      let ctx;
      try {
        ctx = contextoDe(t);
      } catch (e) {
        console.log(`${t.id} ${t.titulo}: contexto aún no disponible (${e.message.slice(0, 90)})`);
        continue;
      }
      const { archivos, chars } = ctx;
      const peor = ((chars / 3) * PRECIO.entrada + MAX_SALIDA * PRECIO.salida) / 1e6;
      total += peor;
      console.log(`${t.id} ${t.titulo}: ${archivos.length} archivos, ~${Math.ceil(chars / 3)} tokens, peor caso de una llamada ${peor.toFixed(2)} USD; estado: ${estado[t.id]?.estado ?? 'pendiente'}`);
    }
    return console.log(`Suma de peores casos de una llamada por tarea: ${total.toFixed(2)} USD (el tope duro es ${TOPE_USD})`);
  }

  const sucio = git('status', '--porcelain').stdout.split('\n').filter((l) => l && !l.includes('.claude/'));
  if (sucio.length) throw new Error(`El árbol de trabajo tiene cambios sin commit; confirma o descarta antes:\n${sucio.join('\n')}`);

  for (const t of elegidas) {
    if (estado[t.id]?.estado === 'hecha') {
      log(`Tarea ${t.id} ya hecha; se omite`);
      continue;
    }
    const faltan = t.depende.filter((d) => estado[todas.find((x) => x.id.startsWith(d))?.id]?.estado !== 'hecha');
    if (faltan.length) {
      estado[t.id] = { estado: 'omitida', motivo: `depende de ${faltan.join(', ')}` };
      anotarAvance(t, { estado: 'omitida', motivo: estado[t.id].motivo });
      log(`Tarea ${t.id} omitida: ${estado[t.id].motivo}`);
      escribirJson(ESTADO, estado);
      continue;
    }
    try {
      const r = await hacer(t, estado);
      estado[t.id] = { estado: 'hecha', commit: r.commit, costo: r.costo };
      anotarAvance(t, { estado: 'hecha', ...r });
      log(`Tarea ${t.id} hecha${r.commit ? ` (commit ${r.commit})` : ''}`);
    } catch (e) {
      deshacer();
      if (e instanceof TopeError) {
        anotarAvance(t, { estado: 'detenida por el tope de gasto', motivo: e.message });
        escribirJson(ESTADO, estado);
        return log(e.message);
      }
      estado[t.id] = { estado: 'fallida', motivo: e.message };
      anotarAvance(t, { estado: 'fallida', motivo: e.message });
      log(`Tarea ${t.id} fallida: ${e.message.split('\n')[0]}`);
    }
    escribirJson(ESTADO, estado);
  }
  const g = leerJson(GASTO, { totalUsd: 0 });
  log(`Fin. Gasto de construcción acumulado: ${g.totalUsd.toFixed(2)} USD de ${TOPE_USD}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
