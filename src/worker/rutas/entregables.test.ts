// Entregables F5 con Meta simulada y D1 falsa: el estado del taller se arma con el núcleo
// (vistaTaller), sin correr el bucle. Se comprueba elegibilidad, caché por huella y sesión.
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../index';
import type { Bindings } from '../env';
import { d1Falsa } from '../gasto/d1-falsa';
import { MODELOS_POR_OMISION } from '../../config/models';
import type { VistaAgente } from '../../nucleo/agente/tipos';
import type { EntregablesCaso } from '../../nucleo/entregables/tipos';
import { generarEntregables } from '../../nucleo/entregables';
import { pasosPDSA, vistaTaller, vistaTallerN2 } from '../../nucleo/entregables/fixture';

const env = (): Bindings => ({
  DB: d1Falsa(),
  META_API_KEY: 'llave-de-prueba',
  META_API_BASE_URL: 'https://meta.prueba/v1',
  MODEL_AGENT: MODELOS_POR_OMISION.agente,
  MODEL_AGENT_CONTRIBUTOR: MODELOS_POR_OMISION.contributor,
  MODEL_TRANSCRIBE: MODELOS_POR_OMISION.transcripcion,
  DEMO_MODE: 'false',
  TOPE_SESION_USD: '5',
  TOPE_GLOBAL_USD: '50',
});

interface RespuestaEntregables { entregables: EntregablesCaso; desactualizado: boolean }

// `invalidoEn`: esquema que devuelve un puntero inventado (debe ser rechazado por el esquema estricto).
function metaSimulada(op: { invalidoEn?: string } = {}) {
  const responder = (datos: unknown) =>
    new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(datos) } }], usage: { prompt_tokens: 2000, completion_tokens: 500 } }), { status: 200 });
  const f = vi.fn(async (_url: string, init: RequestInit) => {
    const cuerpo = JSON.parse(String(init.body)) as { response_format: { json_schema: { name: string } }; messages: { content: string }[] };
    const nombre = cuerpo.response_format.json_schema.name;
    const punteros = nombre === op.invalidoEn ? ['E9-A99'] : ['E1-A01'];
    // Solo se puede responder por las causas que la tarea indica: el enum estricto de `causa`
    // lo construye el código desde la elegibilidad (p. ej., una descartada no va a verificación).
    const causasEnTarea = [...new Set([...cuerpo.messages.map((m) => m.content).join('\n').matchAll(/^- (C\d+) \(/gm)].map((m) => m[1]))];
    switch (nombre) {
      case 'entregables_verificaciones':
        return responder({
          verificaciones: causasEnTarea.map((causa) => ({
            causa, que_revisar: 'El registro de compras de febrero', con_quien: 'Jefe de taller',
            confirma_si: 'El registro muestra 9,4 días', descarta_si: 'El registro muestra 3 días',
            pasos: pasosPDSA(punteros),
          })),
        });
      case 'entregables_intervenciones':
        return responder({
          acciones: [
            { causa: 'C1', texto: 'Reducir el plazo pactado con el proveedor de herraje', cuadrante: 'reducir', esfuerzo: 'bajo', punteros },
            { causa: 'C1', texto: 'Crear un stock mínimo de herraje crítico', cuadrante: 'crear', esfuerzo: 'medio', punteros: ['E2-A01'] },
          ],
        });
      case 'entregables_indicadores':
        return responder({
          indicadores: [{
            nombre: 'Plazo de entrega del herraje', definicion: 'Días entre pedido y llegada del herraje',
            formula: 'suma de días de espera / número de pedidos', unidad: 'días', linea_base: '9,4 días',
            meta: 'Bajar a 3 días en 2 meses', plazo: '2 meses', frecuencia: 'semanal',
            responsable: 'Jefe de taller', causa: 'C1', punteros,
          }],
        });
      default:
        throw new Error(`Esquema inesperado: ${nombre}`);
    }
  });
  vi.stubGlobal('fetch', f);
  return f;
}

afterEach(() => vi.unstubAllGlobals());

