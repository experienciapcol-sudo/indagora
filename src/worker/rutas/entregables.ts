// Rutas de entregables F5. POST genera (o devuelve lo guardado si la huella no cambió) y GET
// devuelve lo guardado con aviso de desactualización. Misma sesión, candado y límites que el agente.
import { Hono } from 'hono';
import { esCasoPreparado } from '../analista/analista';
import { existeAgente, leerAgente, soltarCandado, tomarCandado } from '../agente/almacen';
import { TopeAlcanzado } from '../gasto/gasto';
import { dentroDelLimite } from '../gasto/limite';
import { publicarGrabaciones, ErrorMeta } from '../meta/cliente';
import { vistaDe } from '../../nucleo/agente/estado';
import { huellaDeEstado } from '../../nucleo/entregables';
import { resumen } from '../gasto/gasto';
import { guardarEntregables, leerEntregables } from '../entregables/almacenEntregables';
import { CostoEntregablesExcedido, generarEntregablesDelCaso } from '../entregables/generador';
import { ipDe, type Ambiente } from './sesion';

const LIMITE_GENERAR = { llamadas: 10, periodoS: 60 };
const ID = /^[0-9a-f-]{36}$/;

export const rutasEntregables = new Hono<Ambiente>();

rutasEntregables.post('/agente/:id/entregables', async (c) => {
  const id = c.req.param('id');
  const sesion = c.get('sesion');
  const db = c.env.DB;
  if (!ID.test(id)) return c.json({ error: 'No existe ese caso en esta sesión.' }, 404);
  if (!(await dentroDelLimite(db, `entregables:${ipDe(c)}`, LIMITE_GENERAR))) return c.json({ error: 'Demasiadas generaciones seguidas; espera un minuto.' }, 429);
  if (!(await tomarCandado(db, id, sesion))) {
    return (await existeAgente(db, id, sesion))
      ? c.json({ error: 'Ya hay un paso en curso para este caso.' }, 409)
      : c.json({ error: 'No existe ese caso en esta sesión.' }, 404);
  }
  try {
    const fila = (await leerAgente(db, id, sesion))!;
    const vista = vistaDe(fila.estado, await resumen(db, sesion));
    const huella = huellaDeEstado(vista);
    const guardados = await leerEntregables(db, id);
    if (guardados && guardados.huellaEstado === huella && c.req.query('regenerar') !== '1') {
      return c.json({ entregables: guardados, desactualizado: false });
    }
    let entregables;
    try {
      entregables = await generarEntregablesDelCaso({ env: c.env, db }, sesion, vista);
    } catch (e) {
      if (e instanceof CostoEntregablesExcedido) return c.json({ error: e.message, costoUsd: e.costoUsd }, 402);
      if (e instanceof TopeAlcanzado) return c.json({ error: 'Tope de gasto alcanzado; no se generaron entregables.' }, 402);
      if (e instanceof ErrorMeta) return c.json({ error: e.message }, 502);
      throw e;
    }
    await guardarEntregables(db, entregables);
    // La corrida grabada incluye los entregables solo si el caso preparado cerró por el criterio.
    if (vista.criterio.cumplido && fila.estado.fuentes.every(esCasoPreparado)) await publicarGrabaciones(db, id);
    return c.json({ entregables, desactualizado: false });
  } finally {
    await soltarCandado(db, id, sesion);
  }
});

rutasEntregables.get('/agente/:id/entregables', async (c) => {
  const id = c.req.param('id');
  const sesion = c.get('sesion');
  const db = c.env.DB;
  const fila = ID.test(id) ? await leerAgente(db, id, sesion) : null;
  if (!fila) return c.json({ error: 'No existe ese caso en esta sesión.' }, 404);
  const entregables = await leerEntregables(db, id);
  if (!entregables) return c.json({ error: 'Aún no hay entregables para este caso.' }, 404);
  const vista = vistaDe(fila.estado, await resumen(db, sesion));
  return c.json({ entregables, desactualizado: entregables.huellaEstado !== huellaDeEstado(vista) });
});
