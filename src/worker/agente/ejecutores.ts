// Llamadas a Meta del agente: el decisor (qué movimiento sigue) y un ejecutor por herramienta.
// Cada salida tiene su esquema estricto con enums de ids reales; lo que vuelve pasa por las
// funciones de src/nucleo/agente/aplicar.ts, que revisan la evidencia en código.
import { z } from 'zod';
import type { Esfuerzo } from '../../config/models';
import {
  aplicarCausas,
  aplicarDesviacion,
  aplicarEsNoEs,
  aplicarJuicios,
  aplicarRelaciones,
  aplicarWeisbord,
  type CausaModelo,
  type DesviacionModelo,
  type FilaModelo,
  type HallazgoModelo,
  type JuicioModelo,
  type RechazoEvidencia,
  type RelacionModelo,
} from '../../nucleo/agente/aplicar';
import { filasDePrueba } from '../../nucleo/agente/criterio';
import { invalidarDesde } from '../../nucleo/agente/estado';
import { seleccionar } from '../../nucleo/agente/seleccion';
import { ACCIONES, CASILLAS_WEISBORD, type Accion, DIMENSIONES, ESPINAS_6M, type CausaEvaluada, type Decision, type EstadoAgente, type EstadoCriterio, type OrigenRechazo } from '../../nucleo/agente/tipos';
import { calcularNiveles } from '../../nucleo/niveles';
import type { NivelCalculado, Rechazo } from '../../nucleo/tipos';
import { analizarFuente, esCasoPreparado } from '../analista/analista';
import { sha256Hex } from '../hash';
import { llamarMeta, type Dependencias, type Mensaje } from '../meta/cliente';
import { definirSalida, enumDe, type Salida } from '../meta/esquema';
import * as P from './prompts';

// Cambiarla invalida las grabaciones de DEMO_MODE del agente.
export const VERSION_AGENTE = 1;

export interface Contexto {
  deps: Dependencias;
  sesion: string;
  e: EstadoAgente;
  niveles: ReadonlyMap<string, NivelCalculado>;
  causas: readonly CausaEvaluada[];
  criterio: EstadoCriterio;
  indicacion: string | null; // del consultor, solo para este paso
}

export interface Gasto {
  costoUsd: number;
  demo: boolean;
}

export interface Ejecucion extends Gasto {
  resumen: string;
  rechazos: { origen: OrigenRechazo; motivo: RechazoEvidencia['motivo'] | Rechazo['motivo']; detalle: string }[];
}


async function llamar<T>(x: Contexto, proposito: string, esfuerzo: Esfuerzo, tarea: string, salida: Salida<T>, maxTokens: number) {
  const mensajes: Mensaje[] = [
    { role: 'system', content: P.INSTRUCCIONES_AGENTE },
    { role: 'user', content: P.bloqueEvidencia(x.e, x.niveles) },
    { role: 'user', content: tarea },
  ];
  // Misma entrada, misma clave: DEMO_MODE reproduce la corrida grabada paso por paso.
  const clave = `agente:${await sha256Hex(JSON.stringify({ v: VERSION_AGENTE, nombre: salida.nombre, esquema: salida.jsonSchema, esfuerzo, mensajes }))}`;
  return llamarMeta(x.deps, {
    sesion: x.sesion,
    proposito,
    rol: 'agente',
    esfuerzo,
    maxTokens,
    mensajes,
    salida,
    promptCacheKey: 'indagora-agente',
    clave,
    // Solo se graban los casos preparados (ficticios), nunca lo que pega un visitante. Se apartan por
    // caso y se publican si el caso termina por el criterio de paro.
    grabar: x.e.fuentes.every(esCasoPreparado) && { caso: x.e.id },
  });
}

const idsAfirmaciones = (e: EstadoAgente) => e.afirmaciones.map((a) => a.id);

// ---- decisor ----

// Con 3,000 se cortó cuando el caso estaba trabado y el modelo razonó de más (corrida sin D1, 29 oct).
const DECISOR_MAX_TOKENS = 6000;

