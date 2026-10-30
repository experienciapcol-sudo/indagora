// Textos que recibe el modelo en cada paso del agente. Orden fijo para aprovechar la caché de
// prompts: primero las instrucciones (iguales en todas las llamadas), luego la evidencia (cambia
// solo al leer fuentes o confirmar corroboraciones) y al final la tarea y el estado.
import { recortar } from '../../nucleo/agente/aplicar';
import { NOMBRE_NIVEL } from '../../nucleo/niveles';
import type { NivelCalculado } from '../../nucleo/tipos';
import type { CausaEvaluada, EstadoAgente, EstadoCriterio, EventoTraza, Casilla } from '../../nucleo/agente/tipos';

export const INSTRUCCIONES_AGENTE = `Eres el agente de diagnóstico de Indagora, una herramienta para consultores en administración. Tu objetivo es un diagnóstico defendible: encontrar la causa de una desviación con evidencia suficiente antes de proponer cualquier intervención.

Método (Kepner y Tregoe, The Rational Manager):
1. Leer las fuentes.
2. Enunciar la desviación: qué se esperaba, qué ocurre, desde cuándo, cuánto, y un contraste (algo comparable que sí funciona).
3. Ruta aguda (hay fecha de inicio y contraste): especificar Es/No Es por qué, dónde, cuándo y cuánto, con lo que distingue a lo que es de lo que no es y los cambios en esas distinciones. Ruta crónica (falta alguno de los dos): barrer las seis casillas de Weisbord.
4. Generar causas posibles a partir de las distinciones y cambios (o de las brechas) y ordenarlas en un Ishikawa.
5. Probar cada causa contra cada fila: una causa verdadera explica a la vez lo que es y lo que no es.
6. Confirmar la causa con un documento o con otra fuente de otro rol; diseñar la verificación de las causas que sigan abiertas.

Evidencia:
- Solo puedes apuntar a afirmaciones por su id (por ejemplo E2-A05). Ya están verificadas contra el texto. Nunca inventes hechos ni ids.
- Cada afirmación trae su nivel, que calcula el código: N1 opinión o de oídas, N2 testimonio específico de primera mano, N3 corroborado entre roles, N4 documentado. Una opinión sirve como hipótesis que hay que probar, nunca como prueba.
- Con una sola fuente nada pasa de N2. No presentes como verificado lo que dijo una sola persona.
- Una causa con N0 a N2 solo admite acciones de verificación; intervenir pide N3 o N4.
- El código revisa cada movimiento tuyo y puede rechazarlo con un motivo. Si te rechazó, corrige; no repitas lo mismo.
- Escribe en el idioma de las fuentes, con frases breves y neutras. No juzgues a las personas.`;

const TIPO = { opinion: 'opinión', testimonio_especifico: 'testimonio' } as const;

export function bloqueEvidencia(e: EstadoAgente, niveles: ReadonlyMap<string, NivelCalculado>): string {
  const fuentes = e.fuentes.map((f) => `${f.id} · ${f.tipo} · ${f.rol} · ${e.lecturas[f.id] ? 'leída' : 'sin leer'}`);
  const afirmaciones = e.afirmaciones.map((a) => {
    const n = niveles.get(a.id);
    const marcas = [n?.contradicha ? 'contradicha' : '', a.primeraMano ? '' : 'de oídas'].filter(Boolean);
    return `${a.id} · ${a.rol} · N${n?.nivel ?? 0} · ${TIPO[a.tipo]}${marcas.length ? ` · ${marcas.join(', ')}` : ''} · "${recortar(a.cita, 260)}"`;
  });
  return [
    `Objetivo del consultor: ${e.objetivo}`,
    '',
    'Fuentes:',
    ...fuentes,
    '',
    afirmaciones.length ? 'Afirmaciones verificadas (id · rol · nivel · tipo · cita literal):' : 'Aún no hay afirmaciones: ninguna fuente leída.',
    ...afirmaciones,
  ].join('\n');
}

const casilla = (c: Casilla) => (c.texto ? `${c.texto} (${c.evidencia.join(', ')})` : '—');

