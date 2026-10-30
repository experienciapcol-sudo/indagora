import { describe, expect, it } from 'vitest';
import { MODELOS_POR_OMISION } from '../../config/models';
import { segmentar } from '../../nucleo/segmentar';
import type { FuenteEntrada, Previa } from '../../nucleo/tipos';
import { d1Falsa } from '../gasto/d1-falsa';
import type { VarsMeta } from '../meta/cliente';
import { analizarFuente, ErrorAnalisis, MAX_CITABLES, mensajesAnalista, salidaAnalista } from './analista';

const fuente: FuenteEntrada = {
  id: 'E2',
  tipo: 'entrevista',
  rol: 'Jefe de taller',
  modalidad: 'transcripcion',
  titulo: 'Entrevista al jefe de taller',
  entrevistador: 'Consultora',
  texto: 'Consultora: ¿Desde cuándo?\nJefe de taller: Desde febrero esperamos el herraje nueve días. Las mesas salen a tiempo.',
};
const previas: Previa[] = [{ id: 'E3-A01', fuente: 'E3', rol: 'Encargada de compras', resumen: 'El proveedor de herraje cambió en febrero.' }];

describe('salidaAnalista', () => {
  it('limita los punteros a las oraciones citables y las referencias a las previas', () => {
    const s = salidaAnalista(['E2-002', 'E2-003'], ['E3-A01']);
    const texto = JSON.stringify(s.jsonSchema);
    expect(texto).toContain('"enum":["E2-002","E2-003"]');
    expect(texto).toContain('"enum":["E3-A01"]');
    expect(texto).not.toContain('E2-001');
  });

  it('sin previas, el esquema no pide corroboraciones y la salida las trae vacías', () => {
    const s = salidaAnalista(['E2-002'], []);
    expect(JSON.stringify(s.jsonSchema)).not.toContain('corrobora');
    const r = s.zod.parse({ afirmaciones: [{ oraciones: [{ id: 'E2-002', ancla: 'a b c' }], resumen: 'x', tema: 't', tipo: 'opinion', primera_mano: true, rasgos: [] }] });
    expect(r.afirmaciones[0]).toMatchObject({ corrobora: [], contradice: [] });
  });
});

describe('mensajesAnalista', () => {
  it('pone las instrucciones fijas primero y muestra las preguntas sin id', () => {
    const { oraciones } = segmentar(fuente);
    const [sistema, usuario] = mensajesAnalista(fuente, oraciones, previas);
    expect(sistema.role).toBe('system');
    expect(sistema.content).not.toContain('E2');
    expect(usuario.content).toContain('[T1 · Consultora · pregunta, sin id] ¿Desde cuándo?');
    expect(usuario.content).toContain('E2-002 [T2 · Jefe de taller] Desde febrero esperamos el herraje nueve días.');
    expect(usuario.content).toContain('E3-A01 (E3 · Encargada de compras): El proveedor de herraje cambió en febrero.');
  });
});

const env: VarsMeta = {
  META_API_KEY: 'llave-de-prueba',
  META_API_BASE_URL: 'https://meta.prueba/v1',
  MODEL_AGENT: MODELOS_POR_OMISION.agente,
  TOPE_SESION_USD: '1',
  TOPE_GLOBAL_USD: '5',
  DEMO_MODE: 'false',
};

function respuestaModelo(contenido: unknown) {
  const cuerpos: any[] = [];
  const f = (async (_url: string, init: RequestInit) => {
    cuerpos.push(JSON.parse(String(init.body)));
    return new Response(
      JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(contenido) } }], usage: { prompt_tokens: 2000, completion_tokens: 500 } }),
      { status: 200 },
    );
  }) as unknown as typeof fetch;
  return { f, cuerpos };
}

describe('analizarFuente', () => {
  it('llama al modelo del agente en low y entrega lo que pasó el verificador', async () => {
    const { f, cuerpos } = respuestaModelo({
      afirmaciones: [
        { oraciones: [{ id: 'E2-002', ancla: 'esperamos el herraje nueve' }], resumen: 'Esperan el herraje más días.', tema: 'herraje', tipo: 'testimonio_especifico', primera_mano: true, rasgos: [], corrobora: ['E3-A01'], contradice: [] },
        { oraciones: [{ id: 'E2-003', ancla: 'las sillas salen tarde' }], resumen: 'Inventada.', tema: 'mesas', tipo: 'testimonio_especifico', primera_mano: true, rasgos: [], corrobora: [], contradice: [] },
      ],
    });
    const r = await analizarFuente({ env, db: d1Falsa(), fetch: f }, { sesion: 's1', fuente, previas });
    expect(cuerpos[0]).toMatchObject({ model: MODELOS_POR_OMISION.agente, reasoning_effort: 'low' });
    expect(r.afirmaciones.map((a) => [a.id, a.cita, a.corrobora])).toEqual([['E2-A01', 'Desde febrero esperamos el herraje nueve días.', ['E3-A01']]]);
    expect(r.rechazos.map((x) => x.motivo)).toEqual(['ancla_no_coincide', 'sin_oraciones_validas']);
    expect(r.oraciones).toHaveLength(3);
    expect(r.costoUsd).toBeGreaterThan(0);
  });

  it('no llama al modelo si la fuente no tiene oraciones citables', async () => {
    const { f, cuerpos } = respuestaModelo({ afirmaciones: [] });
    const soloPreguntas = { ...fuente, texto: 'Consultora: ¿Hola?\nConsultora: ¿Sigue ahí?' };
    await expect(analizarFuente({ env, db: d1Falsa(), fetch: f }, { sesion: 's1', fuente: soloPreguntas, previas: [] })).rejects.toBeInstanceOf(ErrorAnalisis);
    expect(cuerpos).toHaveLength(0);
  });

  it('no llama al modelo si la fuente tiene demasiadas oraciones', async () => {
    const { f, cuerpos } = respuestaModelo({ afirmaciones: [] });
    const larga = { ...fuente, tipo: 'documento' as const, entrevistador: null, texto: Array.from({ length: MAX_CITABLES + 1 }, (_, i) => `Línea ${i}.`).join('\n') };
    await expect(analizarFuente({ env, db: d1Falsa(), fetch: f }, { sesion: 's1', fuente: larga, previas: [] })).rejects.toThrow(/oraciones/);
    expect(cuerpos).toHaveLength(0);
  });

  it('usa una clave de grabación estable para la misma entrada', async () => {
    const db = d1Falsa();
    const contenido = { afirmaciones: [] };
    await analizarFuente({ env, db, fetch: respuestaModelo(contenido).f }, { sesion: 's1', fuente, previas });
    const demo = await analizarFuente({ env: { ...env, DEMO_MODE: 'true' }, db }, { sesion: 's2', fuente, previas });
    expect(demo.demo).toBe(true);
  });
});
