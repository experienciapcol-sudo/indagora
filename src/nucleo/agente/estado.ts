// Estado del caso: creación, niveles y la vista calculada que reciben la interfaz y el decisor.
import { calcularNiveles } from '../niveles';
import type { FuenteEntrada, NivelCalculado } from '../tipos';
import { criterioDeParo, evaluarCausas } from './criterio';
import type { Decision, EstadoAgente, EventoTraza, Presupuesto, VistaAgente } from './tipos';

// Topes por caso. El tope de gasto por sesión del Worker se aplica además de estos.
export const PRESUPUESTO_POR_OMISION: Omit<Presupuesto, 'pasos' | 'usd' | 'dias'> = { pasosMax: 20, usdMax: 0.4, diasMax: 3 };

export function crearEstado(p: { id: string; titulo: string; objetivo: string; fuentes: FuenteEntrada[] }): EstadoAgente {
  return {
    version: 1,
    id: p.id,
    titulo: p.titulo,
    objetivo: p.objetivo,
    fuentes: p.fuentes,
    lecturas: {},
    afirmaciones: [],
    confirmadas: [],
    desviacion: null,
    seleccion: null,
    esNoEs: null,
    weisbord: null,
    causas: [],
    juicios: [],
    verificaciones: [],
    intervenciones: [],
    solicitudes: [],
    presupuesto: { ...PRESUPUESTO_POR_OMISION, pasos: 0, usd: 0, dias: 0 },
    hechas: [],
    traza: [],
    terminado: null,
  };
}

export const nivelesDe = (e: EstadoAgente): Map<string, NivelCalculado> => calcularNiveles(e.afirmaciones, new Set(e.confirmadas));

export function vistaDe(e: EstadoAgente, gasto: VistaAgente['gasto']): VistaAgente {
  const niveles = nivelesDe(e);
  const causas = evaluarCausas(e, niveles);
  return { estado: e, niveles: Object.fromEntries(niveles), causas, criterio: criterioDeParo(e, causas), gasto };
}

export const leidas = (e: EstadoAgente) => Object.keys(e.lecturas).length;

// Firma de una acción con sus parámetros: dos decisiones con la misma firma son la misma acción.
export function firmaDe(d: Pick<Decision, 'accion' | 'fuentes' | 'causa' | 'documento'>): string {
  switch (d.accion) {
    case 'leer_fuentes':
      return `${d.accion}:${[...d.fuentes].sort().join(',')}`;
    case 'disenar_verificacion':
    case 'proponer_intervencion':
      return `${d.accion}:${d.causa ?? ''}`;
    case 'solicitar_documento':
      return `${d.accion}:${d.documento.trim().toLowerCase()}`;
    default:
      return d.accion;
  }
}

// Rehacer un paso del método deja sin base lo construido sobre él: las causas salen de la
// especificación (y sus juicios apuntan a filas que se renumeran), y la especificación sale de
// la ruta que eligió la desviación. Se borra lo de abajo y se olvida que se hizo, para rehacerlo.
const ABAJO = {
  especificacion: ['especificar_es_no_es', 'barrer_weisbord', 'generar_causas', 'probar_causas', 'disenar_verificacion', 'proponer_intervencion'],
  causas: ['generar_causas', 'probar_causas', 'disenar_verificacion', 'proponer_intervencion'],
} as const;

export function invalidarDesde(e: EstadoAgente, desde: keyof typeof ABAJO): void {
  if (desde === 'especificacion') {
    e.esNoEs = null;
    e.weisbord = null;
  }
  e.causas = [];
  e.juicios = [];
  e.verificaciones = [];
  e.intervenciones = [];
  const acciones: readonly string[] = ABAJO[desde];
  e.hechas = e.hechas.filter((h) => !acciones.includes(h.firma.split(':')[0]));
}

// Agrega un evento a la traza con su número consecutivo.
type SinNumero<T> = T extends unknown ? Omit<T, 'n'> : never;
export function anotar(e: EstadoAgente, ev: SinNumero<EventoTraza>): EventoTraza {
  const completo = { ...ev, n: e.traza.length + 1 } as EventoTraza;
  e.traza.push(completo);
  return completo;
}
