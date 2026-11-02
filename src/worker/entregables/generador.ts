// Orquestación F5 en el Worker: elegibilidad por código, máximo 3 llamadas a Meta con
// esfuerzo low y esquema estricto, techo duro de 0,15 USD y ensamblado con el núcleo puro.
import { z } from 'zod';
import { causasParaVerificacion, causaPrincipalElegible, generarEntregables, generarInformeMarkdown, huellaDeEstado } from '../../nucleo/entregables';
import type { AccionPropuesta, IndicadorPropuesto, PasoPDSA, VerificacionPropuesta } from '../../nucleo/entregables';
import type { VistaAgente } from '../../nucleo/agente/tipos';
import { esCasoPreparado } from '../analista/analista';
import { sha256Hex } from '../hash';
import { llamarMeta, type Dependencias, type Mensaje } from '../meta/cliente';
import { definirSalida, enumDe, type Salida } from '../meta/esquema';
import { INSTRUCCIONES_ENTREGABLES, VERSION_ENTREGABLES, bloqueEvidenciaEntregables, tareaIndicadoresEntregables, tareaIntervencionEntregables, tareaVerificacionEntregables } from './prompts';
import type { EntregablesCaso } from '../../nucleo/entregables/tipos';

export const TECHO_ENTREGABLES_USD = 0.15;

interface VerificacionModelo {
  causa: string; que_revisar: string; con_quien: string; confirma_si: string; descarta_si: string;
  pasos: { fase: PasoPDSA['fase']; texto: string; responsable: string; punteros: string[] }[];
}
interface AccionModelo { causa: string; texto: string; cuadrante: AccionPropuesta['cuadrante']; esfuerzo: AccionPropuesta['esfuerzo']; punteros: string[] }
interface IndicadorModelo {
  nombre: string; definicion: string; formula: string; unidad: string; linea_base: string | null;
  meta: string; plazo: string; frecuencia: IndicadorPropuesto['frecuencia']; responsable: string; causa: string; punteros: string[];
}

async function llamar<T>(
  deps: Dependencias, sesion: string, vista: VistaAgente, proposito: string, tarea: string, salida: Salida<T>, maxTokens: number,
) {
  const mensajes: Mensaje[] = [
    { role: 'system', content: INSTRUCCIONES_ENTREGABLES },
    { role: 'user', content: bloqueEvidenciaEntregables(vista) },
    { role: 'user', content: tarea },
  ];
  const clave = `entregables:${await sha256Hex(JSON.stringify({ v: VERSION_ENTREGABLES, nombre: salida.nombre, esquema: salida.jsonSchema, esfuerzo: 'low', mensajes }))}`;
  return llamarMeta(deps, {
    sesion,
    proposito,
    rol: 'agente',
    esfuerzo: 'low',
    maxTokens,
    mensajes,
    salida,
    promptCacheKey: 'indagora-entregables',
    clave,
    // Solo se graban casos preparados; se publican si el caso termina por el criterio (ver ruta).
    grabar: vista.estado.fuentes.every(esCasoPreparado) && { caso: vista.estado.id },
  });
}

