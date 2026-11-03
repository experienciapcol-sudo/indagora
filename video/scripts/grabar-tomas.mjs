// Graba tomas reales de la app local con Playwright (1920x1080, llamadas reales a Meta).
//   node scripts/grabar-tomas.mjs <toma> [url-base]
// Tomas: lab (Laboratorio con voz y asignación de hablantes), e1 (taller con solo E1),
// completo (taller con E1, E2, E3 y D1 hasta el criterio y los entregables), prueba (sin costo).
// Requiere el servidor local con DEMO_MODE=false en .dev.vars. Guarda en public/tomas/.
import { chromium } from 'playwright';
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TALLER_EN } from './taller-en.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const salida = resolve(aqui, '../public/tomas');
const temporal = resolve(aqui, '../.tomas-tmp');
const sesion = resolve(aqui, 'estado-sesion.json');
const audio = resolve(aqui, 'entrevista-ficticia-en.wav');
const toma = process.argv[2];
const base = (process.argv[3] ?? 'http://localhost:5180').replace(/\/$/, '');
const ZOOM = 1.25;
mkdirSync(salida, { recursive: true });
mkdirSync(temporal, { recursive: true });

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const eventos = [];
let t0 = 0;
const marca = (nombre) => {
  const s = Number(((Date.now() - t0) / 1000).toFixed(1));
  eventos.push({ nombre, s });
  console.log(`[${s.toFixed(1)} s] ${nombre}`);
};

const argsChromium = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];
if (toma === 'lab') argsChromium.push(`--use-file-for-fake-audio-capture=${audio}%noloop`);

const navegador = await chromium.launch({ args: argsChromium });
const contexto = await navegador.newContext({
  viewport: { width: 1920, height: 1080 },
  locale: 'en-US',
  permissions: ['microphone'],
  recordVideo: { dir: temporal, size: { width: 1920, height: 1080 } },
  ...(existsSync(sesion) ? { storageState: sesion } : {}),
});

// Cursor visible (el video de Playwright no dibuja el puntero) y zoom para que el texto se lea.
await contexto.addInitScript((zoom) => {
  const iniciar = () => {
    document.documentElement.style.zoom = String(zoom);
    const c = document.createElement('div');
    c.style.cssText = 'position:fixed;z-index:2147483647;width:22px;height:22px;border-radius:50%;background:rgba(20,90,200,.35);border:2px solid #145ac8;pointer-events:none;left:-40px;top:-40px;transform:translate(-50%,-50%);transition:transform .08s;';
    document.body.appendChild(c);
    addEventListener('mousemove', (e) => { c.style.left = e.clientX / zoom + 'px'; c.style.top = e.clientY / zoom + 'px'; }, true);
    addEventListener('mousedown', () => { c.style.transform = 'translate(-50%,-50%) scale(.7)'; }, true);
    addEventListener('mouseup', () => { c.style.transform = 'translate(-50%,-50%)'; }, true);
  };
  if (document.body) iniciar(); else addEventListener('DOMContentLoaded', iniciar);
}, ZOOM);

const pagina = await contexto.newPage();
t0 = Date.now();
pagina.setDefaultTimeout(30_000);

async function mover(x, y) {
  await pagina.mouse.move(x, y, { steps: 25 });
}
async function clic(localizador) {
  await localizador.scrollIntoViewIfNeeded();
  await pausa(350);
  const caja = await localizador.boundingBox();
  if (!caja) throw new Error('Sin caja para hacer clic');
  await mover(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await pausa(250);
  await pagina.mouse.down();
  await pagina.mouse.up();
  await pausa(450);
}
async function suave(localizador, bloque = 'start') {
  await localizador.evaluate((e, b) => e.scrollIntoView({ behavior: 'smooth', block: b }), bloque);
  await pausa(1100);
}
// Recorre la página de arriba abajo con pausas, para que el montaje tenga material de lectura.
async function recorrer(pasos = 10, px = 520, espera = 1300) {
  for (let i = 0; i < pasos; i++) {
    await pagina.mouse.wheel(0, px);
    await pausa(espera);
  }
}
async function arriba() {
  await pagina.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await pausa(1200);
}
async function esperarTexto(patron, ms, etiqueta) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (await pagina.getByText(patron).first().isVisible().catch(() => false)) return true;
    await pausa(1000);
  }
  console.log(`(!) no apareció: ${etiqueta}`);
  return false;
}
const pestana = (nombre) => pagina.getByRole('tab', { name: nombre });

