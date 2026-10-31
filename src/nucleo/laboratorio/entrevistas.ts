// Plan de rondas dirigido por código y ensamblado de fuentes normales.
import type { FuenteEntrada } from '../tipos';
import type { CasoLaboratorio, Intercambio, TipoPregunta, VerdadLaboratorio } from './tipos';
import { preguntaPara } from './revelacion';

export const MAX_INTERCAMBIOS = 12;

export function planDeRondas(c: CasoLaboratorio): { persona: string; tipo: TipoPregunta }[] {
  const plan: { persona: string; tipo: TipoPregunta }[] = [];
  for (const persona of c.personas) plan.push({ persona: persona.id, tipo: 'abierta' });
  let primeraCuantitativa = true;
  for (const persona of c.personas) {
    for (const tipo of ['temporal', 'contraste', 'incidente', 'cuantitativa'] as TipoPregunta[]) {
      plan.push({ persona: persona.id, tipo });
      if (tipo === 'cuantitativa' && primeraCuantitativa) {
        primeraCuantitativa = false;
        for (const doc of c.documentos) plan.push({ persona: doc.id, tipo: 'documental' });
      }
    }
  }
  return plan.slice(0, MAX_INTERCAMBIOS);
}

export function intercambiosEntrevistados(c: CasoLaboratorio): boolean {
  return planDeRondas(c).length >= c.personas.length;
}

export function fuentesDeIntercambios(c: CasoLaboratorio, xs: Intercambio[], docs: FuenteEntrada[]): FuenteEntrada[] {
  const fuentes: FuenteEntrada[] = [];
  for (const persona of c.personas) {
    const suyos = xs.filter((x) => x.persona === persona.id && x.tipoPregunta !== 'documental');
    if (!suyos.length) continue;
    const lineas: string[] = [];
    for (const x of suyos) {
      lineas.push(`Consultor: ${x.pregunta}`);
      lineas.push(`${persona.rol}: ${x.respuesta}`);
    }
    fuentes.push({
      id: `E${fuentes.length + 1}`,
      tipo: 'entrevista',
      rol: persona.rol,
      modalidad: 'transcripcion',
      titulo: `Entrevista con ${persona.rol.toLowerCase()}`,
      entrevistador: 'Consultor',
      texto: lineas.join('\n'),
    });
  }
  return [...fuentes, ...docs];
}

// El texto de un documento simulado son sus hechos, un renglón por hecho.
export function fuenteDocumento(c: CasoLaboratorio, v: VerdadLaboratorio, documentoId: string, ordenEntrega: number): FuenteEntrada | null {
  const doc = c.documentos.find((d) => d.id === documentoId);
  if (!doc) return null;
  const lineas = v.hechos.filter((h) => h.dueno === documentoId).map((h) => h.texto);
  if (!lineas.length) return null;
  return {
    id: `D${ordenEntrega}`,
    tipo: 'documento',
    rol: doc.titulo,
    modalidad: 'transcripcion',
    titulo: doc.titulo,
    entrevistador: null,
    texto: lineas.join('\n'),
  };
}

export function preguntaDeRonda(c: CasoLaboratorio, tipo: TipoPregunta): string {
  return preguntaPara(tipo, c.parametros.sintoma);
}
