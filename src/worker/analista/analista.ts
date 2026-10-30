// Analista: una llamada a Meta por fuente. El modelo señala afirmaciones con punteros a
// oraciones (enum de ids reales) y un ancla literal; el verificador del núcleo decide qué
// pasa. Las instrucciones fijas van primero para aprovechar la caché de prompts.
import { z } from 'zod';
import { CASO_TALLER } from '../../nucleo/casos/taller';
import { segmentar } from '../../nucleo/segmentar';
import type { Afirmacion, FuenteEntrada, Oracion, Previa, Rechazo, Turno } from '../../nucleo/tipos';
import { verificar, type AfirmacionModelo } from '../../nucleo/verificar';
import { sha256Hex } from '../hash';
import { llamarMeta, type Dependencias, type Mensaje } from '../meta/cliente';
import { definirSalida, enumDe, type Salida } from '../meta/esquema';

// Cambiarla invalida las grabaciones de DEMO_MODE hechas con instrucciones anteriores.
export const VERSION_ANALISTA = 1;
// Muy por debajo del límite de 1,000 valores de enum por esquema (docs de Meta).
export const MAX_CITABLES = 600;
export const MAX_PREVIAS = 200;
// En el caso del taller la salida llegó a 4,739 tokens (2,500 de razonamiento): margen para entrevistas largas.
const MAX_TOKENS = 10_000;

export class ErrorAnalisis extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorAnalisis';
  }
}

type SalidaAnalista = { afirmaciones: AfirmacionModelo[] };


export function salidaAnalista(citables: string[], previas: string[]): Salida<SalidaAnalista> {
  const base = {
    oraciones: z.array(z.object({ id: enumDe(citables), ancla: z.string() })),
    resumen: z.string(),
    tema: z.string(),
    tipo: z.enum(['opinion', 'testimonio_especifico']),
    primera_mano: z.boolean(),
    rasgos: z.array(z.enum(['deseabilidad', 'defensa'])),
  };
  // Sin previas no hay a qué apuntar: el esquema no pide corroboraciones (un enum vacío no es válido).
  const afirmacion =
    previas.length > 0
      ? (() => {
          // Un solo enum para las dos listas: definirSalida lo deja una vez en $defs.
          const referencias = z.array(enumDe(previas));
          return z.object({ ...base, corrobora: referencias, contradice: referencias });
        })()
      : z.object(base).transform((a) => ({ ...a, corrobora: [] as string[], contradice: [] as string[] }));
  return definirSalida('analista', z.object({ afirmaciones: z.array(afirmacion) }) as unknown as z.ZodType<SalidaAnalista>);
}

const INSTRUCCIONES = `Eres el analista de evidencia de Indagora, una herramienta para consultores en administración que diagnostican problemas de organizaciones. Recibes una fuente (una entrevista o un documento) partida en oraciones con identificador. Tu trabajo es extraer las afirmaciones útiles para el diagnóstico y señalar en qué oraciones se apoya cada una.

Reglas:
1. Nunca escribes citas. Señalas cada oración por su id y copias un ancla: de 3 a 8 palabras seguidas, copiadas exactamente de esa oración, o la oración completa si es más corta.
2. Solo puedes señalar oraciones con id. Las líneas marcadas "pregunta, sin id" son del entrevistador y no son evidencia.
3. Una afirmación expresa una sola idea: un hecho narrado o un juicio. Se apoya en 1 a 4 oraciones de un mismo hablante. Si hay dos ideas, son dos afirmaciones.
4. tipo: "testimonio_especifico" si narra un hecho concreto (qué pasó, cuándo, cuánto, dónde, con qué); "opinion" si es un juicio general, una generalización o una interpretación.
5. primera_mano: true si quien habla vivió o vio el hecho; false si lo sabe por otros (se lo dijeron, lo oyó, lo supone). En un documento, true.
6. resumen: una paráfrasis neutra de una línea, en el idioma de la fuente. No pongas cifras que no estén escritas igual en las oraciones señaladas. No juzgues a la persona.
7. tema: de 1 a 3 palabras, por ejemplo "herraje", "plazos de entrega", "personal".
8. rasgos: "deseabilidad" si lo dicho parece lo que se espera oír o deja bien a quien habla; "defensa" si protege al área propia frente a una crítica. Son señales sobre lo dicho, nunca sobre la persona. Lista vacía si no aplica.
9. corrobora y contradice (solo si se piden): ids de afirmaciones previas de otras fuentes que esta afirmación respalda o contradice sobre el mismo hecho, no sobre un tema parecido. Lista vacía si no hay.
10. Incluye también lo que sí funciona o lo que no ocurre (por ejemplo, qué sí sale a tiempo): sirve para contrastar. Incluye hechos y juicios sobre la organización aunque parezcan no tener relación con el problema. Omite saludos, muletillas y relleno.
11. No inventes: si la fuente no lo dice, no lo afirmes.`;