async function abrir() {
  await pagina.goto(`${base}/?lang=en`, { waitUntil: 'networkidle' });
  await pausa(1500);
  marca('app abierta');
}

// ---- tomas ----

async function tomaLab() {
  await abrir();
  await clic(pestana('Laboratorio'));
  await pausa(1500);
  const tarjeta = pagina.getByRole('heading', { name: /Real interview/ });
  await suave(tarjeta, 'start');
  marca('Laboratorio: tarjeta de entrevista real');
  await clic(pagina.getByRole('button', { name: /Record with the microphone/ }));
  marca('grabando con voz');
  await pausa(48_000); // la entrevista ficticia dura 45 s
  await clic(pagina.getByRole('button', { name: /Stop recording/ }));
  marca('grabación detenida');
  await pagina.getByText('Preview').first().waitFor();
  await pausa(1500);
  await clic(pagina.getByRole('button', { name: 'Transcribe the audio' }));
  marca('transcribiendo');
  await esperarTexto(/Transcript ready/, 120_000, 'transcripción lista');
  marca('transcripción lista');
  await pausa(1500);
  const asignador = pagina.getByRole('heading', { name: /Assign a role to each speaker/ });
  await suave(asignador, 'start');
  await pausa(2500);
  const roles = pagina.getByLabel(/Role of this person/);
  const nRoles = await roles.count();
  console.log(`hablantes detectados: ${nRoles}`);
  const nombres = ['Consultant', 'Delivery driver', 'Consultant'];
  for (let i = 0; i < Math.min(nRoles, 3); i++) {
    await clic(roles.nth(i));
    await roles.nth(i).fill('');
    await pagina.keyboard.type(nombres[i], { delay: 60 });
    await pausa(400);
  }
  // Primer hablante: entrevistadora; segundo: persona principal de la entrevista.
  const entrevistadores = pagina.getByRole('radio', { name: 'Is the interviewer' });
  const principales = pagina.getByRole('radio', { name: 'Main person of the interview' });
  await clic(entrevistadores.nth(0));
  await clic(principales.nth(Math.min(nRoles, 2) - 1));
  marca('roles asignados');
  await pausa(2000);
  await suave(pagina.getByRole('heading', { name: 'How the turns come out' }), 'center');
  await pausa(3000);
  await clic(pagina.getByRole('button', { name: 'Create the source with these roles' }));
  marca('fuente creada');
  await pausa(2500);
  // Pasa a Evidencia automáticamente: se ve la fuente de voz ya lista para analizar.
  await pausa(3500);
  await clic(pestana('Laboratorio'));
  await pausa(1000);
  // Notas escritas: se pega la entrevista con la dueña y se asignan los roles (sin costo).
  const pegar = pagina.getByRole('textbox', { name: /paste the interview text/i });
  await suave(pegar, 'center');
  await clic(pegar);
  await pagina.keyboard.insertText(TALLER_EN.fuentes[0].texto);
  await pausa(1800);
  await clic(pagina.getByRole('button', { name: 'Use this text and assign roles' }));
  marca('texto pegado');
  await pausa(1500);
  const roles2 = pagina.getByLabel(/Role of this person/);
  await suave(roles2.first(), 'center');
  await pausa(2000);
  const n2 = await roles2.count();
  console.log('hablantes del texto pegado: ' + n2);
  // Los roles pueden venir ya detectados; se escriben por si faltan.
  for (let i = 0; i < n2; i++) {
    const actual = await roles2.nth(i).inputValue();
    if (!actual) {
      await clic(roles2.nth(i));
      await pagina.keyboard.type(i === 0 ? 'Consultant' : 'Owner', { delay: 60 });
    }
  }
  await pausa(1500);
  await clic(pagina.getByRole('button', { name: 'Create the source with these roles' }).last());
  marca('segunda fuente creada');
  await pausa(3000);
  await recorrer(4, 450, 1500);
  await arriba();
}

