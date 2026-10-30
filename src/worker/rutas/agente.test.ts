// Corre el caso del taller de punta a punta contra una API de Meta simulada: el decisor sigue
// un guion (con un movimiento fuera de orden que el código debe rechazar) y cada herramienta
// responde con ids tomados del enum del esquema que manda el Worker.
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '../index';
import type { Bindings } from '../env';
import { d1Falsa } from '../gasto/d1-falsa';
import { MODELOS_POR_OMISION } from '../../config/models';
import type { RespuestaPaso, VistaAgente } from '../../nucleo/agente/tipos';
import { CASO_TALLER } from '../../nucleo/casos/taller';

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

type Cuerpo = { messages: { content: string }[]; response_format: { json_schema: { name: string; schema: any } } };

// Los enums del esquema: el decisor y las herramientas solo pueden elegir entre ellos.
function enums(schema: any): string[][] {
  const salida: string[][] = [];
  const recorrer = (n: any) => {
    if (n && typeof n === 'object') {
      if (Array.isArray(n.enum)) salida.push(n.enum);
      Object.values(n).forEach(recorrer);
    }
  };
  recorrer(schema);
  return salida;
}

const decisiones = [
  { accion: 'leer_fuentes', fuentes: ['E1', 'E2', 'E3', 'D1'] },
  { accion: 'especificar_es_no_es' }, // fuera de orden: falta la desviación
  { accion: 'enunciar_desviacion' },
  { accion: 'especificar_es_no_es' },
  { accion: 'generar_causas' },
  { accion: 'proponer_intervencion', causa: 'C1' }, // sin probar todavía
  { accion: 'probar_causas' },
];

function metaSimulada(guion: object[] = decisiones, otras: Record<string, unknown> = {}) {
  let n = 0;
  const responder = (datos: unknown) =>
    new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(datos) } }], usage: { prompt_tokens: 2000, completion_tokens: 500 } }), { status: 200 });
  const f = vi.fn(async (_url: string, init: RequestInit) => {
    const cuerpo = JSON.parse(String(init.body)) as Cuerpo;
    const nombre = cuerpo.response_format.json_schema.name;
    const texto = cuerpo.messages.map((m) => m.content).join('\n');
    const c = (t: string, ...evidencia: string[]) => ({ texto: t, evidencia });
    if (nombre in otras) return responder(otras[nombre]);
    switch (nombre) {
      case 'analista': {
        // Las tres primeras oraciones citables de la fuente, cada una como afirmación.
        const lineas = [...texto.matchAll(/^([ED]\d-\d{3}) \[T\d+ · [^\]]+\] (.+)$/gm)].slice(0, 3);
        return responder({
          afirmaciones: lineas.map(([, id, o]) => ({
            oraciones: [{ id, ancla: o.split(' ').slice(0, 4).join(' ') }],
            resumen: 'Resumen neutro.',
            tema: 'tema',
            tipo: 'testimonio_especifico',
            primera_mano: true,
            rasgos: [],
          })),
        });
      }
      case 'corroboracion':
        return responder({ relaciones: [{ a: 'E2-A01', b: 'E2-A02', tipo: 'corrobora' }] }); // misma fuente: se rechaza
      case 'decision': {
        const d = guion[n++] ?? { accion: 'detenerse' };
        return responder({ fuentes: [], causa: 'ninguna', documento: '', justificacion: `Paso ${n}`, punteros: [], ...d });
      }
      case 'desviacion':
        return responder({
          esperado: c('Entregar a tiempo', 'E2-A01'),
          ocurre: c('Closets salen tarde', 'E2-A02'),
          desde_cuando: c('Desde marzo', 'E2-A01'),
          cuanto: c('Mucho'), // sin evidencia: se vacía
          contraste: c('Las mesas salen a tiempo', 'E3-A01'),
          ambito: 'operacion_fisica',
        });
      case 'es_no_es':
        return responder({
          filas: [
            { dimension: 'que', pregunta: 'Qué muebles', es: c('Closets', 'E2-A02'), no_es: c('Mesas', 'E3-A01'), distincion: c('Herraje', 'E3-A02'), cambio: c('Proveedor', 'D1-A03') },
            { dimension: 'cuando', pregunta: 'Desde cuándo', es: c('Desde marzo', 'E2-A01'), no_es: c('Antes', 'D1-A01'), distincion: c(''), cambio: c('') },
          ],
        });
      case 'causas':
        return responder({
          causas: [
            { enunciado: 'El herraje del proveedor nuevo tarda más', espina: 'materiales', origen: ['R1'], evidencia: ['D1-A03'] },
            { enunciado: 'El personal trabaja lento', espina: 'mano_de_obra', origen: [], evidencia: ['E1-A01'] },
          ],
        });
      case 'prueba':
        return responder({
          juicios: [
            { causa: 'C1', fila: 'R1', veredicto: 'explica', razon: 'Solo lo que lleva herraje', evidencia: ['E3-A02'] },
            { causa: 'C1', fila: 'R2', veredicto: 'explica', razon: 'Empieza con el cambio', evidencia: ['D1-A03'] },
            { causa: 'C2', fila: 'R1', veredicto: 'no_explica', razon: 'Las mesas salen', evidencia: ['E3-A01'] },
            { causa: 'C2', fila: 'R2', veredicto: 'explica', razon: 'Sin evidencia', evidencia: [] },
          ],
        });
      default:
        throw new Error(`Esquema inesperado: ${nombre} (${enums(cuerpo.response_format.json_schema.schema).length} enums)`);
    }
  });
  vi.stubGlobal('fetch', f);
  return f;
}

