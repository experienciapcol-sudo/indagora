// Único lugar del código con nombres de modelo y precios. Los nombres se confirman con
// GET /models (ver interno/docs/04-META-API.md) y se pueden cambiar con variables de entorno.

export type Rol = 'agente' | 'contributor' | 'transcripcion';
export type RolTexto = Exclude<Rol, 'transcripcion'>;

// Esfuerzo de razonamiento aceptado por la API. No existe "apagado".
export const ESFUERZOS = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const;
export type Esfuerzo = (typeof ESFUERZOS)[number];

export interface VarsModelos {
  MODEL_AGENT?: string;
  MODEL_AGENT_CONTRIBUTOR?: string;
  MODEL_TRANSCRIBE?: string;
}

export const MODELOS_POR_OMISION: Record<Rol, string> = {
  agente: 'muse-spark-1.3',
  contributor: 'muse-spark-1.3-contributor',
  transcripcion: 'muse-voice-transcribe-1.0',
};

export function modeloPara(env: VarsModelos, rol: Rol): string {
  const deEnv = { agente: env.MODEL_AGENT, contributor: env.MODEL_AGENT_CONTRIBUTOR, transcripcion: env.MODEL_TRANSCRIBE }[rol];
  return deEnv?.trim() || MODELOS_POR_OMISION[rol];
}

// USD por millón de tokens (página de precios de dev.meta.ai, 28 oct 2026).
export interface PrecioTokens {
  entrada: number;
  cache: number;
  salida: number;
}

const PRECIOS: Record<string, PrecioTokens> = {
  'muse-spark-1.3': { entrada: 1.25, cache: 0.15, salida: 4.25 },
  'muse-spark-1.3-contributor': { entrada: 0.1, cache: 0.002, salida: 0.2 },
};

export const PRECIO_HORA_AUDIO_USD = 0.18;

// Sin precio conocido no se llama: el tope de gasto dejaría de ser confiable.
export function precioDe(modelo: string): PrecioTokens {
  const p = PRECIOS[modelo];
  if (!p) throw new Error(`Modelo sin precio registrado en src/config/models.ts: ${modelo}`);
  return p;
}
