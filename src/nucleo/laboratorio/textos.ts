// Textos y plantillas del núcleo del Laboratorio, en español llano.
import type { TipoPregunta } from './tipos';

export const PLANTILLAS: Record<TipoPregunta, string> = {
  abierta: 'Para empezar, ¿me cuenta qué está pasando con {sintoma}?',
  temporal: '¿Desde cuándo nota este problema y qué recuerda de cuando empezó?',
  contraste: '¿Qué casos sí salen bien y en qué se diferencian de los que salen mal?',
  incidente: 'Cuénteme la última vez concreta en que pasó. ¿Qué ocurrió, paso a paso?',
  cuantitativa: '¿Qué cifras o conteos conoce de primera mano sobre este problema?',
  documental: '¿Hay algún registro o documento que podamos revisar?',
};

export const RESPUESTAS_RESPALDO: Record<TipoPregunta, string> = {
  abierta: 'De eso no me ha tocado ver nada directamente.',
  temporal: 'No tengo claro cuándo empezó; no me tocó verlo de cerca.',
  contraste: 'No sabría decirle qué casos salen distintos; no lo he visto de primera mano.',
  incidente: 'No recuerdo un caso concreto que yo haya visto directamente.',
  cuantitativa: 'No manejo esas cifras de primera mano.',
  documental: 'No tengo un documento de eso a la mano.',
};

export const AVISO_FUGA = 'Esta respuesta se sustituyó porque la persona simulada estuvo a punto de contar algo que no sabe.';
export const AVISO_GRABADO = 'Se alcanzó el tope de gasto: estás viendo una corrida grabada, sin costo.';
export const TEXTO_LABORATORIO = 'Laboratorio: empresa ficticia generada para practicar; nadie aquí es una persona real.';
