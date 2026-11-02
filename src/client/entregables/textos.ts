// Textos visibles de los entregables F5. En español, mismo registro que el resto de la interfaz.
import type { Carril, Cuadrante, MotivoSinPareto } from '../../nucleo/entregables/tipos';
import type { ItemGuia, PasoPDSA } from '../../nucleo/entregables/tipos';
import { idioma } from '../idioma';
import { TEXTOS_ENTREGABLES_EN } from './textos.en';

export const TEXTOS_ENTREGABLES_ES = {
  titulo: 'Entregables del diagnóstico',
  ayuda:
    'Plan de verificación, plan de intervención, indicadores, concentración de causas, guía de la siguiente entrevista e informe. Las prioridades y el Pareto los calcula el código; cada elemento apunta a su evidencia.',
  botonGenerar: 'Generar entregables',
  botonRegenerar: 'Volver a generar',
  generando: 'Generando…',
  aunNo: 'Aún no hay entregables',
  aunNoAyuda: 'Cuando el agente termine (por criterio o en espera del consultor) puedes generarlos desde el estado actual.',
  desactualizado: 'Estos entregables ya no corresponden al estado actual: vuelve a generarlos',
  demo: 'Generado en modo demostración, sin costo',
  costo: (usd: number) => `Costo de generación: ${usd !== 0 && Math.abs(usd) < 0.01 ? usd.toFixed(3) : usd.toFixed(2)} USD`,
  generadoEn: (fecha: string) => `Generado: ${fecha}`,
  errorCargar: 'No se pudieron cargar los entregables guardados.',
  errorGenerar: (mensaje: string) => `No se pudieron generar los entregables: ${mensaje}`,
  soloVerificacion: 'Solo verificación',
  soloVerificacionAyuda:
    'Esta causa todavía no admite intervención: primero hay que verificarla y subir su nivel de evidencia (N3 o N4, explicando todas las filas y sin contradicciones).',
  rechazos: (n: number) => `El código rechazó ${n} elemento(s) propuesto(s); quedan registrados en el informe.`,

  verificacion: {
    titulo: 'Plan de verificación',
    ayuda: 'Ciclo PDSA de Deming para cada causa que aún no admite intervención.',
    vacio: 'Sin planes de verificación en esta generación.',
    queRevisar: 'Qué revisar',
    conQuien: 'Con quién',
    confirmaSi: 'Confirma si',
    descartaSi: 'Descarta si',
    nivelEstado: (nivel: number, estado: string) => `N${nivel} · ${estado}`,
  },
  fases: { planear: 'Planear', hacer: 'Hacer', estudiar: 'Estudiar', actuar: 'Actuar' } satisfies Record<PasoPDSA['fase'], string>,

  intervencion: {
    titulo: 'Plan de intervención',
    ayuda: 'Solo interviene una causa con N3 o N4 que explica todas las filas y no tiene contradicciones abiertas.',
    vacio: 'Sin plan de intervención.',
    causa: (id: string, nivel: number) => `Causa ${id} (N${nivel})`,
    prioridad: (clase: string, puntaje: number) => `Prioridad ${clase} · puntaje ${puntaje}`,
    impactoEsfuerzo: (impacto: number, esfuerzo: string, puntos: number) =>
      `Impacto ${impacto} (calculado por código) · esfuerzo ${esfuerzo} (${puntos} punto(s))`,
    razones: 'Cómo lo calculó el código',
    matriz: 'Matriz de las cuatro acciones',
    sinPropuesta: 'sin propuesta',
    listas: 'Listas de verificación del cambio',
    descongelar: 'Descongelar (Lewin; Kotter 1; ADKAR: conciencia)',
    mover: 'Mover (Kotter 2-6; ADKAR: deseo, conocimiento y habilidad)',
    recongelar: 'Recongelar (Lewin; Kotter 7-8; ADKAR: refuerzo)',
  },
  carriles: {
    inmediato: 'Carril inmediato',
    corto_plazo: 'Carril de corto plazo',
    estructural: 'Carril estructural',
  } satisfies Record<Carril, string>,
  cuadrantes: {
    eliminar: 'Eliminar',
    reducir: 'Reducir',
    incrementar: 'Incrementar',
    crear: 'Crear',
  } satisfies Record<Cuadrante, string>,
  prioridades: { alta: 'alta', media: 'media', baja: 'baja' },

  indicadores: {
    titulo: 'Fichas de indicador',
    ayuda: 'Criterios SMART (Doran, 1981). Una ficha incompleta dice qué le falta; no se descarta.',
    vacio: 'Sin fichas de indicador en esta generación.',
    definicion: 'Definición',
    formula: 'Fórmula',
    unidad: 'Unidad',
    lineaBase: 'Línea base',
    sinLineaBase: 'Pendiente: ninguna afirmación la sostiene todavía',
    meta: 'Meta',
    plazo: 'Plazo',
    frecuencia: 'Frecuencia',
    responsable: 'Responsable',
    causa: (id: string) => `Causa ${id}`,
    smartCompleta: 'SMART completa',
    smartIncompleta: (faltan: string) => `SMART incompleta: faltan ${faltan}`,
  },
  frecuencias: { diaria: 'Diaria', semanal: 'Semanal', mensual: 'Mensual' },

  pareto: {
    titulo: 'Concentración de causas (Pareto)',
    ayuda: 'Solo con cifras que el código encuentra literalmente en citas con nivel suficiente. Nunca con cifras de memoria.',
    vacio: 'Sin Pareto en esta generación.',
    total: (total: number, unidad: string) => `Total: ${total} ${unidad}`,
    barra: (categoria: string, valor: number, unidad: string, porcentaje: number, acumulado: number) =>
      `${categoria}: ${valor} ${unidad} (${porcentaje} %, acumulado ${acumulado} %)`,
    porcentaje: (n: number) => `${n} %`,
    acumulado: (n: number) => `acum. ${n} %`,
  },
  motivosSinPareto: {
    sin_cifras_en_citas: 'No hay cifras literales aptas en las citas: el Pareto queda vacío en vez de inventar barras.',
    una_sola_categoria: 'Solo hay una categoría con cifras aptas: no se puede mostrar concentración.',
    unidades_incompatibles: 'Las cifras aptas usan unidades incompatibles entre sí: no se mezclan en un mismo Pareto.',
  } satisfies Record<MotivoSinPareto, string>,

  guia: {
    titulo: 'Guía de la siguiente entrevista',
    ayuda: 'Preguntas de incidente crítico (Flanagan, 1954) dirigidas a quien puede cerrar cada vacío (muestreo teórico).',
    vacio: 'Sin vacíos pendientes registrados.',
    paraQuien: (rol: string) => `Para quién: ${rol}`,
    objetivo: (texto: string) => `Vacío que cierra: ${texto}`,
    tipos: {
      vacio_criterio: 'Vacío del criterio de paro',
      causa_abierta: 'Causa abierta',
      corroboracion_pendiente: 'Corroboración pendiente',
      documento_pedido: 'Documento pedido',
      casilla_vacia: 'Casilla vacía',
    } satisfies Record<ItemGuia['tipo'], string>,
  },

  informe: {
    titulo: 'Informe de devolución',
    ayuda: 'Informe (Block, 1981) ensamblado por el código desde los datos del caso. Lo descargado y lo impreso son el mismo texto.',
    descargar: 'Descargar Markdown',
    imprimir: 'Imprimir / guardar PDF',
    vacio: 'Aún no hay informe: genera primero los entregables.',
  },
};

export type TextosEntregables = typeof TEXTOS_ENTREGABLES_ES;

export const TEXTOS_ENTREGABLES: TextosEntregables =
  idioma === 'en' ? TEXTOS_ENTREGABLES_EN : TEXTOS_ENTREGABLES_ES;
