// Guía de la siguiente entrevista desde vacíos calculados (Flanagan 1954; Glaser y Strauss 1967).
import type { VistaAgente } from '../agente/tipos';
import type { ItemGuia } from './tipos';

const preguntaDe = (tema: string) =>
  `Cuénteme la última vez que pasó ${tema.trim() || 'esto'}: ¿qué pasó exactamente, cuándo y cuánto?`;

export function generarGuia(vista: VistaAgente): ItemGuia[] {
  const { estado, causas, criterio } = vista;
  const salida: ItemGuia[] = [];
  const vistos = new Set<string>();
  const agregar = (item: ItemGuia) => {
    const clave = `${item.tipo}|${item.objetivo}|${item.paraQuien}|${item.punteros.join(',')}`;
    if (vistos.has(clave)) return;
    vistos.add(clave);
    salida.push(item);
  };
  const porId = new Map(estado.afirmaciones.map((a) => [a.id, a]));
  const rolesEvidencia = (ids: readonly string[]) => new Set(ids.map((id) => porId.get(id)?.rol).filter(Boolean) as string[]);
  const rolAlterno = (ids: readonly string[]): string => {
    const usados = rolesEvidencia(ids);
    const libre = estado.fuentes.find((f) => !usados.has(f.rol));
    if (libre) return libre.rol;
    const primero = [...usados][0];
    return primero ? `Rol distinto de ${primero}` : 'Otro rol no entrevistado todavía';
  };

  for (const faltante of criterio.faltantes) {
    agregar({
      tipo: 'vacio_criterio',
      pregunta: preguntaDe(faltante.toLowerCase()),
      paraQuien: rolAlterno(estado.afirmaciones.map((a) => a.id)),
      objetivo: faltante,
      punteros: [],
    });
  }

  for (const c of causas) {
    if (c.estado === 'descartada') continue;
    if (!(c.nivel <= 2 || c.estado === 'incompleta' || c.estado === 'sin_probar')) continue;
    const causa = estado.causas.find((x) => x.id === c.id);
    if (!causa) continue;
    agregar({
      tipo: 'causa_abierta',
      pregunta: preguntaDe(causa.enunciado.toLowerCase()),
      paraQuien: rolAlterno(causa.evidencia),
      objetivo: `Cerrar la causa ${c.id} (${c.estado}, N${c.nivel}): falta probarla o subir su nivel`,
      punteros: [...causa.evidencia],
    });
  }

  // Corroboraciones pendientes: una por par, sin duplicar por afirmación.
  const paresVistos = new Set<string>();
  for (const a of estado.afirmaciones) {
    const nivel = vista.niveles[a.id];
    for (const clave of nivel?.pendientes ?? []) {
      if (paresVistos.has(clave)) continue;
      paresVistos.add(clave);
      const ids = clave.split('|');
      agregar({
        tipo: 'corroboracion_pendiente',
        pregunta: preguntaDe(`lo que sostienen ${ids.join(' y ')}`),
        paraQuien: rolAlterno(ids),
        objetivo: `Confirmar o descartar la corroboración pendiente ${ids.join(' con ')}`,
        punteros: ids.filter((id) => porId.has(id)),
      });
    }
  }

  for (const s of estado.solicitudes) {
    agregar({
      tipo: 'documento_pedido',
      pregunta: preguntaDe(`lo relacionado con el documento pedido: ${s.descripcion.toLowerCase()}`),
      paraQuien: 'Quien custodia el documento',
      objetivo: `Aportar el documento ${s.id}: ${s.descripcion}${s.motivo ? ` (${s.motivo})` : ''}`,
      punteros: [],
    });
  }

  // Casillas vacías de desviación, Es/No Es y Weisbord.
  const casillasVacias: { nombre: string; punteros: string[] }[] = [];
  if (estado.desviacion) {
    const d = estado.desviacion;
    const campos: [string, { texto: string; evidencia: string[] }][] = [
      ['desviación: qué se esperaba', d.esperado], ['desviación: qué ocurre', d.ocurre],
      ['desviación: desde cuándo', d.desdeCuando], ['desviación: cuánto', d.cuanto], ['desviación: contraste', d.contraste],
    ];
    for (const [nombre, c] of campos) if (!c.texto.trim()) casillasVacias.push({ nombre, punteros: [] });
  }
  for (const f of estado.esNoEs ?? []) {
    const campos: [string, { texto: string }][] = [['es', f.es], ['no es', f.noEs], ['distinción', f.distincion], ['cambio', f.cambio]];
    for (const [nombre, c] of campos) if (!c.texto.trim()) casillasVacias.push({ nombre: `${f.id} ${nombre}`, punteros: [] });
  }
  for (const h of estado.weisbord ?? []) {
    if (h.estado === 'sin_datos' || !h.hallazgo.texto.trim()) casillasVacias.push({ nombre: `Weisbord ${h.casilla}`, punteros: h.hallazgo.evidencia });
  }
  for (const c of casillasVacias) {
    agregar({
      tipo: 'casilla_vacia',
      pregunta: preguntaDe(`lo que falta en la casilla ${c.nombre}`),
      paraQuien: rolAlterno(c.punteros),
      objetivo: `Completar la casilla vacía: ${c.nombre}`,
      punteros: c.punteros,
    });
  }
  return salida;
}