export async function decidir(x: Contexto): Promise<{ decision: Decision } & Gasto> {
  const afirmaciones = enumDe(idsAfirmaciones(x.e), 'ninguno');
  const salida = definirSalida(
    'decision',
    z.object({
      accion: z.enum(ACCIONES),
      fuentes: z.array(enumDe(x.e.fuentes.map((f) => f.id), 'ninguna')),
      causa: enumDe([...x.e.causas.map((c) => c.id), 'ninguna'], 'ninguna'),
      documento: z.string(),
      justificacion: z.string(),
      punteros: z.array(afirmaciones),
    }),
  );
  const r = await llamar(x, 'agente:decidir', 'low', P.tareaDecidir(x.e, x.causas, x.criterio, x.indicacion), salida, DECISOR_MAX_TOKENS);
  const d = r.datos;
  const validos = new Set(idsAfirmaciones(x.e));
  // Cada acción conserva solo sus parámetros; el resto se ignora.
  const conCausa = d.accion === 'disenar_verificacion' || d.accion === 'proponer_intervencion';
  const decision: Decision = {
    accion: d.accion,
    fuentes: d.accion === 'leer_fuentes' ? [...new Set(d.fuentes)].filter((f) => f !== 'ninguna') : [],
    causa: conCausa && d.causa !== 'ninguna' ? d.causa : null,
    documento: d.accion === 'solicitar_documento' ? d.documento.trim() : '',
    justificacion: d.justificacion.trim(),
    punteros: [...new Set(d.punteros)].filter((p) => validos.has(p)),
  };
  return { decision, costoUsd: r.costoUsd, demo: r.demo };
}

// ---- herramientas ----

function casillaZ(e: EstadoAgente) {
  return z.object({ texto: z.string(), evidencia: z.array(enumDe(idsAfirmaciones(e), 'ninguna')) });
}

const deEvidencia = (rechazos: RechazoEvidencia[]): Ejecucion['rechazos'] => rechazos.map((r) => ({ origen: 'evidencia', ...r }));