afterEach(() => vi.unstubAllGlobals());

const pedir = (ruta: string, e: Bindings, cookie: string, cuerpo?: unknown) =>
  app.request(ruta, { method: 'POST', headers: { 'content-type': 'application/json', cookie, 'cf-connecting-ip': '203.0.113.9' }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) }, e);

describe('agente de punta a punta', () => {
  it('resuelve el caso del taller con rechazos visibles y se detiene por el criterio del código', async () => {
    metaSimulada();
    const e = env();
    const creado = await app.request('/api/agente', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ caso: 'taller' }) }, e);
    expect(creado.status).toBe(200);
    const cookie = creado.headers.get('set-cookie')!.split(';')[0];
    let vista = (await creado.json()) as VistaAgente;
    const id = vista.estado.id;

    for (let i = 0; i < 12 && !vista.estado.terminado; i++) {
      const r = await pedir(`/api/agente/${id}/paso`, e, cookie);
      expect(r.status).toBe(200);
      vista = ((await r.json()) as RespuestaPaso).vista;
    }

    const { estado, criterio, causas } = vista;
    expect(estado.terminado?.motivo).toBe('criterio');
    expect(criterio).toMatchObject({ cumplido: true, principal: 'C1' });
    expect(causas.map((c) => [c.id, c.nivel, c.estado])).toEqual([
      ['C1', 4, 'explica_todo'],
      ['C2', 2, 'descartada'],
    ]);
    expect(estado.seleccion?.ruta).toBe('aguda');
    expect(estado.desviacion?.cuanto).toEqual({ texto: '', evidencia: [] });

    const rechazos = estado.traza.filter((ev) => ev.tipo === 'rechazo');
    expect(rechazos.map((r) => (r.tipo === 'rechazo' ? `${r.origen}:${r.motivo}` : ''))).toEqual([
      'evidencia:relacion_invalida',
      'guarda:fase_previa',
      'evidencia:casilla_sin_evidencia',
      'guarda:fase_previa',
      'evidencia:juicio_sin_evidencia',
    ]);
    expect(estado.presupuesto.pasos).toBe(7);
    expect(estado.presupuesto.usd).toBeGreaterThan(0);
    expect(estado.traza.at(-1)).toMatchObject({ tipo: 'fin', motivo: 'criterio' });

    // Terminado: un paso más no llama a la API.
    const llamadas = vi.mocked(fetch).mock.calls.length;
    const otro = await pedir(`/api/agente/${id}/paso`, e, cookie);
    expect(((await otro.json()) as RespuestaPaso).nuevos).toEqual([]);
    expect(vi.mocked(fetch).mock.calls.length).toBe(llamadas);
  });

  it('una corrida que termina bien queda grabada y DEMO_MODE la reproduce sin llamar a la API', async () => {
    metaSimulada();
    const e = env();
    const correr = async (amb: Bindings) => {
      const creado = await app.request('/api/agente', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ caso: 'taller' }) }, amb);
      const cookie = creado.headers.get('set-cookie')!.split(';')[0];
      let vista = (await creado.json()) as VistaAgente;
      for (let i = 0; i < 12 && !vista.estado.terminado; i++) vista = ((await (await pedir(`/api/agente/${vista.estado.id}/paso`, amb, cookie)).json()) as RespuestaPaso).vista;
      return vista;
    };
    const real = await correr(e);
    expect(real.estado.terminado?.motivo).toBe('criterio');
    expect(await e.DB.prepare('SELECT count(*) AS n FROM grabaciones_caso').first()).toEqual({ n: 0 });

    const llamadas = vi.mocked(fetch).mock.calls.length;
    const demo = await correr({ ...e, DEMO_MODE: 'true' });
    expect(vi.mocked(fetch).mock.calls.length).toBe(llamadas);
    expect(demo.estado.terminado?.motivo).toBe('criterio');
    expect(demo.estado.traza.map((ev) => ev.tipo)).toEqual(real.estado.traza.map((ev) => ev.tipo));
    expect(demo.estado.presupuesto.usd).toBe(0);
  });

  it('otra sesión no ve ni mueve el caso, y dos pasos a la vez no corren', async () => {
    metaSimulada();
    const e = env();
    const creado = await app.request('/api/agente', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ caso: 'taller' }) }, e);
    const cookie = creado.headers.get('set-cookie')!.split(';')[0];
    const { estado } = (await creado.json()) as VistaAgente;
    const ajena = await pedir(`/api/agente/${estado.id}/paso`, e, 'indagora_sesion=00000000-0000-4000-8000-000000000000');
    expect(ajena.status).toBe(404);

    const [a, b] = await Promise.all([pedir(`/api/agente/${estado.id}/paso`, e, cookie), pedir(`/api/agente/${estado.id}/paso`, e, cookie)]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
  });

  it('solo confirma corroboraciones que el código dejó pendientes', async () => {
    metaSimulada();
    const e = env();
    const creado = await app.request('/api/agente', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ caso: 'taller' }) }, e);
    const cookie = creado.headers.get('set-cookie')!.split(';')[0];
    const { estado } = (await creado.json()) as VistaAgente;
    const r = await pedir(`/api/agente/${estado.id}/confirmar`, e, cookie, { clave: 'E1-A01|E2-A01', confirmada: true });
    expect(r.status).toBe(400);
  });

  it('sin contraste toma la ruta crónica: Weisbord, Ishikawa con sus casillas y prueba contra las brechas', async () => {
    const c = (t: string, ...evidencia: string[]) => ({ texto: t, evidencia });
    metaSimulada(
      [
        { accion: 'leer_fuentes', fuentes: ['E1', 'E2'] },
        { accion: 'enunciar_desviacion' },
        { accion: 'especificar_es_no_es' }, // la regla no lo eligió
        { accion: 'barrer_weisbord' },
        { accion: 'generar_causas' },
        { accion: 'probar_causas' },
      ],
      {
        desviacion: { esperado: c('Entregar a tiempo', 'E2-A01'), ocurre: c('Entregas tarde', 'E1-A02'), desde_cuando: c(''), cuanto: c(''), contraste: c(''), ambito: 'organizacional' },
        weisbord: {
          casillas: [
            { casilla: 'relaciones', estado: 'brecha', hallazgo: c('Compras no avisa al taller', 'E2-A02') },
            { casilla: 'liderazgo', estado: 'brecha', hallazgo: c('La dueña culpa al taller', 'E1-A01') },
            { casilla: 'recompensas', estado: 'sin_brecha', hallazgo: c('') },
          ],
        },
        causas: {
          causas: [
            { enunciado: 'Compras y taller no se coordinan', espina: 'relaciones', origen: ['W-relaciones'], evidencia: ['E2-A02'] },
            { enunciado: 'Falta de supervisión', espina: 'liderazgo', origen: [], evidencia: ['E1-A01'] },
          ],
        },
        prueba: {
          juicios: [
            { causa: 'C1', fila: 'W-relaciones', veredicto: 'explica', razon: 'r', evidencia: ['E2-A02'] },
            { causa: 'C1', fila: 'W-liderazgo', veredicto: 'explica', razon: 'r', evidencia: ['E1-A01'] },
            { causa: 'C2', fila: 'W-relaciones', veredicto: 'no_explica', razon: 'r', evidencia: ['E2-A03'] },
          ],
        },
      },
    );
    const e = env();
    const fuentes = CASO_TALLER.fuentes.slice(0, 2);
    const creado = await app.request('/api/agente', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ titulo: 'Crónico', objetivo: 'Entender', fuentes }) }, e);
    expect(creado.status).toBe(200);
    const cookie = creado.headers.get('set-cookie')!.split(';')[0];
    let vista = (await creado.json()) as VistaAgente;
    for (let i = 0; i < 8 && !vista.estado.terminado; i++) vista = ((await (await pedir(`/api/agente/${vista.estado.id}/paso`, e, cookie)).json()) as RespuestaPaso).vista;

    const { estado } = vista;
    expect(estado.seleccion).toMatchObject({ ruta: 'cronica', espinas: 'weisbord' });
    expect(estado.traza.find((ev) => ev.tipo === 'rechazo' && ev.origen === 'guarda')).toMatchObject({ motivo: 'herramienta_no_elegida' });
    expect(vista.causas.map((x) => [x.id, x.estado, x.filasTotales])).toEqual([
      ['C1', 'explica_todo', 2],
      ['C2', 'descartada', 2],
    ]);
    // Solo dos entrevistas sin corroborar: C1 queda en N2 y el criterio no se cumple.
    expect(vista.criterio.cumplido).toBe(false);
    expect(vista.criterio.faltantes.join(' ')).toContain('C1 tiene N2');
  });

  it('sin documento entrega en espera del consultor; al confirmar la corroboración el código cierra sin llamar al modelo', async () => {
    metaSimulada(
      [
        { accion: 'leer_fuentes', fuentes: ['E1', 'E2', 'E3'] },
        { accion: 'enunciar_desviacion' },
        { accion: 'especificar_es_no_es' },
        { accion: 'generar_causas' },
        { accion: 'probar_causas' },
        { accion: 'detenerse' },
      ],
      {
        corroboracion: { relaciones: [{ a: 'E2-A02', b: 'E3-A02', tipo: 'corrobora' }] },
        es_no_es: {
          filas: [
            { dimension: 'que', pregunta: 'Qué', es: { texto: 'Closets', evidencia: ['E2-A02'] }, no_es: { texto: 'Mesas', evidencia: ['E3-A01'] }, distincion: { texto: '', evidencia: [] }, cambio: { texto: '', evidencia: [] } },
            { dimension: 'cuando', pregunta: 'Cuándo', es: { texto: 'Desde marzo', evidencia: ['E2-A01'] }, no_es: { texto: 'Antes', evidencia: ['E2-A03'] }, distincion: { texto: '', evidencia: [] }, cambio: { texto: '', evidencia: [] } },
          ],
        },
        causas: {
          causas: [
            { enunciado: 'El herraje del proveedor nuevo tarda más', espina: 'materiales', origen: ['R1'], evidencia: ['E2-A02'] },
            { enunciado: 'El personal trabaja lento', espina: 'mano_de_obra', origen: [], evidencia: ['E1-A01'] },
          ],
        },
        prueba: {
          juicios: [
            { causa: 'C1', fila: 'R1', veredicto: 'explica', razon: 'r', evidencia: ['E3-A02'] },
            { causa: 'C1', fila: 'R2', veredicto: 'explica', razon: 'r', evidencia: ['E2-A01'] },
            { causa: 'C2', fila: 'R1', veredicto: 'no_explica', razon: 'r', evidencia: ['E3-A01'] },
          ],
        },
      },
    );
    const e = env();
    const creado = await app.request('/api/agente', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ caso: 'taller', fuentes: ['E1', 'E2', 'E3'] }) }, e);
    const cookie = creado.headers.get('set-cookie')!.split(';')[0];
    let vista = (await creado.json()) as VistaAgente;
    expect(vista.estado.fuentes.map((f) => f.id)).toEqual(['E1', 'E2', 'E3']);
    for (let i = 0; i < 8 && !vista.estado.terminado; i++) vista = ((await (await pedir(`/api/agente/${vista.estado.id}/paso`, e, cookie)).json()) as RespuestaPaso).vista;
    expect(vista.estado.terminado?.motivo).toBe('espera');
    expect(vista.estado.terminado?.detalle).toContain('Confirmar la corroboración E2-A02 con E3-A02');

    const confirmado = await pedir(`/api/agente/${vista.estado.id}/confirmar`, e, cookie, { clave: 'E2-A02|E3-A02', confirmada: true });
    vista = (await confirmado.json()) as VistaAgente;
    expect(vista.estado.terminado).toBeNull();
    expect(vista.criterio.cumplido).toBe(true);

    const llamadas = vi.mocked(fetch).mock.calls.length;
    const r = (await (await pedir(`/api/agente/${vista.estado.id}/paso`, e, cookie)).json()) as RespuestaPaso;
    expect(r.vista.estado.terminado?.motivo).toBe('criterio');
    expect(vi.mocked(fetch).mock.calls.length).toBe(llamadas);
  });

  it('la indicación del consultor llega al decisor y queda en la traza; la guarda revisa igual', async () => {
    const f = metaSimulada();
    const e = env();
    const creado = await app.request('/api/agente', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ caso: 'taller' }) }, e);
    const cookie = creado.headers.get('set-cookie')!.split(';')[0];
    const { estado } = (await creado.json()) as VistaAgente;
    await pedir(`/api/agente/${estado.id}/paso`, e, cookie, {}); // lee las fuentes
    const r = await pedir(`/api/agente/${estado.id}/paso`, e, cookie, { indicacion: 'La dueña quiere ya un plan para el personal.' });
    const { nuevos } = (await r.json()) as RespuestaPaso;
    expect(nuevos.map((ev) => ev.tipo)).toEqual(['indicacion', 'decision', 'rechazo']);
    const ultimo = JSON.parse(String(f.mock.calls.at(-1)![1].body)) as Cuerpo;
    expect(ultimo.messages.at(-1)!.content).toContain('Indicación del consultor para este paso: "La dueña quiere ya un plan para el personal."');
    expect((await pedir(`/api/agente/${estado.id}/paso`, e, cookie, { indicacion: 'x'.repeat(301) })).status).toBe(400);
  });

  it('rechaza un caso sin fuentes', async () => {
    const r = await app.request('/api/agente', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ titulo: 'x', objetivo: 'y', fuentes: [] }) }, env());
    expect(r.status).toBe(400);
  });
});