const pedir = (ruta: string, e: Bindings, cookie: string, metodo = 'POST') =>
  app.request(ruta, { method: metodo, headers: { cookie, 'cf-connecting-ip': '203.0.113.9' } }, e);

// Crea un caso por la API y reemplaza su estado en D1 por la vista armada con el núcleo.
async function casoArmado(e: Bindings, n2: boolean) {
  const creado = await app.request('/api/agente', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ caso: 'taller' }) }, e);
  expect(creado.status).toBe(200);
  const cookie = creado.headers.get('set-cookie')!.split(';')[0];
  const { estado } = (await creado.json()) as VistaAgente;
  const armada = n2 ? vistaTallerN2() : vistaTaller();
  armada.estado.id = estado.id;
  // C2 sale descartada de la fixture (juicio no_explica con evidencia): al pasar ese juicio a
  // sin_datos queda incompleta, es decir abierta y solo apta para verificación (no descartada
  // ni elegible para intervenir), que es lo que estos casos necesitan probar.
  for (const j of armada.estado.juicios) if (j.causa === 'C2') j.veredicto = 'sin_datos';
  await e.DB.prepare('UPDATE agentes SET estado = ?1 WHERE id = ?2').bind(JSON.stringify(armada.estado), estado.id).run();
  return { cookie, id: estado.id };
}