export async function generarEntregablesDelCaso(deps: Dependencias, sesion: string, vista: VistaAgente): Promise<EntregablesCaso> {
  const idsAfirmaciones = vista.estado.afirmaciones.map((a) => a.id);
  const punterosZ = () => z.array(enumDe(idsAfirmaciones, 'ninguna'));
  const paraVerificar = causasParaVerificacion(vista.causas);
  const elegible = causaPrincipalElegible(vista.causas);

  let costoUsd = 0;
  let demo = false;
  const sumar = (costo: number, esDemo: boolean) => {
    costoUsd += costo;
    demo ||= esDemo;
  };
  // El techo se revisa antes de cada llamada: lo ya pagado se conserva y solo se omiten
  // las llamadas siguientes.
  const autorizarSiguiente = () => costoUsd < TECHO_ENTREGABLES_USD;

  let verificaciones: VerificacionPropuesta[] = [];
  if (paraVerificar.length > 0 && autorizarSiguiente()) {
    const pasoZ = z.object({ fase: z.enum(['planear', 'hacer', 'estudiar', 'actuar']), texto: z.string(), responsable: z.string(), punteros: punterosZ() });
    const salida = definirSalida(
      'entregables_verificaciones',
      z.object({
        verificaciones: z.array(z.object({
          causa: enumDe(paraVerificar.map((c) => c.id), 'ninguna'),
          que_revisar: z.string(), con_quien: z.string(), confirma_si: z.string(), descarta_si: z.string(), pasos: z.array(pasoZ),
        })),
      }) as z.ZodType<{ verificaciones: VerificacionModelo[] }>,
    );
    const r = await llamar(deps, sesion, vista, 'entregables:verificaciones', tareaVerificacionEntregables(vista, paraVerificar), salida, 3000);
    sumar(r.costoUsd, r.demo);
    verificaciones = r.datos.verificaciones.map((v) => ({
      causa: v.causa, queRevisar: v.que_revisar, conQuien: v.con_quien, confirmaSi: v.confirma_si, descartaSi: v.descarta_si,
      pasos: v.pasos.map((p) => ({ fase: p.fase, texto: p.texto, responsable: p.responsable, punteros: p.punteros.filter((id) => id !== 'ninguna') })),
    }));
  }

  let acciones: AccionPropuesta[] = [];
  if (elegible && autorizarSiguiente()) {
    const salida = definirSalida(
      'entregables_intervenciones',
      z.object({
        acciones: z.array(z.object({
          causa: enumDe([elegible.id], 'ninguna'),
          texto: z.string(), cuadrante: z.enum(['eliminar', 'reducir', 'incrementar', 'crear']),
          esfuerzo: z.enum(['bajo', 'medio', 'alto']), punteros: punterosZ(),
        })),
      }) as z.ZodType<{ acciones: AccionModelo[] }>,
    );
    const r = await llamar(deps, sesion, vista, 'entregables:intervenciones', tareaIntervencionEntregables(vista, elegible), salida, 3000);
    sumar(r.costoUsd, r.demo);
    acciones = r.datos.acciones.map((a) => ({ causa: a.causa, texto: a.texto, cuadrante: a.cuadrante, esfuerzo: a.esfuerzo, punteros: a.punteros.filter((id) => id !== 'ninguna') }));
  }

  let indicadores: IndicadorPropuesto[] = [];
  // Sin causa elegible se omiten intervención e indicadores de intervención (§3.1 paso 3 del diseño).
  if (elegible && autorizarSiguiente()) {
    const conPlan = [elegible, ...paraVerificar.filter((c) => c.id !== elegible.id)];
    const salida = definirSalida(
      'entregables_indicadores',
      z.object({
        indicadores: z.array(z.object({
          nombre: z.string(), definicion: z.string(), formula: z.string(), unidad: z.string(),
          linea_base: z.string().nullable(), meta: z.string(), plazo: z.string(),
          frecuencia: z.enum(['diaria', 'semanal', 'mensual']), responsable: z.string(),
          causa: enumDe(conPlan.map((c) => c.id), 'ninguna'), punteros: punterosZ(),
        })),
      }) as z.ZodType<{ indicadores: IndicadorModelo[] }>,
    );
    const r = await llamar(deps, sesion, vista, 'entregables:indicadores', tareaIndicadoresEntregables(vista, conPlan), salida, 4000);
    sumar(r.costoUsd, r.demo);
    const porCausa = new Map<string, number>();
    indicadores = r.datos.indicadores
      .filter((i) => {
        const n = porCausa.get(i.causa) ?? 0;
        if (n >= 3) return false;
        porCausa.set(i.causa, n + 1);
        return true;
      })
      .map((i) => ({
        nombre: i.nombre, definicion: i.definicion, formula: i.formula, unidad: i.unidad,
        lineaBase: i.linea_base?.trim() ? i.linea_base : null, meta: i.meta, plazo: i.plazo,
        frecuencia: i.frecuencia, responsable: i.responsable, causa: i.causa, punteros: i.punteros.filter((id) => id !== 'ninguna'),
      }));
  }

  const resto = generarEntregables(vista, { verificaciones, acciones, indicadores });
  const completo: EntregablesCaso = {
    ...resto,
    version: 1,
    agenteId: vista.estado.id,
    huellaEstado: huellaDeEstado(vista),
    generadoEn: new Date().toISOString(),
    costoUsd,
    demo,
  };
  // El informe se regenera con los metadatos finales para que lo guardado y lo descargado coincidan.
  completo.informeMarkdown = generarInformeMarkdown(completo, vista);
  return completo;
}