// `detenerse` no se ejecuta: lo resuelve el bucle con el criterio de paro.
export async function ejecutar(x: Contexto, d: Decision & { accion: Exclude<Accion, 'detenerse'> }): Promise<Ejecucion> {
  const { e } = x;
  switch (d.accion) {
    case 'leer_fuentes':
      return leerFuentes(x, d.fuentes);

    case 'enunciar_desviacion': {
      const c = casillaZ(e);
      const salida = definirSalida(
        'desviacion',
        z.object({ esperado: c, ocurre: c, desde_cuando: c, cuanto: c, contraste: c, ambito: z.enum(['operacion_fisica', 'organizacional']) }) as z.ZodType<DesviacionModelo>,
      );
      const r = await llamar(x, 'agente:desviacion', 'low', P.TAREA_DESVIACION, salida, 4000);
      const a = aplicarDesviacion(e, r.datos);
      const antes = e.seleccion;
      e.desviacion = a.desviacion;
      e.seleccion = seleccionar(a.desviacion);
      // Si cambió la ruta o las espinas, la especificación y las causas anteriores ya no sirven.
      if (antes && (antes.ruta !== e.seleccion.ruta || antes.espinas !== e.seleccion.espinas)) invalidarDesde(e, 'especificacion');
      const ocurre = a.desviacion.ocurre.texto || 'sin enunciar';
      return { resumen: `Desviación: ${ocurre}. Regla de selección: ruta ${e.seleccion.ruta}.`, rechazos: deEvidencia(a.rechazos), costoUsd: r.costoUsd, demo: r.demo };
    }

    case 'especificar_es_no_es': {
      const c = casillaZ(e);
      const salida = definirSalida(
        'es_no_es',
        z.object({ filas: z.array(z.object({ dimension: z.enum(DIMENSIONES), pregunta: z.string(), es: c, no_es: c, distincion: c, cambio: c })) }) as z.ZodType<{ filas: FilaModelo[] }>,
      );
      const r = await llamar(x, 'agente:es_no_es', 'low', P.TAREA_ES_NO_ES, salida, 6000);
      const a = aplicarEsNoEs(e, r.datos.filas);
      invalidarDesde(e, 'causas'); // las filas se renumeran: los juicios anteriores apuntarían a otras
      e.esNoEs = a.esNoEs;
      const contraste = a.esNoEs.filter((f) => f.noEs.texto).length;
      return { resumen: `Es/No Es con ${a.esNoEs.length} filas, ${contraste} con contraste.`, rechazos: deEvidencia(a.rechazos), costoUsd: r.costoUsd, demo: r.demo };
    }

    case 'barrer_weisbord': {
      const c = casillaZ(e);
      const salida = definirSalida(
        'weisbord',
        z.object({ casillas: z.array(z.object({ casilla: z.enum(CASILLAS_WEISBORD), estado: z.enum(['brecha', 'sin_brecha', 'sin_datos']), hallazgo: c })) }) as z.ZodType<{ casillas: HallazgoModelo[] }>,
      );
      const r = await llamar(x, 'agente:weisbord', 'low', P.TAREA_WEISBORD, salida, 5000);
      const a = aplicarWeisbord(e, r.datos.casillas);
      invalidarDesde(e, 'causas');
      e.weisbord = a.weisbord;
      const brechas = a.weisbord.filter((h) => h.estado === 'brecha').map((h) => h.casilla);
      return { resumen: `Weisbord: brechas en ${brechas.join(', ') || 'ninguna casilla'}.`, rechazos: deEvidencia(a.rechazos), costoUsd: r.costoUsd, demo: r.demo };
    }

    case 'generar_causas': {
      const origenes = e.seleccion?.ruta === 'cronica' ? (e.weisbord ?? []).map((h) => h.id) : (e.esNoEs ?? []).map((f) => f.id);
      const espinas = e.seleccion?.espinas === 'weisbord' ? CASILLAS_WEISBORD : ESPINAS_6M;
      const salida = definirSalida(
        'causas',
        z.object({
          causas: z.array(z.object({ enunciado: z.string(), espina: z.enum(espinas), origen: z.array(enumDe(origenes, 'ninguna')), evidencia: z.array(enumDe(idsAfirmaciones(e), 'ninguna')) })),
        }) as z.ZodType<{ causas: CausaModelo[] }>,
      );
      const r = await llamar(x, 'agente:causas', 'low', P.tareaCausas(e), salida, 5000);
      const a = aplicarCausas(e, r.datos.causas, origenes);
      // Las causas son nuevas: la prueba, verificaciones e intervenciones anteriores ya no aplican.
      invalidarDesde(e, 'causas');
      e.causas = a.causas;
      return { resumen: `${a.causas.length} causas en el Ishikawa: ${a.causas.map((c) => `${c.id} ${c.enunciado}`).join('; ')}`, rechazos: deEvidencia(a.rechazos), costoUsd: r.costoUsd, demo: r.demo };
    }

    case 'probar_causas': {
      const filas = filasDePrueba(e);
      const salida = definirSalida(
        'prueba',
        z.object({
          juicios: z.array(
            z.object({
              causa: enumDe(e.causas.map((c) => c.id), 'ninguna'),
              fila: enumDe(filas, 'ninguna'),
              veredicto: z.enum(['explica', 'no_explica', 'sin_datos']),
              razon: z.string(),
              evidencia: z.array(enumDe(idsAfirmaciones(e), 'ninguna')),
            }),
          ),
        }) as z.ZodType<{ juicios: JuicioModelo[] }>,
      );
      // La prueba de causas es el paso que decide el diagnóstico: esfuerzo medio (Pausa B).
      const r = await llamar(x, 'agente:prueba', 'medium', P.tareaPrueba(e, filas), salida, 12_000);
      const a = aplicarJuicios(e, r.datos.juicios, filas);
      e.juicios = a.juicios;
      return { resumen: `${a.juicios.length} juicios de ${e.causas.length * filas.length} pares causa-fila.`, rechazos: deEvidencia(a.rechazos), costoUsd: r.costoUsd, demo: r.demo };
    }

    case 'disenar_verificacion': {
      const causa = x.causas.find((c) => c.id === d.causa)!;
      const salida = definirSalida('verificacion', z.object({ que_revisar: z.string(), con_quien: z.string(), confirma_si: z.string(), descarta_si: z.string() }));
      const r = await llamar(x, 'agente:verificacion', 'low', P.tareaVerificacion(e, x.causas, causa), salida, 3000);
      const v = r.datos;
      e.verificaciones.push({ causa: causa.id, queRevisar: v.que_revisar.trim(), conQuien: v.con_quien.trim(), confirmaSi: v.confirma_si.trim(), descartaSi: v.descarta_si.trim() });
      return { resumen: `Verificación de ${causa.id}: ${v.que_revisar.trim()}`, rechazos: [], costoUsd: r.costoUsd, demo: r.demo };
    }

    case 'proponer_intervencion': {
      const causa = x.causas.find((c) => c.id === d.causa)!;
      const salida = definirSalida('intervencion', z.object({ accion: z.string(), evidencia: z.array(enumDe(idsAfirmaciones(e), 'ninguna')) }));
      const r = await llamar(x, 'agente:intervencion', 'medium', P.tareaIntervencion(e, x.causas, causa), salida, 4000);
      const validos = new Set(idsAfirmaciones(e));
      e.intervenciones.push({ causa: causa.id, accion: r.datos.accion.trim(), evidencia: [...new Set(r.datos.evidencia)].filter((id) => validos.has(id)) });
      return { resumen: `Intervención para ${causa.id}: ${r.datos.accion.trim()}`, rechazos: [], costoUsd: r.costoUsd, demo: r.demo };
    }

    case 'solicitar_documento': {
      const id = `S${e.solicitudes.length + 1}`;
      e.solicitudes.push({ id, descripcion: d.documento, motivo: d.justificacion });
      e.presupuesto.dias += 1;
      return { resumen: `Se pidió al consultor (${id}): ${d.documento}`, rechazos: [], costoUsd: 0, demo: false };
    }
  }
}