export function resumenEstado(e: EstadoAgente, causas: readonly CausaEvaluada[]): string {
  const l: string[] = [];
  const d = e.desviacion;
  if (!d) l.push('Desviación: sin enunciar.');
  else {
    l.push('Desviación:');
    l.push(`- Qué se esperaba: ${casilla(d.esperado)}`, `- Qué ocurre: ${casilla(d.ocurre)}`, `- Desde cuándo: ${casilla(d.desdeCuando)}`, `- Cuánto: ${casilla(d.cuanto)}`, `- Contraste: ${casilla(d.contraste)}`);
  }
  if (e.seleccion) {
    const elegidas = e.seleccion.herramientas.filter((h) => h.elegida).map((h) => h.herramienta);
    l.push(`Regla de selección del código: ruta ${e.seleccion.ruta}; herramientas elegidas: ${elegidas.join(', ')}; espinas del Ishikawa: ${e.seleccion.espinas}.`);
  }
  if (e.esNoEs) {
    l.push('Es/No Es:');
    for (const f of e.esNoEs) l.push(`- ${f.id} [${f.dimension}] ${f.pregunta} | es: ${casilla(f.es)} | no es: ${casilla(f.noEs)} | distinción: ${casilla(f.distincion)} | cambio: ${casilla(f.cambio)}`);
  }
  if (e.weisbord) {
    l.push('Seis casillas de Weisbord:');
    for (const h of e.weisbord) l.push(`- ${h.id} ${h.estado}: ${casilla(h.hallazgo)}`);
  }
  if (e.causas.length) {
    l.push('Causas posibles (estado y nivel calculados por el código):');
    for (const c of e.causas) {
      const ev = causas.find((x) => x.id === c.id);
      const extra = [
        ev ? `N${ev.nivel}` : '',
        ev ? `${ev.estado}, explica ${ev.filasExplicadas} de ${ev.filasTotales} filas` : '',
        ev?.descartadaPor.length ? `descartada por ${ev.descartadaPor.join(', ')}` : '',
        ev?.verificacion ? 'con verificación' : '',
        ev?.intervencion ? 'con intervención' : '',
        ev?.principal ? 'candidata principal' : '',
      ].filter(Boolean);
      l.push(`- ${c.id} [${c.espina}] ${c.enunciado} (evidencia ${c.evidencia.join(', ')}) — ${extra.join('; ')}`);
    }
  } else l.push('Causas posibles: ninguna aún.');
  for (const v of e.verificaciones) l.push(`Verificación de ${v.causa}: ${v.queRevisar}`);
  for (const s of e.solicitudes) l.push(`Documento pedido (${s.id}): ${s.descripcion}`);
  return l.join('\n');
}

function historial(traza: readonly EventoTraza[]): string[] {
  return traza.slice(-12).map((ev) => {
    switch (ev.tipo) {
      case 'indicacion':
        return `Paso ${ev.paso}, indicación del consultor: ${ev.texto}`;
      case 'decision':
        return `Paso ${ev.paso}: ${ev.accion}${ev.parametros ? ` (${ev.parametros})` : ''}`;
      case 'rechazo':
        return `  Rechazado por el código (${ev.motivo}): ${ev.detalle}`;
      case 'resultado':
        return `  Hecho: ${ev.resumen}`;
      case 'error':
        return `  Error: ${ev.detalle}`;
      case 'fin':
        return `Fin: ${ev.detalle}`;
    }
  });
}

export function tareaDecidir(e: EstadoAgente, causas: readonly CausaEvaluada[], criterio: EstadoCriterio, indicacion: string | null): string {
  const p = e.presupuesto;
  const h = historial(e.traza);
  return [
    'Estado del caso:',
    resumenEstado(e, causas),
    '',
    'Historial reciente:',
    ...(h.length ? h : ['(ninguno: es el primer paso)']),
    '',
    'Lo que falta según el criterio de paro del código:',
    ...(criterio.faltantes.length ? criterio.faltantes.map((f) => `- ${f}`) : ['- Nada: el criterio está cumplido.']),
    '',
    `Presupuesto: paso ${p.pasos} de ${p.pasosMax}; días de campo usados ${p.dias} de ${p.diasMax}.`,
    '',
    ...(indicacion ? [`Indicación del consultor para este paso: "${indicacion}". Tómala en cuenta al elegir; el código revisará tu movimiento con las mismas reglas.`, ''] : []),
    `Tarea: elige el siguiente movimiento. Acciones:
- leer_fuentes (fuentes): lee y analiza fuentes sin leer; puedes leer varias a la vez.
- enunciar_desviacion
- especificar_es_no_es (ruta aguda)
- barrer_weisbord (ruta crónica)
- generar_causas: causas posibles ordenadas en el Ishikawa.
- probar_causas: cada causa contra cada fila.
- disenar_verificacion (causa): cómo confirmar o descartar una causa abierta.
- proponer_intervencion (causa): solo para una causa probada con N3 o N4.
- solicitar_documento (documento): pide al consultor un documento que confirmaría o descartaría una causa; cuesta un día de campo.
- detenerse: cuando el criterio de paro esté cumplido, o cuando solo falte subir el nivel de la causa principal y eso dependa del consultor (confirmar una corroboración o aportar un documento pedido): el código entrega un diagnóstico parcial y dice qué falta.
Llena solo los parámetros de la acción elegida: fuentes vacía, causa "ninguna" y documento vacío si no aplican. justificacion: una o dos frases sobre por qué este movimiento ahora. punteros: afirmaciones que sostienen la decisión (lista vacía si no aplica).`,
  ].join('\n');
}

export const TAREA_DESVIACION = `Tarea: enuncia la desviación.
- esperado: el estándar o la meta (qué debería pasar).
- ocurre: lo que pasa en realidad, concreto.
- desde_cuando: cuándo empezó, si alguna fuente lo dice.
- cuanto: la magnitud (cuántos, qué tan tarde, qué tanto), si alguna fuente lo dice.
- contraste: algo comparable que sí funciona (otro producto, área, turno o periodo), si alguna fuente lo dice.
Cada casilla: texto breve y en evidencia los ids de las afirmaciones que lo sostienen. Si ninguna fuente lo dice, texto vacío y evidencia vacía.
ambito: "operacion_fisica" si la desviación ocurre en producción, logística o un proceso físico; "organizacional" si está en personas, coordinación, estrategia o servicio.`;

