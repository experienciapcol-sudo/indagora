// Prompts y esquemas estrictos del Laboratorio. Solo rol contributor.
import { z } from 'zod';
import { definirSalida } from '../meta/esquema';
import type { CasoLaboratorio, Hecho, ParametrosLaboratorio, TipoPregunta } from '../../nucleo/laboratorio/tipos';

export const INSTRUCCION_GENERACION = `Eres el generador de casos ficticios de Indagora. Todo lo que escribas es inventado: empresas, personas y cifras que no correspondan a ninguna organización real. A partir de los parámetros (giro, tamaño, síntoma, número de distractores, si hay documento clave) inventa una empresa con un problema organizacional cuyo síntoma visible sea el indicado. Diseña una única causa oculta que explique el síntoma, entre dos y cinco personas con rol distinto, y los distractores pedidos: explicaciones plausibles pero falsas que alguien dentro de la empresa creería. Para cada hecho indica quién lo conoce (una sola persona o documento), de qué tipo es (causa, distractor, síntoma o contexto) y con qué tipo de pregunta puede salir: "siempre" para lo que cualquiera cuenta al abrir la conversación; "temporal", "contraste", "incidente" o "cuantitativa" para lo que solo sale cuando se pregunta por cuándo empezó, por qué unas cosas sí salen bien, por la última vez concreta o por cifras; "documental" no se usa en personas. Los hechos de la causa solo pueden pertenecer a las personas o al documento que designes como dueños de la causa, y ningún otro hecho puede mencionar el mecanismo de la causa. Cada hecho lleva de dos a cinco términos distintivos: palabras concretas que lo delatan y que no se repitan entre un hecho de causa y uno de distractor. El objetivo del diagnóstico y la descripción de la empresa mencionan solo el síntoma: nunca la causa ni los distractores. Escribe los hechos de persona en primera persona, breves, como se habla en una entrevista.`;

export const salidaCasoLaboratorio = definirSalida(
  'caso_laboratorio',
  z.object({
    empresa: z.object({ nombre: z.string().min(1), descripcion: z.string().min(1) }),
    objetivo: z.string().min(1),
    personas: z.array(z.object({ rol: z.string().min(1), presentacion: z.string().min(1) })),
    documentos: z.array(z.object({ titulo: z.string().min(1), esClave: z.boolean() })),
    causa: z.object({
      enunciado: z.string().min(1),
      mecanismo: z.string().min(1),
      marcadores: z.array(z.string().min(1)),
      duenos: z.array(z.string().min(1)),
    }),
    distractores: z.array(z.object({ enunciado: z.string().min(1), porQueEngana: z.string().min(1) })),
    hechos: z.array(
      z.object({
        tipo: z.enum(['causa', 'distractor', 'sintoma', 'contexto']),
        texto: z.string().min(1),
        dueno: z.string().min(1),
        revelacion: z.enum(['siempre', 'incidente', 'cuantitativa', 'contraste', 'temporal', 'documental', 'nunca']),
        distractor: z.string().nullable(),
        terminos: z.array(z.string().min(1)),
      }),
    ),
  }),
);

export type CasoGenerado = z.infer<typeof salidaCasoLaboratorio.zod>;

export const salidaRespuestaSimulada = definirSalida(
  'respuesta_simulada',
  z.object({ respuesta: z.string().min(1).max(900) }),
);

export function promptGeneracion(p: ParametrosLaboratorio, erroresPrevios: string[] = []): string {
  const base = `Parámetros: giro=${p.giro}; tamaño=${p.tamano}; síntoma=${p.sintoma}; distractores=${p.distractores}; documentoClave=${p.documentoClave ? 'sí' : 'no'}.`;
  if (!erroresPrevios.length) return base;
  return `${base}\nEl intento anterior no pasó la validación del código por estos motivos:\n${erroresPrevios.map((e) => `- ${e}`).join('\n')}\nCorrige solo eso y vuelve a entregar el caso completo.`;
}

export function promptPersona(caso: CasoLaboratorio, rol: string, pregunta: string, autorizados: Hecho[], avisoReintento = false): string {
  const hechos = autorizados.length ? autorizados.map((h) => `- ${h.texto}`).join('\n') : '- (ningún hecho de primera mano para esta pregunta)';
  const aviso = avisoReintento
    ? '\nTu respuesta anterior mencionó algo que esta persona no sabe; responde solo con lo que sabes de primera mano.'
    : '';
  return `Eres ${rol} de ${caso.empresa.nombre}. Estás en una entrevista de diagnóstico. Sabes únicamente esto, de primera mano:\n${hechos}\nResponde a la pregunta del consultor usando solo esos hechos, en primera persona, con naturalidad y en dos o cuatro frases. Si te preguntan algo que no está en lo que sabes, dilo sin inventar: que no lo viste, que no te consta o que eso lo lleva otra área. No menciones causas, personas ni datos que no estén en tu lista, aunque los sospeches. No uses cifras que no estén en tus hechos.${aviso}\nPregunta del consultor: ${pregunta}`;
}

export type { TipoPregunta };