// ---- lectura en paralelo y corroboración ----

// Cada fuente se analiza sola y a la vez (sin previas); después, una llamada busca
// corroboraciones y contradicciones entre las afirmaciones nuevas y las del resto de fuentes.
async function leerFuentes(x: Contexto, ids: string[]): Promise<Ejecucion> {
  const { e } = x;
  const fuentes = ids.map((id) => e.fuentes.find((f) => f.id === id)!);
  const resultados = await Promise.allSettled(fuentes.map((fuente) => analizarFuente(x.deps, { sesion: x.sesion, fuente, previas: [], caso: e.id })));
  const salida: Ejecucion = { resumen: '', rechazos: [], costoUsd: 0, demo: false };
  const nuevas = new Set<string>();
  const leidas: string[] = [];
  const fallos: unknown[] = [];
  resultados.forEach((r, i) => {
    const f = fuentes[i];
    if (r.status === 'rejected') return void fallos.push(r.reason);
    const { afirmaciones, rechazos, turnos, oraciones, costoUsd, ms, demo } = r.value;
    e.lecturas[f.id] = { turnos, oraciones, rechazos, costoUsd, ms, demo };
    e.afirmaciones.push(...afirmaciones);
    afirmaciones.forEach((a) => nuevas.add(a.id));
    leidas.push(`${f.id} (${afirmaciones.length} afirmaciones)`);
    salida.costoUsd += costoUsd;
    salida.demo ||= demo;
    for (const rc of rechazos) salida.rechazos.push({ origen: 'verificador', motivo: rc.motivo, detalle: `${f.id}: ${rc.detalle}` });
  });
  // Si ninguna se pudo leer, el error sube al bucle; si alguna sí, se sigue con lo que hay.
  if (leidas.length === 0) throw fallos[0];

  let relaciones = 0;
  if (nuevas.size > 0 && new Set(e.afirmaciones.map((a) => a.fuente)).size > 1) {
    const nuevasIds = [...nuevas];
    const salidaRel = definirSalida(
      'corroboracion',
      z.object({ relaciones: z.array(z.object({ a: enumDe(nuevasIds, 'ninguna'), b: enumDe(idsAfirmaciones(e), 'ninguna'), tipo: z.enum(['corrobora', 'contradice']) })) }) as z.ZodType<{
        relaciones: RelacionModelo[];
      }>,
    );
    // Recién leídas cambian los niveles que ve el modelo: se recalculan para esta llamada.
    const contexto = { ...x, niveles: calcularNiveles(e.afirmaciones, new Set(e.confirmadas)) };
    // Corroborar exige comparar hechos entre fuentes: esfuerzo medio, como acordó la Pausa de F3.
    const r = await llamar(contexto, 'agente:corroboracion', 'medium', P.tareaCorroborar(nuevasIds), salidaRel, 8000);
    const a = aplicarRelaciones(e.afirmaciones, r.datos.relaciones, nuevas);
    e.afirmaciones = a.afirmaciones;
    relaciones = a.aplicadas;
    salida.rechazos.push(...deEvidencia(a.rechazos));
    salida.costoUsd += r.costoUsd;
    salida.demo ||= r.demo;
  }
  const noLeidas = fuentes.filter((f) => !e.lecturas[f.id]).map((f) => f.id);
  salida.resumen = [
    `Leídas en paralelo: ${leidas.join(', ')}.`,
    relaciones > 0 ? `${relaciones} relaciones propuestas entre fuentes.` : '',
    noLeidas.length ? `No se pudieron leer: ${noLeidas.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return salida;
}
