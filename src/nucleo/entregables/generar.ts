// Orquestador puro: recibe la vista y las propuestas ya pedidas al modelo, las revisa y ensambla.
import type { VistaAgente } from '../agente/tipos';
import { aplicarAcciones, aplicarIndicadores, aplicarVerificaciones } from './aplicar';
import { causaPrincipalElegible, motivoSinIntervencionPara } from './elegibilidad';
import { generarGuia } from './guia';
import { generarInformeMarkdown } from './informe';
import { LISTAS_CAMBIO, construirMatriz } from './matriz';
import { calcularPareto } from './pareto';
import type { AccionPropuesta, EntregablesCaso, IndicadorPropuesto, VerificacionPropuesta } from './tipos';

export function huellaDeEstado(vista: VistaAgente): string {
  const datos = {
    afirmaciones: vista.estado.afirmaciones.map((a) => a.id).sort(),
    niveles: Object.fromEntries(
      Object.entries(vista.niveles)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, n]) => [id, n.nivel]),
    ),
    confirmadas: [...vista.estado.confirmadas].sort(),
    causas: vista.causas
      .map((c) => ({ id: c.id, nivel: c.nivel, estado: c.estado, contradicciones: [...c.contradicciones].sort(), principal: c.principal }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    solicitudes: vista.estado.solicitudes.map((s) => s.id).sort(),
    verificaciones: vista.estado.verificaciones.map((v) => v.causa).sort(),
  };
  return JSON.stringify(datos);
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
