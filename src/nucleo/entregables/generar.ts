// Orquestador puro: recibe la vista y las propuestas ya pedidas al modelo, las revisa y ensambla.
import type { VistaAgente } from '../agente/tipos';
import { aplicarAcciones, aplicarIndicadores, aplicarVerificaciones } from './aplicar';
import { causaPrincipalElegible, motivoSinIntervencionPara } from './elegibilidad';
import { generarGuia } from './guia';
import { generarInformeMarkdown } from './informe';
import { LISTAS_CAMBIO, construirMatriz } from './matriz';
import { calcularPareto } from './pareto';
import type { AccionPropuesta, EntregablesCaso, IndicadorPropuesto, VerificacionPropuesta } from './tipos';

// JSON estable: claves ordenadas en cada nivel, para que la huella no dependa del orden de inserción.
function estable(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(estable).join(',')}]`;
  if (valor && typeof valor === 'object') {
    const entradas = Object.entries(valor as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entradas.map(([k, v]) => `${JSON.stringify(k)}:${estable(v)}`).join(',')}}`;
  }
  return JSON.stringify(valor) ?? 'null';
}

// Huella de TODO lo que alimenta los entregables: el estado completo (afirmaciones con texto,
// tema, rol y especificidad; desviación, Es/No Es, Weisbord, causas con enunciado y evidencia,
// juicios, solicitudes, traza), las causas evaluadas, los niveles y el criterio. Cualquier
// cambio en esos datos invalida lo guardado; el gasto de la vista queda fuera a propósito.
export function huellaDeEstado(vista: VistaAgente): string {
  return estable({
    estado: vista.estado,
    causas: vista.causas,
    niveles: vista.niveles,
    criterio: vista.criterio,
  });
}

export function generarEntregables(
  vista: VistaAgente,
  p: { verificaciones: VerificacionPropuesta[]; acciones: AccionPropuesta[]; indicadores: IndicadorPropuesto[] },
): Omit<EntregablesCaso, 'agenteId' | 'generadoEn' | 'costoUsd' | 'demo'> {
  const ver = aplicarVerificaciones(vista, p.verificaciones);
  const acc = aplicarAcciones(vista, p.acciones);
  const ind = aplicarIndicadores(vista, p.indicadores);
  const rechazos = [...ver.rechazos, ...acc.rechazos, ...ind.rechazos];

  const elegible = causaPrincipalElegible(vista.causas);
  let intervencion: EntregablesCaso['intervencion'] = null;
  let motivoSinIntervencion: string | null = null;
  if (!elegible) motivoSinIntervencion = motivoSinIntervencionPara(vista.causas);
  else if (acc.acciones.length === 0) motivoSinIntervencion = 'Sin acciones válidas tras la revisión del código.';
  else {
    // Si hubiera acciones de más de una causa elegible, el plan se ancla en la principal elegible.
    const acciones = acc.acciones.filter((a) => a.causa === elegible.id);
    if (acciones.length === 0) motivoSinIntervencion = 'Sin acciones válidas tras la revisión del código.';
    else {
      intervencion = {
        causa: elegible.id,
        nivelAlGenerar: elegible.nivel,
        acciones,
        matriz: construirMatriz(acciones),
        listasCambio: LISTAS_CAMBIO,
      };
    }
  }

  const { pareto, motivo: motivoSinPareto } = calcularPareto(
    vista.estado.afirmaciones,
    new Map(Object.entries(vista.niveles)),
  );

  const parcial: EntregablesCaso = {
    version: 1,
    agenteId: vista.estado.id,
    huellaEstado: huellaDeEstado(vista),
    generadoEn: '',
    costoUsd: 0,
    demo: false,
    verificaciones: ver.verificaciones,
    intervencion,
    motivoSinIntervencion: intervencion ? null : motivoSinIntervencion,
    indicadores: ind.indicadores,
    pareto,
    motivoSinPareto,
    guia: generarGuia(vista),
    informeMarkdown: '',
    rechazos,
  };
  parcial.informeMarkdown = generarInformeMarkdown(parcial, vista);
  const { agenteId: _a, generadoEn: _g, costoUsd: _c, demo: _d, ...resto } = parcial;
  return resto;
}