async function tomaAgente(ids, presion = false) {
  // El caso del taller en inglés (traducción fiel) entra por la vía de fuentes propias del API.
  await pagina.route('**/api/agente', async (ruta) => {
    const req = ruta.request();
    if (req.method() !== 'POST') return ruta.continue();
    const cuerpo = { titulo: TALLER_EN.titulo, objetivo: TALLER_EN.objetivo, fuentes: TALLER_EN.fuentes.filter((f) => !ids || ids.includes(f.id)) };
    return ruta.continue({ postData: JSON.stringify(cuerpo) });
  });
  await abrir();
  await pausa(1500);
  await clic(pagina.getByRole('button', { name: 'Start with the workshop case' }));
  await pagina.getByText('Agent trace').first().waitFor();
  await pausa(2000);
  marca('agente iniciado');
  const unPaso = pagina.getByRole('button', { name: 'One step' });
  const esperarPaso = async () => {
    await pausa(1500);
    for (let i = 0; i < 180 && !(await unPaso.isEnabled().catch(() => false)); i++) await pausa(1000);
  };
  if (presion) {
    // Cinco pasos normales; después la dueña presiona y el consultor lo pasa como indicación.
    for (let i = 1; i <= 5; i++) {
      await clic(unPaso);
      marca('paso ' + i);
      await esperarPaso();
    }
    const campo = pagina.locator('#indicacion');
    await suave(campo, 'center');
    await clic(campo);
    await pagina.keyboard.type('The owner needs an intervention plan today for the main cause, to make the staff work harder. Propose it now.', { delay: 35 });
    await pausa(1500);
    await clic(unPaso);
    marca('paso con presión de la dueña');
    await esperarPaso();
    await pausa(2500);
  }
  const correr = pagina.getByRole('button', { name: /^(Run|Keep running)$/ });
  if (await correr.isEnabled().catch(() => false)) {
    await clic(correr);
    marca('corriendo');
  }
  const terminado = await esperarTexto(/The agent finished|Partial delivery/, 10 * 60_000, 'agente terminado');
  marca(terminado ? 'agente terminado' : 'TIEMPO AGOTADO');
  await pausa(2500);
  await recorrer(12, 460, 1400);
  marca('recorrido del panel');
  const generar = pagina.getByRole('button', { name: 'Generate deliverables' });
  if (await generar.isVisible().catch(() => false)) {
    await clic(generar);
    marca('generando entregables');
    await esperarTexto(/Generation cost/, 120_000, 'entregables listos');
    marca('entregables listos');
    await pausa(2500);
    await recorrer(10, 500, 1400);
  }
  await pausa(1500);
}

// Retoma un agente ya terminado (id por argumento) y graba solo la generación de entregables.
async function tomaEntregables(id) {
  await contexto.addInitScript((v) => { try { sessionStorage.setItem('indagora-agente', v); } catch { /* sin almacenamiento */ } }, id);
  await abrir();
  await pausa(3000);
  const generar = pagina.getByRole('button', { name: /Generate deliverables|Generate again/ });
  await suave(pagina.getByRole('heading', { name: 'Diagnosis deliverables' }), 'start');
  await pausa(1500);
  await clic(generar);
  marca('generando entregables');
  const ok = await esperarTexto(/Generation cost/, 180_000, 'entregables listos');
  marca(ok ? 'entregables listos' : 'FALLÓ entregables');
  await pausa(2500);
  await recorrer(14, 500, 1500);
  await pausa(1500);
}

async function tomaPrueba() {
  await abrir();
  await clic(pestana('Evidence'));
  await pausa(1500);
  await clic(pagina.getByRole('button', { name: /Load sample case/ }));
  await pausa(1500);
  await recorrer(3, 450, 1200);
}

try {
  if (toma === 'lab') await tomaLab();
  else if (toma === 'e1') await tomaAgente(['E1']);
  else if (toma === 'e1p') await tomaAgente(['E1'], true);
  else if (toma === 'completo') await tomaAgente(null);
  else if (toma === 'entregables') await tomaEntregables(process.argv[4]);
  else if (toma === 'prueba') await tomaPrueba();
  else throw new Error('Uso: node scripts/grabar-tomas.mjs lab|e1|completo|prueba [url-base]');
} catch (e) {
  console.error('FALLÓ:', e.message);
  await pagina.screenshot({ path: join(temporal, `error-${toma}.png`) }).catch(() => undefined);
  process.exitCode = 1;
} finally {
  await pagina.screenshot({ path: join(temporal, `final-${toma}.png`) }).catch(() => undefined);
  await contexto.storageState({ path: sesion }).catch(() => undefined);
  const video = pagina.video();
  await contexto.close();
  if (video) {
    const destino = join(salida, `toma-${toma}.webm`);
    renameSync(await video.path(), destino);
    writeFileSync(join(salida, `toma-${toma}.eventos.json`), JSON.stringify(eventos, null, 2));
    console.log(`Guardado: ${destino}`);
  }
  await navegador.close();
}
