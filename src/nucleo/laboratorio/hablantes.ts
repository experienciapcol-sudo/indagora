// Un solo mecanismo de hablantes para audio transcrito y texto pegado.
import type { FuenteEntrada } from '../tipos';
import { limpiarRepeticiones } from '../segmentar';
import type { AsignacionHablante, HablanteDetectado } from './tipos';
import { normalizarTexto } from './normalizar';

const LINEA = /^\s*([^:\n]{1,40}?)\s*:\s*(.*)$/;

function pareceEtiqueta(e: string): boolean {
  const t = e.trim();
  return t.split(/\s+/).length <= 4 && /^\p{L}/u.test(t) && !/[.?!¿¡…]/.test(t);
}

export function detectarHablantes(texto: string): HablanteDetectado[] {
  const mapa = new Map<string, HablanteDetectado>();
  for (const linea of texto.split(/\r?\n/)) {
    const m = LINEA.exec(linea);
    if (!m || !pareceEtiqueta(m[1])) continue;
    const etiqueta = m[1].trim();
    const previo = mapa.get(etiqueta);
    if (previo) previo.intervenciones++;
    else mapa.set(etiqueta, { etiqueta, intervenciones: 1, muestra: m[2].trim().slice(0, 120) });
  }
  return [...mapa.values()];
}

export interface OpcionesAsignacion { limpiar?: boolean; id?: string; titulo?: string }

export function aplicarAsignaciones(
  texto: string,
  asignaciones: AsignacionHablante[],
  opciones: OpcionesAsignacion = {},
): { fuente: FuenteEntrada | null; avisos: string[] } {
  const avisos: string[] = [];
  const entrevistadores = asignaciones.filter((a) => a.esEntrevistador);
  const principales = asignaciones.filter((a) => a.esPrincipal);
  if (entrevistadores.length !== 1) avisos.push('Debe haber exactamente un hablante marcado como quien entrevista.');
  if (principales.length !== 1) avisos.push('Debe haber exactamente una persona principal.');
  if (entrevistadores.length === 1 && principales.length === 1 && entrevistadores[0] === principales[0]) {
    avisos.push('Quien entrevista no puede ser también la persona principal.');
  }
  const roles = new Map<string, string>();
  let rolInvalido = false;
  for (const a of asignaciones) {
    if (!a.rol.trim()) avisos.push(`El hablante "${a.etiqueta}" no tiene rol.`);
    // El rol se incrusta como "rol: texto" en cada turno: sin saltos, sin dos
    // puntos ni controles y con largo acotado, para no inyectar turnos falsos.
    if (/[\r\n:\u0000-\u001f\u007f]/.test(a.rol) || a.rol.trim().length > 40) {
      rolInvalido = true;
      avisos.push(`El rol de "${a.etiqueta}" no es válido: una sola línea, sin dos puntos y de hasta 40 caracteres.`);
    }
    const clave = normalizarTexto(a.rol);
    if (clave && roles.has(clave)) avisos.push(`Dos hablantes comparten el rol "${a.rol}"; no se podría saber quién dijo qué.`);
    roles.set(clave, a.etiqueta);
  }
  const detectados = detectarHablantes(texto);
  const asignadas = new Set(asignaciones.map((a) => a.etiqueta));
  const sinAsignar = detectados.filter((d) => !asignadas.has(d.etiqueta));
  for (const d of sinAsignar) avisos.push(`El hablante "${d.etiqueta}" no tiene asignación.`);
  for (const a of asignaciones) if (!detectados.some((d) => d.etiqueta === a.etiqueta)) avisos.push(`La asignación "${a.etiqueta}" no aparece en el texto.`);

  // Un hablante detectado sin asignación bloquearía la atribución: sus líneas se
  // pegarían al turno anterior. Sin asignación completa no se crea la fuente.
  if (entrevistadores.length !== 1 || principales.length !== 1 || rolInvalido || sinAsignar.length > 0 || avisos.some((a) => a.startsWith('Dos hablantes') || a.includes('no tiene rol'))) {
    return { fuente: null, avisos };
  }

  const porEtiqueta = new Map(asignaciones.map((a) => [a.etiqueta, a]));
  const limpiar = opciones.limpiar ?? false;
  const lineas: string[] = [];
  for (const linea of texto.split(/\r?\n/)) {
    const m = LINEA.exec(linea);
    const asig = m && pareceEtiqueta(m[1]) ? porEtiqueta.get(m[1].trim()) : undefined;
    if (m && asig) {
      const cuerpo = limpiar ? limpiarRepeticiones(m[2].trim()) : m[2].trim();
      lineas.push(`${asig.rol.trim()}: ${cuerpo}`);
    } else if (linea.trim()) {
      lineas.push(limpiar ? limpiarRepeticiones(linea.trim()) : linea.trim());
    }
  }

  const principal = principales[0];
  const fuente: FuenteEntrada = {
    id: opciones.id ?? 'E1',
    tipo: 'entrevista',
    rol: principal.rol.trim(),
    modalidad: 'transcripcion',
    titulo: opciones.titulo ?? `Entrevista con ${principal.rol.trim().toLowerCase()}`,
    entrevistador: entrevistadores[0].rol.trim(),
    texto: lineas.join('\n'),
  };
  return { fuente, avisos };
}