const MODALIDAD = { transcripcion: 'transcripción literal', notas: 'notas del consultor, no literales' } as const;

export function mensajesAnalista(fuente: FuenteEntrada, oraciones: Oracion[], previas: Previa[]): Mensaje[] {
  const lineas = oraciones.map((o) => (o.esEntrevistador ? `[T${o.turno} · ${o.hablante} · pregunta, sin id] ${o.texto}` : `${o.id} [T${o.turno} · ${o.hablante}] ${o.texto}`));
  const cabecera = [
    `Fuente ${fuente.id} · ${fuente.tipo} · ${fuente.tipo === 'entrevista' ? 'rol de la persona entrevistada' : 'tipo de documento'}: ${fuente.rol} · ${MODALIDAD[fuente.modalidad]}`,
    `Título: ${fuente.titulo}`,
  ];
  const otras = previas.filter((p) => p.fuente !== fuente.id);
  const bloquePrevias = otras.length
    ? ['Afirmaciones previas de otras fuentes (para corrobora y contradice):', ...otras.map((p) => `${p.id} (${p.fuente} · ${p.rol}): ${p.resumen}`)]
    : ['Afirmaciones previas de otras fuentes: ninguna.'];
  return [
    { role: 'system', content: INSTRUCCIONES },
    { role: 'user', content: [...cabecera, '', 'Oraciones:', ...lineas, '', ...bloquePrevias].join('\n') },
  ];
}

export interface ResultadoAnalisis {
  turnos: Turno[];
  oraciones: Oracion[];
  afirmaciones: Afirmacion[];
  rechazos: Rechazo[];
  modelo: string;
  costoUsd: number;
  ms: number;
  demo: boolean;
}

export async function analizarFuente(
  deps: Dependencias,
  // `caso`: id del caso del agente que la pide, si la pide el agente.
  e: { sesion: string; fuente: FuenteEntrada; previas: Previa[]; caso?: string },
): Promise<ResultadoAnalisis> {
  const { turnos, oraciones } = segmentar(e.fuente);
  const citables = oraciones.filter((o) => !o.esEntrevistador).map((o) => o.id);
  if (citables.length === 0) throw new ErrorAnalisis('La fuente no tiene oraciones de la persona entrevistada ni del documento.');
  if (citables.length > MAX_CITABLES) throw new ErrorAnalisis(`La fuente tiene ${citables.length} oraciones; el máximo es ${MAX_CITABLES}. Pártela en dos.`);
  const previas = e.previas.filter((p) => p.fuente !== e.fuente.id).slice(0, MAX_PREVIAS);

  const r = await llamarMeta(deps, {
    sesion: e.sesion,
    proposito: 'analista',
    rol: 'agente',
    esfuerzo: 'low',
    maxTokens: MAX_TOKENS,
    mensajes: mensajesAnalista(e.fuente, oraciones, previas),
    salida: salidaAnalista(
      citables,
      previas.map((p) => p.id),
    ),
    promptCacheKey: 'indagora-analista',
    // Dentro del agente la clave lleva otro prefijo: su cadena de grabaciones no se mezcla con la de /api/analizar.
    clave: `${e.caso ? 'agente-' : ''}${await claveGrabacion(e.fuente, previas)}`,
    // Solo se graban los casos preparados (ficticios y acotados), nunca lo que pega un visitante.
    grabar: esCasoPreparado(e.fuente) && (e.caso ? { caso: e.caso } : true),
  });
  const v = verificar(e.fuente, oraciones, r.datos.afirmaciones, previas);
  return { turnos, oraciones, ...v, modelo: r.modelo, costoUsd: r.costoUsd, ms: r.ms, demo: r.demo };
}

const CASOS_PREPARADOS = [CASO_TALLER];

export function esCasoPreparado(f: FuenteEntrada): boolean {
  return CASOS_PREPARADOS.some((c) => c.fuentes.some((x) => JSON.stringify(x) === JSON.stringify(f)));
}

// Misma entrada, misma clave: DEMO_MODE reproduce la corrida grabada de esa fuente.
async function claveGrabacion(fuente: FuenteEntrada, previas: Previa[]): Promise<string> {
  const texto = JSON.stringify({ v: VERSION_ANALISTA, fuente, previas });
  return `analista:${await sha256Hex(texto)}`;
}
