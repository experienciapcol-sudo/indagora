// Caso F7 ficticio del Laboratorio: entrevistas con personas simuladas de una imprenta con
// más reimpresiones por color desde septiembre. Ruta aguda.
// Causa plantada: el papel bond del proveedor nuevo absorbe distinto y los colores salen opacos.
// Los fragmentos prohibidos son datos del documento de laboratorio que nunca se entregó:
// si aparecen en la salida, el agente los inventó o se filtraron.
import type { CasoEvaluacion } from '../../../../scripts/arnes/tipos';
import type { FuenteEntrada } from '../../tipos';

const E1: FuenteEntrada = {
  id: 'E1',
  tipo: 'entrevista',
  rol: 'Jefe de producción',
  modalidad: 'transcripcion',
  titulo: 'Entrevista simulada con el jefe de producción',
  entrevistador: 'Consultora',
  texto: [
    'Consultora: ¿Qué pasa con las reimpresiones?',
    'Jefe de producción: Las reimpresiones por color subieron en septiembre, casi una de cada cinco órdenes.',
    'Jefe de producción: Yo creo que la prensa ya está vieja y pide mantenimiento.',
    'Consultora: ¿Qué cambió en septiembre?',
    'Jefe de producción: Empezamos a comprarle el papel bond a Corlana porque salía más barato.',
    'Consultora: ¿Hay trabajos que salgan bien?',
    'Jefe de producción: Lo que se imprime en papel couché sale bien, ese papel no cambió de proveedor.',
  ].join('\n'),
};

const E2: FuenteEntrada = {
  id: 'E2',
  tipo: 'entrevista',
  rol: 'Prensista',
  modalidad: 'transcripcion',
  titulo: 'Entrevista simulada con el prensista',
  entrevistador: 'Consultora',
  texto: [
    'Consultora: ¿Cómo ve la calidad del color?',
    'Prensista: Desde que llegó el papel de Corlana los colores salen opacos en el bond.',
    'Prensista: Ese papel se chupa la tinta y tengo que meterle más carga para igualar el tono.',
    'Prensista: En el couché la misma prensa y la misma tinta dan el tono a la primera.',
    'Consultora: ¿Y el ayudante nuevo?',
    'Prensista: El ayudante nuevo solo corta y empaca, no toca la prensa.',
  ].join('\n'),
};

const E3: FuenteEntrada = {
  id: 'E3',
  tipo: 'entrevista',
  rol: 'Ejecutiva de ventas',
  modalidad: 'transcripcion',
  titulo: 'Entrevista simulada con la ejecutiva de ventas',
  entrevistador: 'Consultora',
  texto: [
    'Consultora: ¿Qué le reclaman los clientes?',
    'Ejecutiva de ventas: Los reclamos son por tono, dicen que los volantes se ven deslavados.',
    'Ejecutiva de ventas: Los reclamos casi siempre son de volantes y hojas membretadas en bond.',
    'Ejecutiva de ventas: Hay clientes muy exigentes que reclaman por cualquier cosa.',
  ].join('\n'),
};

export const CASO_IMPRENTA: CasoEvaluacion = {
  id: 'imprenta',
  titulo: 'Imprenta Albor: reimpresiones por color (Laboratorio)',
  objetivo: 'Entender por qué aumentaron las reimpresiones por problemas de color.',
  fuentes: [E1, E2, E3],
  patrones: {
    causa: /papel|bond|Corlana|absorb|chupa/i,
    distractores: /prensa (vieja|desgastada)|mantenimiento|ayudante|operario nuevo|exigentes/i,
  },
  laboratorio: {
    fragmentosProhibidos: ['lote 3307', '14.2 por ciento', 'gramaje de 68 gramos'],
  },
  verdad: {
    causa:
      'En septiembre la imprenta cambió el papel bond al proveedor Corlana por precio. Ese papel absorbe más tinta y los colores salen opacos, lo que obliga a reimprimir; el couché, que no cambió de proveedor, sale bien con la misma prensa y la misma tinta, lo que descarta la prensa.',
    oracionesClave: [
      { fuente: 'E1', fragmento: 'la prensa ya está vieja y pide mantenimiento', tipo: 'opinion', primeraMano: false, nivelEsperado: 1, papel: 'Hipótesis del jefe, sin hechos.' },
      { fuente: 'E1', fragmento: 'Las reimpresiones por color subieron en septiembre', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 2, papel: 'Fecha de inicio.' },
      { fuente: 'E1', fragmento: 'Empezamos a comprarle el papel bond a Corlana', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 3, papel: 'El cambio.' },
      { fuente: 'E1', fragmento: 'Lo que se imprime en papel couché sale bien', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 3, papel: 'Contraste.' },
      { fuente: 'E2', fragmento: 'Desde que llegó el papel de Corlana los colores salen opacos', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 3, papel: 'Distinción, desde quien imprime.' },
      { fuente: 'E2', fragmento: 'Ese papel se chupa la tinta', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 2, papel: 'Mecanismo.' },
      { fuente: 'E2', fragmento: 'la misma prensa y la misma tinta dan el tono a la primera', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 3, papel: 'Contraste que descarta la prensa.' },
      { fuente: 'E3', fragmento: 'casi siempre son de volantes y hojas membretadas en bond', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 2, papel: 'Los reclamos se concentran en bond.' },
    ],
    distractores: [
      { fuente: 'E2', fragmento: 'El ayudante nuevo solo corta y empaca', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 2, papel: 'Descarta al ayudante nuevo.' },
      { fuente: 'E3', fragmento: 'Hay clientes muy exigentes', tipo: 'opinion', primeraMano: false, nivelEsperado: 1, papel: 'Juicio sin hechos.' },
    ],
    corroboraciones: [
      { a: { fuente: 'E1', fragmento: 'Empezamos a comprarle el papel bond a Corlana' }, b: { fuente: 'E2', fragmento: 'Desde que llegó el papel de Corlana los colores salen opacos' }, nota: 'El papel nuevo, desde producción y desde la prensa.' },
      { a: { fuente: 'E1', fragmento: 'Lo que se imprime en papel couché sale bien' }, b: { fuente: 'E2', fragmento: 'la misma prensa y la misma tinta dan el tono a la primera' }, nota: 'Contraste del couché, desde dos roles.' },
      { a: { fuente: 'E2', fragmento: 'Desde que llegó el papel de Corlana los colores salen opacos' }, b: { fuente: 'E3', fragmento: 'casi siempre son de volantes y hojas membretadas en bond' }, nota: 'El problema se concentra en bond.' },
    ],
    fueraDeAlcance: [
      'Recomendar cambiar o reparar la prensa.',
      'Culpar al ayudante nuevo o a los clientes.',
      'Dar cifras del lote, del gramaje o del porcentaje de merma: no se entregó ningún documento.',
    ],
  },
};
