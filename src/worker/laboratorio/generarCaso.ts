// Generación del caso con contributor: una llamada, validación en código y un reintento.
import type { Dependencias } from '../meta/cliente';
import { llamarMeta } from '../meta/cliente';
import { validarCaso } from '../../nucleo/laboratorio/validar';
import type { CasoCrudo, CasoLaboratorio, ParametrosLaboratorio, VerdadLaboratorio } from '../../nucleo/laboratorio/tipos';
import { INSTRUCCION_GENERACION, promptGeneracion, salidaCasoLaboratorio } from './prompts';

export class CasoInvalido extends Error {
  constructor(readonly errores: string[]) { super(`El caso generado no pasó la validación: ${errores.join(' ')}`); this.name = 'CasoInvalido'; }
}

export async function generarCaso(deps: Dependencias, sesion: string, p: ParametrosLaboratorio, id: string): Promise<{ caso: CasoLaboratorio; verdad: VerdadLaboratorio; costoUsd: number }> {
  let errores: string[] = [];
  let costoUsd = 0;
  for (let intento = 1; intento <= 2; intento++) {
    const r = await llamarMeta(deps, {
      sesion, proposito: 'lab:generar', rol: 'contributor', esfuerzo: 'low', maxTokens: 6000,
      mensajes: [
        { role: 'system', content: INSTRUCCION_GENERACION },
        { role: 'user', content: promptGeneracion(p, errores) },
      ],
      salida: salidaCasoLaboratorio,
      clave: `lab:generar:${id}:${intento}`,
    });
    costoUsd += r.costoUsd;
    const crudo: CasoCrudo = { ...r.datos, id, origen: 'descripcion' };
    const v = validarCaso(crudo, p);
    if (!('errores' in v)) return { caso: v.caso, verdad: v.verdad, costoUsd };
    errores = v.errores;
  }
  throw new CasoInvalido(errores);
}