describe('rutas de entregables', () => {
  it('genera los entregables del taller resuelto con 3 llamadas, sin intervenir causas N0-N2', async () => {
    const f = metaSimulada();
    const e = env();
    const { cookie, id } = await casoArmado(e, false);

    const r = await pedir(`/api/agente/${id}/entregables`, e, cookie);
    expect(r.status).toBe(200);
    const { entregables, desactualizado } = (await r.json()) as RespuestaEntregables;
    expect(desactualizado).toBe(false);
    expect(f.mock.calls.length).toBe(3);
    expect(entregables.costoUsd).toBeGreaterThan(0);
    expect(entregables.costoUsd).toBeLessThan(0.15);
    expect(entregables.demo).toBe(false);
    // C1 es N3 y explica todo: intervención solo sobre C1, con prioridad calculada por código.
    expect(entregables.intervencion?.causa).toBe('C1');
    expect(entregables.intervencion?.acciones.map((a) => a.id)).toEqual(['I1', 'I2']);
    expect(entregables.intervencion?.acciones[0].prioridad).toMatchObject({ impacto: 4, esfuerzo: 'bajo', puntaje: 4, clase: 'alta' });
    expect(entregables.intervencion?.acciones.every((a) => a.causa === 'C1')).toBe(true);
    expect(entregables.intervencion?.matriz).toMatchObject({ reducir: ['I1'], crear: ['I2'] });
    // C2 (N2, incompleta) solo recibe verificación PDSA.
    expect(entregables.verificaciones.map((v) => v.causa)).toEqual(['C2']);
    expect(entregables.verificaciones[0].pasos.map((p) => p.fase)).toEqual(['planear', 'hacer', 'estudiar', 'actuar']);
    expect(entregables.indicadores.map((k) => k.id)).toEqual(['K1']);
    expect(entregables.indicadores[0].smart.completa).toBe(true);
    expect(entregables.informeMarkdown).toContain('# Informe de devolución: Carpintería Velandria');
    expect(entregables.informeMarkdown).toContain('E1-A01');
    expect(entregables.huellaEstado).toBeTruthy();

    // Segunda generación con la misma huella: sin llamadas nuevas.
    const llamadas = f.mock.calls.length;
    const otra = await pedir(`/api/agente/${id}/entregables`, e, cookie);
    expect(otra.status).toBe(200);
    expect(f.mock.calls.length).toBe(llamadas);

    // GET devuelve lo guardado, sin desactualizar.
    const get = await pedir(`/api/agente/${id}/entregables`, e, cookie, 'GET');
    expect(get.status).toBe(200);
    expect(((await get.json()) as RespuestaEntregables).desactualizado).toBe(false);
  });

  it('con la causa principal en N2 solo llama a verificación y no propone intervención', async () => {
    const f = metaSimulada();
    const e = env();
    const { cookie, id } = await casoArmado(e, true);
    const r = await pedir(`/api/agente/${id}/entregables`, e, cookie);
    expect(r.status).toBe(200);
    const { entregables } = (await r.json()) as RespuestaEntregables;
    expect(f.mock.calls.length).toBe(1);
    expect(entregables.intervencion).toBeNull();
    expect(entregables.motivoSinIntervencion).toContain('N2');
    expect(entregables.verificaciones.length).toBeGreaterThan(0);
    expect(entregables.indicadores).toEqual([]);
  });

  it('una propuesta con un id inventado se rechaza y no se guarda nada', async () => {
    metaSimulada({ invalidoEn: 'entregables_intervenciones' });
    const e = env();
    const { cookie, id } = await casoArmado(e, false);
    const r = await pedir(`/api/agente/${id}/entregables`, e, cookie);
    // El enum estricto de punteros rechaza la salida del modelo: error visible, sin guardado.
    expect(r.status).toBe(502);
    const get = await pedir(`/api/agente/${id}/entregables`, e, cookie, 'GET');
    expect(get.status).toBe(404);

    // Y en el núcleo, la misma propuesta queda registrada en rechazos y fuera del plan.
    const vista = vistaTaller();
    const parcial = generarEntregables(vista, {
      verificaciones: [],
      acciones: [{ causa: 'C1', texto: 'Acción con puntero inventado', cuadrante: 'reducir', esfuerzo: 'bajo', punteros: ['E9-A99'] }],
      indicadores: [],
    });
    expect(parcial.intervencion).toBeNull();
    expect(parcial.rechazos).toContainEqual(expect.objectContaining({ motivo: 'puntero_inexistente' }));
  });

  it('otra sesión no ve ni genera los entregables, y GET sin generar es 404', async () => {
    metaSimulada();
    const e = env();
    const { cookie, id } = await casoArmado(e, false);
    const ajena = 'indagora_sesion=00000000-0000-4000-8000-000000000000';
    expect((await pedir(`/api/agente/${id}/entregables`, e, ajena, 'GET')).status).toBe(404);
    expect((await pedir(`/api/agente/${id}/entregables`, e, ajena)).status).toBe(404);
    expect((await pedir(`/api/agente/${id}/entregables`, e, cookie, 'GET')).status).toBe(404);
    await pedir(`/api/agente/${id}/entregables`, e, cookie);
    expect((await pedir(`/api/agente/${id}/entregables`, e, ajena, 'GET')).status).toBe(404);
  });

  it('GET avisa desactualizado cuando el estado cambia tras generar', async () => {
    metaSimulada();
    const e = env();
    const { cookie, id } = await casoArmado(e, false);
    await pedir(`/api/agente/${id}/entregables`, e, cookie);
    // Cambia el estado guardado: se retira la corroboración confirmada y baja el nivel.
    const fila = await e.DB.prepare('SELECT estado FROM agentes WHERE id = ?1').bind(id).first<{ estado: string }>();
    const estado = JSON.parse(fila!.estado) as VistaAgente['estado'];
    estado.confirmadas = [];
    await e.DB.prepare('UPDATE agentes SET estado = ?1 WHERE id = ?2').bind(JSON.stringify(estado), id).run();
    const get = await pedir(`/api/agente/${id}/entregables`, e, cookie, 'GET');
    expect(get.status).toBe(200);
    expect(((await get.json()) as RespuestaEntregables).desactualizado).toBe(true);
  });

  it('en DEMO_MODE sin grabación la generación falla con error visible y no guarda', async () => {
    metaSimulada();
    const e = { ...env(), DEMO_MODE: 'true' };
    const { cookie, id } = await casoArmado(e, false);
    const r = await pedir(`/api/agente/${id}/entregables`, e, cookie);
    expect(r.status).toBe(502);
    expect((await pedir(`/api/agente/${id}/entregables`, e, cookie, 'GET')).status).toBe(404);
  });
});
