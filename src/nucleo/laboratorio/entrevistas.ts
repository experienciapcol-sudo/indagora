// Plan de rondas dirigido por código y ensamblado de fuentes normales.
import type { FuenteEntrada } from '../tipos';
import type { CasoLaboratorio, Intercambio, TipoPregunta, VerdadLaboratorio } from './tipos';
import { preguntaPara } from './revelacion';

// Tope de costo intencional: 12 intercambios por caso.
export const MAX_INTERCAMBIOS = 12;

export function planDeRondas(c: CasoLaboratorio): { persona: string; tipo: TipoPregunta }[] {
  const plan: { persona: string; tipo: TipoPregunta }[] = [];
  // Por fases dentro del tope: primero TODAS las personas reciben una ronda
  // profunda (incidente, donde suelen salir los hechos de causa) antes de
  // profundizar en nadie; después documentos, cuantitativa y el resto.
  // Los documentos van antes de la cuantitativa: con 5 personas y 2 documentos
  // (los máximos de validarCaso) suman 12 y el documento clave siempre se entrega.
  // Nadie queda solo con la pregunta abierta; qué tipos faltan por persona
  // lo expone coberturaRondas en vez de ocultarlo.
  for (const persona of c.personas) plan.push({ persona: persona.id, tipo: 'abierta' });
  for (const persona of c.personas) plan.push({ persona: persona.id, tipo: 'incidente' });
  for (const doc of c.documentos) plan.push({ persona: doc.id, tipo: 'documental' });
  for (const persona of c.personas) plan.push({ persona: persona.id, tipo: 'cuantitativa' });
  for (const tipo of ['temporal', 'contraste'] as TipoPregunta[]) {
    for (const persona of c.personas) plan.push({ persona: persona.id, tipo });
  }
  return plan.slice(0, MAX_INTERCAMBIOS);
}

export interface CoberturaPersona { persona: string; tipos: TipoPregunta[]; soloAbierta: boolean }

export function coberturaRondas(c: CasoLaboratorio): CoberturaPersona[] {
  const plan = planDeRondas(c);
  return c.personas.map((p) => {
    const tipos = plan.filter((r) => r.persona === p.id).map((r) => r.tipo);
    return { persona: p.id, tipos, soloAbierta: tipos.length > 0 && tipos.every((t) => t === 'abierta') };
  });
}

export function intercambiosEntrevistados(c: CasoLaboratorio): boolean {
  // Entrevistada de verdad: cada persona recibió al menos una ronda profunda, no solo la abierta.
  return coberturaRondas(c).every((x) => x.tipos.some((t) => t !== 'abierta'));
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
