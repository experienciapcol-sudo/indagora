// Datos del flujo "Cómo funciona": salen del caso ficticio del taller con el segmentador real,
// así los identificadores que se muestran son los mismos que verá el consultor en la app.
import { CASO_TALLER } from '../../nucleo/casos/taller';
import { segmentar } from '../../nucleo/segmentar';
import type { TipoFuente } from '../../nucleo/tipos';

export interface OracionDeEjemplo {
  id: string;
  hablante: string;
  texto: string;
}

export interface FuenteDeEjemplo {
  id: string;
  rol: string;
  tipo: TipoFuente;
}

// La primera oración de `fuente` que contiene `fragmento`. Falla si el caso cambió y ya no existe.
export function oracionDe(fuente: string, fragmento: string): OracionDeEjemplo {
  const f = CASO_TALLER.fuentes.find((x) => x.id === fuente);
  if (!f) throw new Error(`El caso del taller no tiene la fuente ${fuente}`);
  const o = segmentar(f).oraciones.find((x) => x.texto.includes(fragmento));
  if (!o) throw new Error(`${fuente} no tiene una oración con "${fragmento}"`);
  return { id: o.id, hablante: o.hablante, texto: o.texto };
}

export const FUENTES_EJEMPLO: FuenteDeEjemplo[] = CASO_TALLER.fuentes.map((f) => ({ id: f.id, rol: f.rol, tipo: f.tipo }));

// Las oraciones que cuenta el flujo, en el orden en que aparecen.
export const ORACIONES_EJEMPLO = {
  flojo: oracionDe('E1', 'el taller es flojo'),
  plazoJefe: oracionDe('E2', 'Ahorita llega en nueve o diez días'),
  plazoCompras: oracionDe('E3', 'Brevánez se tarda entre ocho y doce días'),
  registro: oracionDe('D1', 'El promedio de Brevánez'),
  mesas: oracionDe('E2', 'Las mesas de comedor y las bancas'),
} satisfies Record<string, OracionDeEjemplo>;

export type ClaveOracion = keyof typeof ORACIONES_EJEMPLO;
