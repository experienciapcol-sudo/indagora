// Fixture ficticia del taller para las pruebas: construye una VistaAgente con vistaDe real.
// No se exporta desde index.ts.
import { crearEstado, vistaDe } from '../agente/estado';
import { clavePar } from '../niveles';
import type { Afirmacion } from '../tipos';
import type { VistaAgente } from '../agente/tipos';

export function afirmacion(parcial: Partial<Afirmacion> & { id: string }): Afirmacion {
  return {
    fuente: parcial.id.split('-')[0],
    tipoFuente: 'entrevista',
    rol: 'Dueña',
    modalidad: 'transcripcion',
    hablante: 'Dueña',
    turnos: [1],
    oraciones: [`${parcial.id.split('-')[0]}-001`],
    cita: 'El proveedor tarda 9,4 días en entregar el herraje',
    resumen: 'El proveedor tarda en entregar',
    tema: 'entrega de herraje',
    tipo: 'testimonio_especifico',
    primeraMano: true,
    rasgos: [],
    alertas: [],
    especificidad: ['9.4 días'],
    corrobora: [],
    contradice: [],
    ...parcial,
  };
}

export interface OpcionesVista { principalN3?: boolean }

export function vistaTaller(op: OpcionesVista = {}): VistaAgente {
  const n3 = op.principalN3 !== false;
  const e = crearEstado({
    id: 'caso-taller',
    titulo: 'Carpintería Velandria',
    objetivo: 'Entender las entregas tardías',
    fuentes: [
      { id: 'E1', tipo: 'entrevista', rol: 'Dueña', modalidad: 'transcripcion', titulo: 'Entrevista dueña', entrevistador: null, texto: 'ficticio' },
      { id: 'E2', tipo: 'entrevista', rol: 'Jefe de taller', modalidad: 'transcripcion', titulo: 'Entrevista jefe', entrevistador: null, texto: 'ficticio' },
      { id: 'D1', tipo: 'documento', rol: 'Registro de compras', modalidad: 'transcripcion', titulo: 'Registro', entrevistador: null, texto: 'ficticio' },
    ],
  });
  const a1 = afirmacion({ id: 'E1-A01', corrobora: ['E2-A01'] });
  const a2 = afirmacion({
    id: 'E2-A01', rol: 'Jefe de taller', hablante: 'Jefe de taller',
    cita: 'El herraje llega en 9,4 días desde febrero', corrobora: ['E1-A01'],
  });
  e.afirmaciones = [a1, a2];
  e.confirmadas = n3 ? [clavePar('E1-A01', 'E2-A01')] : [];
  e.lecturas = { E1: { turnos: [], oraciones: [], rechazos: [], costoUsd: 0, ms: 0, demo: false }, E2: { turnos: [], oraciones: [], rechazos: [], costoUsd: 0, ms: 0, demo: false } };
  const cas = (texto: string, evidencia: string[]) => ({ texto, evidencia });
  e.desviacion = {
    esperado: cas('Entregar en una semana', ['E1-A01']), ocurre: cas('Las entregas se atrasan', ['E1-A01']),
    desdeCuando: cas('Desde febrero', ['E2-A01']), cuanto: cas('Herraje en 9,4 días', ['E1-A01']), contraste: { texto: '', evidencia: [] },
    ambito: 'operacion_fisica',
  };
  e.seleccion = { ruta: 'aguda', razones: [], espinas: 'seis_m', herramientas: [] };
  e.esNoEs = [
    { id: 'R1', dimension: 'cuando', pregunta: '¿Cuándo se atrasa?', es: cas('Con herraje', ['E1-A01']), noEs: cas('Sin herraje no', ['E2-A01']), distincion: cas('Proveedor', ['E1-A01']), cambio: cas('Cambió en febrero', ['E2-A01']) },
    { id: 'R2', dimension: 'cuanto', pregunta: '¿Cuánto tarda?', es: cas('9,4 días', ['E1-A01']), noEs: cas('Antes 3,1 días', ['E2-A01']), distincion: cas('Plazo', ['E1-A01']), cambio: cas('Proveedor nuevo', ['E2-A01']) },
  ];
  e.causas = [
    { id: 'C1', enunciado: 'El proveedor de herraje tarda más', espina: 'materiales', origen: ['R1'], evidencia: ['E1-A01', 'E2-A01'] },
    { id: 'C2', enunciado: 'Falta personal', espina: 'mano_de_obra', origen: ['R1'], evidencia: ['E1-A01'] },
  ];
  e.juicios = [
    { causa: 'C1', fila: 'R1', veredicto: 'explica', razon: 'Coincide', evidencia: ['E1-A01'] },
    { causa: 'C1', fila: 'R2', veredicto: 'explica', razon: 'Coincide', evidencia: ['E2-A01'] },
    { causa: 'C2', fila: 'R1', veredicto: 'no_explica', razon: 'No coincide', evidencia: ['E1-A01'] },
  ];
  e.solicitudes = [{ id: 'S1', descripcion: 'Registro de compras de febrero', motivo: 'Confirmar plazos' }];
  return vistaDe(e, { sesionUsd: 0, globalUsd: 0, llamadasSesion: 0 });
}

// Vista con la causa principal solo N2 (una fuente, sin confirmar corroboración).
export function vistaTallerN2(): VistaAgente {
  const v = vistaTaller({ principalN3: false });
  // Sin confirmación, ambas quedan N2; la principal explica todo pero no llega a N3.
  return v;
}

export const pasosPDSA = (punteros: string[]) => ([
  { fase: 'planear' as const, texto: 'Revisar el registro de compras', responsable: 'Jefe de taller', punteros },
  { fase: 'hacer' as const, texto: 'Contrastar tres pedidos recientes', responsable: 'Dueña', punteros },
  { fase: 'estudiar' as const, texto: 'Comparar plazos reales contra lo prometido', responsable: 'Jefe de taller', punteros },
  { fase: 'actuar' as const, texto: 'Decidir si la causa sigue o se descarta', responsable: 'Dueña', punteros },
]);
