// Entrevistas dirigidas por código: aislamiento por hechosAutorizados, fuga, reintento y respaldo.
import type { Dependencias } from '../meta/cliente';
import { llamarMeta } from '../meta/cliente';
import { hechosAutorizados, revisarRespuesta, respuestaRespaldo } from '../../nucleo/laboratorio/revelacion';
import { fuentesDeIntercambios, fuenteDocumento, planDeRondas, preguntaDeRonda } from '../../nucleo/laboratorio/entrevistas';
import type { CasoLaboratorio, Intercambio, VerdadLaboratorio } from '../../nucleo/laboratorio/tipos';
import type { FuenteEntrada } from '../../nucleo/tipos';
import { promptPersona, salidaRespuestaSimulada } from './prompts';
import { gastoLabSesion } from './almacenLab';

export const SUBTOPE_LAB_USD = 0.05;

export interface ResultadoSimulacion {
  intercambios: Intercambio[];
  fuentes: FuenteEntrada[];
  gastoLabUsd: number;
  sinPresupuesto: boolean;
}

export async function ejecutarSimulacion(deps: Dependencias, sesion: string, caso: CasoLaboratorio, verdad: VerdadLaboratorio): Promise<ResultadoSimulacion> {
  const intercambios: Intercambio[] = [];
  const docs: FuenteEntrada[] = [];
  let gastoLabUsd = await gastoLabSesion(deps.db, sesion);
  let sinPresupuesto = gastoLabUsd >= SUBTOPE_LAB_USD;
  let ordenDoc = 1;

  for (const ronda of planDeRondas(caso)) {
    const n = intercambios.length + 1;
    const pregunta = preguntaDeRonda(caso, ronda.tipo);
    if (ronda.tipo === 'documental') {
      const fuente = fuenteDocumento(caso, verdad, ronda.persona, ordenDoc);
      if (fuente) {
        ordenDoc++;
        docs.push(fuente);
        const doc = caso.documentos.find((d) => d.id === ronda.persona);
        if (doc) doc.disponible = true;
        intercambios.push({ n, persona: ronda.persona, tipoPregunta: 'documental', pregunta, respuesta: `Documento entregado: ${doc?.titulo ?? ronda.persona}.`, hechosRevelados: verdad.hechos.filter((h) => h.dueno === ronda.persona).map((h) => h.id), fuga: false });
      }
      continue;
    }
    const persona = caso.personas.find((x) => x.id === ronda.persona);
    if (!persona) continue;
    if (sinPresupuesto || gastoLabUsd >= SUBTOPE_LAB_USD) {
      sinPresupuesto = true;
      intercambios.push({ n, persona: persona.id, tipoPregunta: ronda.tipo, pregunta, respuesta: respuestaRespaldo(ronda.tipo), hechosRevelados: [], fuga: false });
      continue;
    }
    const autorizados = hechosAutorizados(verdad, persona.id, ronda.tipo);
    let respuesta: string | null = null;
    let fuga = false;
    for (let intento = 0; intento < 2 && respuesta === null; intento++) {
      const r = await llamarMeta(deps, {
        sesion, proposito: 'lab:simular', rol: 'contributor', esfuerzo: 'minimal', maxTokens: 700,
        mensajes: [
          { role: 'system', content: 'Responde solo como la persona indicada, con los hechos autorizados.' },
          { role: 'user', content: promptPersona(caso, persona.rol, pregunta, autorizados, intento > 0) },
        ],
        salida: salidaRespuestaSimulada,
        clave: `lab:simular:${caso.id}:${persona.id}:${ronda.tipo}:${n}:${intento}`,
      });
      gastoLabUsd += r.costoUsd;
      const revision = revisarRespuesta(r.datos.respuesta, autorizados, verdad.hechos);
      if (revision.ok) respuesta = r.datos.respuesta;
      else if (intento === 1) fuga = true;
    }
    if (respuesta === null) {
      respuesta = respuestaRespaldo(ronda.tipo);
      intercambios.push({ n, persona: persona.id, tipoPregunta: ronda.tipo, pregunta, respuesta, hechosRevelados: [], fuga });
    } else {
      intercambios.push({ n, persona: persona.id, tipoPregunta: ronda.tipo, pregunta, respuesta, hechosRevelados: autorizados.map((h) => h.id), fuga: false });
    }
  }
  return { intercambios, fuentes: fuentesDeIntercambios(caso, intercambios, docs), gastoLabUsd, sinPresupuesto };
}
