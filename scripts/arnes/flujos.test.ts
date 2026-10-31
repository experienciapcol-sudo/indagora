// Condición C con Meta simulada (fetch falso): sin red ni gasto real.
import { expect, it } from 'vitest';
import { d1Falsa } from '../../src/worker/gasto/d1-falsa';
import type { Dependencias } from '../../src/worker/meta/cliente';
import { CASO_TALLER_EVALUACION } from './casos';
import { condicionC } from './flujos';

it('un solo prompt: causa por regex, intervención prematura y cita inválida atrapada', async () => {
  const fetchFalso = (async (_url: unknown, init?: { body?: string }) => {
    const cuerpo = JSON.parse(String(init?.body)) as { response_format: { json_schema: { schema: Record<string, unknown> } } };
    void cuerpo;
    const datos = {
      desviacion: { texto: 'Las entregas llegan tarde', evidencia: [] },
      causa_principal: 'El proveedor de herraje tarda 9.4 días',
      causas: [{ enunciado: 'El proveedor de herraje tarda más', evidencia: [] }],
      intervenciones: [{ causa: 'El proveedor de herraje tarda más', accion: 'Volver al proveedor anterior', evidencia: [] }],
      citas: [{ fuente: 'E2', resumen: 'Tarda nueve días', oraciones: [{ id: 'E2-999', ancla: 'no existe esto' }] }],
    };
    return new Response(JSON.stringify({
      choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(datos) } }],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
  const deps: Dependencias = { env: { META_API_KEY: 'ficticia', META_API_BASE_URL: 'https://ejemplo.invalid/v1' }, db: d1Falsa(), fetch: fetchFalso };
  const r = await condicionC(deps, 'sesion-prueba', CASO_TALLER_EVALUACION);
  expect(r.metricas.causaEncontrada).toBe(true);
  expect(r.metricas.intervencionesPrematuras).toBe(1); // sin nivel por código
  expect(r.metricas.citasInvalidasAtrapadas).toBeGreaterThanOrEqual(1);
  expect(r.metricas.casillasSinOracion).toBe(3); // desviación, causa e intervención sin evidencia
});
