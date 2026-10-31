// Guardas: el código revisa cada movimiento que propone el modelo antes de ejecutarlo.
// Fase previa cumplida, herramienta elegida por la regla, nivel suficiente para la acción,
// sin repetir y dentro del presupuesto. Una causa con N0 a N2 solo admite verificación.
import { criterioDeParo, esperaDelConsultor, filasDePrueba } from './criterio';
import { firmaDe, leidas, nivelesDe } from './estado';
import { elegida } from './seleccion';
import type { CausaEvaluada, Decision, EstadoAgente, MotivoGuarda } from './tipos';

export type Veredicto = { ok: true } | { ok: false; motivo: MotivoGuarda; detalle: string };

const no = (motivo: MotivoGuarda, detalle: string): Veredicto => ({ ok: false, motivo, detalle });
const SI: Veredicto = { ok: true };

export function revisarDecision(e: EstadoAgente, d: Decision, causas: readonly CausaEvaluada[]): Veredicto {
  // Una acción ya hecha solo se repite si desde entonces se leyó una fuente nueva.
  const firma = firmaDe(d);
  const previa = e.hechas.filter((h) => h.firma === firma).at(-1);
  const repetida = !!previa && previa.leidas === leidas(e);
  const causa = d.causa ? causas.find((c) => c.id === d.causa) : undefined;

  switch (d.accion) {
    case 'leer_fuentes': {
      if (d.fuentes.length === 0) return no('parametro_invalido', 'No indicó qué fuentes leer');
      const ajenas = d.fuentes.filter((id) => !e.fuentes.some((f) => f.id === id));
      if (ajenas.length) return no('parametro_invalido', `No existen: ${ajenas.join(', ')}`);
      const ya = d.fuentes.filter((id) => e.lecturas[id]);
      if (ya.length) return no('repetida', `Ya se leyeron: ${ya.join(', ')}`);
      return SI;
    }
    case 'enunciar_desviacion':
      if (leidas(e) === 0) return no('fase_previa', 'Antes de enunciar la desviación hay que leer al menos una fuente');
      return repetida ? no('repetida', 'La desviación ya está enunciada y no hay fuentes nuevas desde entonces') : SI;
    case 'especificar_es_no_es':
    case 'barrer_weisbord': {
      if (!e.desviacion) return no('fase_previa', 'Primero se enuncia la desviación: de ella sale la regla de selección');
      const h = d.accion === 'especificar_es_no_es' ? 'es_no_es' : 'weisbord';
      const r = e.seleccion?.herramientas.find((x) => x.herramienta === h);
      if (!elegida(e.seleccion, h)) return no('herramienta_no_elegida', `La regla de selección no eligió esta herramienta: ${r?.razon ?? 'sin regla'}`);
      return repetida ? no('repetida', 'Ya se aplicó y no hay fuentes nuevas desde entonces') : SI;
    }
    case 'generar_causas': {
      const cronica = e.seleccion?.ruta === 'cronica';
      if (!e.desviacion) return no('fase_previa', 'Primero se enuncia la desviación');
      if (!cronica && !e.esNoEs?.length) return no('fase_previa', 'En la ruta aguda las causas salen de las distinciones y cambios del Es/No Es: falta especificarlo');
      if (cronica && !e.weisbord?.length) return no('fase_previa', 'En la ruta crónica las causas salen del barrido de Weisbord: falta hacerlo');
      return repetida ? no('repetida', 'Ya se generaron causas y no hay fuentes nuevas desde entonces') : SI;
    }
    case 'probar_causas':
      if (e.causas.length === 0) return no('fase_previa', 'No hay causas que probar');
      if (filasDePrueba(e).length === 0) return no('fase_previa', 'No hay filas contra las cuales probar las causas');
      if (causas.every((c) => c.estado !== 'sin_probar') && repetida) return no('repetida', 'Las causas ya están probadas y no hay fuentes nuevas desde entonces');
      return SI;
    case 'disenar_verificacion':
      if (!causa) return no('parametro_invalido', d.causa ? `${d.causa} no es una causa del caso` : 'No indicó qué causa verificar');
      if (causa.estado === 'sin_probar') return no('fase_previa', `${causa.id} aún no se prueba contra la especificación`);
      if (causa.estado === 'descartada') return no('parametro_invalido', `${causa.id} ya quedó descartada por la prueba (${causa.descartadaPor.join(', ')})`);
      return causa.verificacion ? no('repetida', `${causa.id} ya tiene verificación diseñada`) : SI;
    case 'proponer_intervencion':
      if (!causa) return no('parametro_invalido', d.causa ? `${d.causa} no es una causa del caso` : 'No indicó para qué causa');
      if (causa.estado === 'descartada') {
        return no('nivel_insuficiente', `${causa.id} quedó descartada por la prueba de causas (${causa.descartadaPor.join(', ')}): no se interviene sobre una causa que la evidencia no sostiene`);
      }
      if (causa.estado !== 'explica_todo') return no('fase_previa', `${causa.id} no ha demostrado explicar todas las filas (estado: ${causa.estado})`);
      if (causa.nivel < 3) return no('nivel_insuficiente', `${causa.id} tiene N${causa.nivel}: con N0 a N2 solo se admiten acciones de verificación; intervenir pide N3 o N4`);
      if (causa.contradicciones.length) return no('nivel_insuficiente', `${causa.id} tiene contradicciones sin resolver: ${causa.contradicciones.join(', ')}`);
      return causa.intervencion ? no('repetida', `${causa.id} ya tiene intervención propuesta`) : SI;
    case 'solicitar_documento':
      if (!d.documento.trim()) return no('parametro_invalido', 'No dijo qué documento pedir');
      if (e.presupuesto.dias >= e.presupuesto.diasMax) return no('presupuesto', `Se agotaron los ${e.presupuesto.diasMax} días de campo`);
      return previa ? no('repetida', 'Ese documento ya se pidió') : SI;
    case 'detenerse': {
      // Se acepta con el criterio cumplido, o como entrega parcial si solo falta lo que el consultor puede dar.
      const c = criterioDeParo(e, causas);
      if (c.cumplido || esperaDelConsultor(e, causas, nivelesDe(e), c).length > 0) return SI;
      return no('criterio_no_cumplido', `Aún falta: ${c.faltantes.join('; ')}`);
    }
  }
}
