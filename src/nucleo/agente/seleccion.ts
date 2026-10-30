// Regla de selección de herramientas (regla del producto, en código y visible). Sale de la
// desviación: con fecha de inicio y un contraste la ruta es aguda (Kepner y Tregoe); sin
// alguno de los dos, crónica (seis casillas de Weisbord y luego Ishikawa).
import type { Desviacion, Herramienta, Seleccion } from './tipos';

const llena = (c: { texto: string; evidencia: string[] }) => c.texto.trim() !== '' && c.evidencia.length > 0;

export function seleccionar(d: Desviacion): Seleccion {
  const fecha = llena(d.desdeCuando);
  const contraste = llena(d.contraste);
  const aguda = fecha && contraste;
  const razones = [
    fecha ? `Hay fecha de inicio con evidencia (${d.desdeCuando.evidencia.join(', ')})` : 'No hay fecha de inicio con evidencia',
    contraste ? `Hay un contraste: algo comparable que sí funciona (${d.contraste.evidencia.join(', ')})` : 'No hay un contraste con evidencia: nada comparable que sí funcione',
    aguda ? 'Ruta aguda: especificar Es/No Es y probar causas (Kepner y Tregoe)' : 'Ruta crónica: barrer la organización con las seis casillas (Weisbord) y ordenar causas con Ishikawa',
  ];
  const fisica = d.ambito === 'operacion_fisica';
  const razon: Record<Herramienta, [boolean, string]> = {
    es_no_es: aguda
      ? [true, 'Con fecha de inicio y contraste, separa lo que falla de lo que no y deja ver distinciones y cambios']
      : [false, 'Sin fecha de inicio o sin contraste no hay con qué comparar'],
    ishikawa: [
      true,
      fisica
        ? 'Ordena las causas posibles en las 6M porque la desviación ocurre en una operación física'
        : 'Ordena las causas posibles con las casillas de Weisbord como espinas porque la desviación es organizacional',
    ],
    weisbord: aguda ? [false, 'La ruta aguda no necesita barrer toda la organización'] : [true, 'Barre la organización cuando el problema no tiene un inicio ni un contraste claros'],
    campo_de_fuerzas: [false, 'Sirve para planear el cambio, no para encontrar la causa: entra con el plan de intervención'],
    lienzo: [false, 'Se reserva para desviaciones del modelo de negocio (clientes, propuesta de valor, ingresos)'],
    cinco_porques: [
      false,
      aguda
        ? 'Sigue una sola cadena y tiende a confirmar la primera hipótesis; con contraste, la prueba de causas es más fuerte'
        : 'Sigue una sola cadena y tiende a confirmar la primera hipótesis; el barrido de Weisbord cubre más',
    ],
  };
  return {
    ruta: aguda ? 'aguda' : 'cronica',
    razones,
    espinas: fisica ? 'seis_m' : 'weisbord',
    herramientas: (Object.keys(razon) as Herramienta[]).map((h) => ({ herramienta: h, elegida: razon[h][0], razon: razon[h][1] })),
  };
}

export const elegida = (s: Seleccion | null, h: Herramienta) => s?.herramientas.some((x) => x.herramienta === h && x.elegida) ?? false;
