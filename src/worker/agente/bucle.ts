// Un paso del bucle del agente: el modelo propone un movimiento, las guardas del código lo
// aprueban o lo rechazan, se ejecuta y se revisa el criterio de paro. Cada paso es una petición
// HTTP; el estado vive en D1, así que el código es la única autoridad sobre lo que pasó.
import { criterioDeParo, esperaDelConsultor, evaluarCausas } from '../../nucleo/agente/criterio';
import { anotar, firmaDe, leidas, nivelesDe } from '../../nucleo/agente/estado';
import { revisarDecision } from '../../nucleo/agente/guardas';
import type { Decision, EstadoAgente, EventoTraza, Terminado } from '../../nucleo/agente/tipos';
import { ErrorAnalisis } from '../analista/analista';
import { resumen, TopeAlcanzado } from '../gasto/gasto';
import { ErrorMeta, type Dependencias } from '../meta/cliente';
import { decidir, ejecutar, type Contexto } from './ejecutores';

// Tres errores seguidos de la API terminan el caso: seguir solo gastaría pasos.
const MAX_ERRORES_SEGUIDOS = 3;

function contexto(deps: Dependencias, sesion: string, e: EstadoAgente, indicacion: string | null = null): Contexto {
  const niveles = nivelesDe(e);
  const causas = evaluarCausas(e, niveles);
  return { deps, sesion, e, niveles, causas, criterio: criterioDeParo(e, causas), indicacion };
}

function terminar(e: EstadoAgente, motivo: Terminado['motivo'], detalle: string) {
  e.terminado = { motivo, detalle };
  anotar(e, { paso: e.presupuesto.pasos, tipo: 'fin', motivo, detalle });
}

const parametros = (d: Decision) =>
  [d.fuentes.length ? `fuentes: ${d.fuentes.join(', ')}` : '', d.causa ? `causa: ${d.causa}` : '', d.documento ? `documento: ${d.documento}` : ''].filter(Boolean).join('; ');

// Modifica `e` y devuelve los eventos nuevos de la traza. `indicacion`: lo que el consultor le
// pide al agente para este paso; el movimiento que salga pasa por las mismas guardas.
export async function darPaso(deps: Dependencias, sesion: string, e: EstadoAgente, indicacion: string | null = null): Promise<EventoTraza[]> {
  if (e.terminado) return [];
  const desde = e.traza.length;
  const p = e.presupuesto;

  // El consultor pudo cumplir lo que faltaba (por ejemplo, al confirmar una corroboración).
  const antes = contexto(deps, sesion, e).criterio;
  if (antes.cumplido) {
    terminar(e, 'criterio', `Criterio de paro cumplido: ${antes.principal} es la causa principal. ${antes.cumplidos.join('; ')}.`);
    return e.traza.slice(desde);
  }
  if (p.pasos >= p.pasosMax || p.usd >= p.usdMax) {
    const c = antes;
    terminar(e, 'presupuesto', `Se acabó el presupuesto del caso (${p.pasos} de ${p.pasosMax} pasos, ${p.usd.toFixed(4)} de ${p.usdMax} USD). Entrega parcial; falta: ${c.faltantes.join('; ') || 'nada'}`);
    return e.traza.slice(desde);
  }
  p.pasos += 1;
  const paso = p.pasos;
  let accion: Decision['accion'] | null = null;
  if (indicacion) anotar(e, { paso, tipo: 'indicacion', texto: indicacion });
  // El gasto del caso se toma de la cuenta de D1: incluye las llamadas que fallaron pero se cobraron.
  const usdAntes = p.usd;
  const sesionAntes = (await resumen(deps.db, sesion)).sesionUsd;

  try {
    const x = contexto(deps, sesion, e, indicacion);
    const inicio = Date.now();
    const { decision, costoUsd: costoDecision, demo: demoDecision } = await decidir(x);
    accion = decision.accion;
    anotar(e, { paso, tipo: 'decision', accion, justificacion: decision.justificacion, punteros: decision.punteros, parametros: parametros(decision) });

    const veredicto = revisarDecision(e, decision, x.causas);
    if (!veredicto.ok) {
      anotar(e, { paso, tipo: 'rechazo', origen: 'guarda', accion, motivo: veredicto.motivo, detalle: veredicto.detalle });
      return e.traza.slice(desde);
    }
    if (decision.accion === 'detenerse') {
      // La guarda solo lo aprueba con el criterio cumplido o si lo que falta depende del consultor.
      const espera = esperaDelConsultor(e, x.causas, x.niveles, x.criterio);
      if (x.criterio.cumplido) terminar(e, 'criterio', `Criterio de paro cumplido: ${x.criterio.principal} es la causa principal.`);
      else terminar(e, 'espera', `Entrega parcial: ${x.criterio.faltantes.join('; ')}. Para seguir, el consultor puede: ${espera.join('; ')}.`);
      return e.traza.slice(desde);
    }

    const r = await ejecutar(x, { ...decision, accion: decision.accion });
    e.hechas.push({ firma: firmaDe(decision), leidas: leidas(e) });
    for (const rc of r.rechazos) anotar(e, { paso, tipo: 'rechazo', accion, ...rc });
    anotar(e, { paso, tipo: 'resultado', accion, resumen: r.resumen, costoUsd: costoDecision + r.costoUsd, ms: Date.now() - inicio, demo: demoDecision || r.demo });

    const despues = contexto(deps, sesion, e).criterio;
    if (despues.cumplido) {
      terminar(e, 'criterio', `Criterio de paro cumplido: ${despues.principal} es la causa principal. ${despues.cumplidos.join('; ')}.`);
    }
  } catch (err) {
    if (err instanceof TopeAlcanzado) {
      terminar(e, 'presupuesto', `${err.message}. Entrega parcial.`);
    } else {
      // Cualquier otro error queda en la traza y el estado se guarda: lo ya pagado no se repite.
      const conocido = err instanceof ErrorMeta || err instanceof ErrorAnalisis;
      if (!conocido) console.error(JSON.stringify({ evento: 'error_paso', mensaje: err instanceof Error ? err.message : String(err) }));
      anotar(e, { paso, tipo: 'error', accion, detalle: conocido ? err.message : 'Error interno al ejecutar el paso' });
      const ultimos = [...new Set(e.traza.map((ev) => ev.paso))].slice(-MAX_ERRORES_SEGUIDOS);
      const seguidos = ultimos.length === MAX_ERRORES_SEGUIDOS && ultimos.every((n) => e.traza.some((ev) => ev.paso === n && ev.tipo === 'error'));
      if (err instanceof ErrorMeta && err.tipo === 'demo') terminar(e, 'error', 'Modo demostración: no hay una corrida grabada para este paso.');
      else if (seguidos) terminar(e, 'error', `${MAX_ERRORES_SEGUIDOS} pasos seguidos con error; el caso se detiene.`);
    }
  } finally {
    const sesionDespues = (await resumen(deps.db, sesion)).sesionUsd;
    p.usd = usdAntes + Math.max(0, sesionDespues - sesionAntes);
  }
  return e.traza.slice(desde);
}