export const TAREA_ES_NO_ES = `Tarea: especifica la desviación con el Es/No Es de Kepner y Tregoe. De 3 a 6 filas que cubran qué (objeto y defecto), dónde, cuándo y cuánto. En cada fila:
- pregunta: la pregunta de la fila.
- es: lo que sí presenta el problema.
- no_es: lo más cercano que podría presentarlo y no lo presenta.
- distincion: qué tiene de particular lo que es frente a lo que no es.
- cambio: qué cambió en esa distinción, y cuándo.
Toda casilla con texto lleva evidencia. Si no hay evidencia, deja la casilla vacía (texto y evidencia vacíos). No pongas opiniones como hechos.`;

export const TAREA_WEISBORD = `Tarea: barre las seis casillas de Weisbord: propositos, estructura, relaciones, recompensas, liderazgo y mecanismos (de apoyo). Para cada una: estado "brecha", "sin_brecha" o "sin_datos", y el hallazgo con su evidencia. Sin evidencia: "sin_datos" con texto y evidencia vacíos.`;

export function tareaCausas(e: EstadoAgente): string {
  const espinas = e.seleccion?.espinas === 'weisbord' ? 'las seis casillas de Weisbord' : 'las 6M (mano de obra, maquinaria, materiales, método, medición, medio ambiente)';
  const de = e.seleccion?.ruta === 'cronica' ? 'las brechas del barrido de Weisbord' : 'las distinciones y cambios del Es/No Es';
  return `Estado del caso:
${resumenEstado(e, [])}

Tarea: genera de 3 a 7 causas posibles y coloca cada una en una espina del Ishikawa (${espinas}). Incluye las que se derivan de ${de}, y también las causas que proponen las personas entrevistadas aunque sean opiniones, para probarlas.
- enunciado: el mecanismo en una frase (qué cambió o qué pasa y cómo produce la desviación).
- origen: ids de las filas o casillas de donde sale; lista vacía si es una hipótesis de una persona.
- evidencia: afirmaciones que muestran que el hecho propuesto ocurrió (no que sea la causa). Sin evidencia la causa no entra.`;
}

export function tareaPrueba(e: EstadoAgente, filas: readonly string[]): string {
  const cronica = e.seleccion?.ruta === 'cronica';
  const criterio = cronica
    ? '"explica" si la causa da cuenta de esa brecha; "no_explica" si la evidencia de esa casilla la contradice; "sin_datos" si la evidencia no alcanza.'
    : '"explica" si la causa da cuenta a la vez de lo que es y de lo que no es en esa fila; "no_explica" si choca con algún lado (por ejemplo, una causa general que también tendría que afectar lo que no falla); "sin_datos" si la evidencia no alcanza.';
  return `Estado del caso:
${resumenEstado(e, [])}

Tarea: prueba cada causa contra cada fila (${filas.join(', ')}). Para cada par causa-fila, veredicto: ${criterio}
- razon: una frase.
- evidencia: afirmaciones que sostienen el juicio. Un juicio sin evidencia cuenta como sin datos.
Incluye todos los pares: ${e.causas.length} causas por ${filas.length} filas.`;
}

export function tareaVerificacion(e: EstadoAgente, causas: readonly CausaEvaluada[], causa: CausaEvaluada): string {
  const c = e.causas.find((x) => x.id === causa.id)!;
  return `Estado del caso:
${resumenEstado(e, causas)}

Tarea: diseña la verificación de ${c.id}: "${c.enunciado}" (N${causa.nivel}, ${NOMBRE_NIVEL[causa.nivel]}; ${causa.estado}).
- que_revisar: el dato o hecho que la confirmaría o descartaría.
- con_quien: la persona, el rol o el documento donde está.
- confirma_si: el resultado concreto que la confirma.
- descarta_si: el resultado concreto que la descarta.`;
}

export function tareaIntervencion(e: EstadoAgente, causas: readonly CausaEvaluada[], causa: CausaEvaluada): string {
  const c = e.causas.find((x) => x.id === causa.id)!;
  return `Estado del caso:
${resumenEstado(e, causas)}

Tarea: propone una dirección de intervención para ${c.id}: "${c.enunciado}". Una acción concreta sobre el mecanismo de la causa, no sobre las personas. evidencia: afirmaciones que la justifican.`;
}

export function tareaCorroborar(nuevas: readonly string[]): string {
  return `Tarea: señala relaciones entre afirmaciones de fuentes distintas sobre el mismo hecho concreto.
- a: una afirmación nueva (${nuevas.length} nuevas: ${nuevas.join(', ')}).
- b: una afirmación de otra fuente.
- tipo: "corrobora" si b respalda el mismo hecho; "contradice" si lo niega.
No relaciones temas parecidos que no son el mismo hecho, ni afirmaciones de la misma fuente. Lista vacía si no hay.`;
}
