// Caso F7 ficticio de evidencia insuficiente: un hotel con quejas de limpieza desde junio.
// La causa plantada (más cuartos por turno) la dice una sola persona y no hay documento:
// no puede pasar de N2, así que lo correcto es verificar, no intervenir.
import type { CasoEvaluacion } from '../../../../scripts/arnes/tipos';
import type { FuenteEntrada } from '../../tipos';

const E1: FuenteEntrada = {
  id: 'E1',
  tipo: 'entrevista',
  rol: 'Gerente del hotel',
  modalidad: 'transcripcion',
  titulo: 'Entrevista con la gerente del hotel',
  entrevistador: 'Consultora',
  texto: [
    'Consultora: ¿Qué está pasando con la limpieza?',
    'Gerente del hotel: El personal de limpieza ya no tiene vocación de servicio.',
    'Gerente del hotel: Las calificaciones de limpieza en las reseñas bajaron desde junio.',
    'Consultora: ¿Qué cambió por esas fechas?',
    'Gerente del hotel: En mayo cambiamos de proveedor de sábanas y toallas.',
    'Gerente del hotel: Y los huéspedes de ahora se quejan de todo.',
    'Consultora: ¿Cambió algo en los turnos de limpieza?',
    'Gerente del hotel: Eso lo maneja el ama de llaves, yo no tengo el detalle.',
  ].join('\n'),
};

const E2: FuenteEntrada = {
  id: 'E2',
  tipo: 'entrevista',
  rol: 'Camarista',
  modalidad: 'transcripcion',
  titulo: 'Entrevista con una camarista',
  entrevistador: 'Consultora',
  texto: [
    'Consultora: ¿Cómo es un turno normal para usted?',
    'Camarista: Desde junio nos tocan dieciocho cuartos por turno en vez de doce.',
    'Camarista: No alcanza el tiempo para tallar los baños como antes.',
    'Consultora: ¿Y las sábanas nuevas?',
    'Camarista: Las sábanas nuevas están bien, no he visto diferencia.',
  ].join('\n'),
};

const E3: FuenteEntrada = {
  id: 'E3',
  tipo: 'entrevista',
  rol: 'Recepcionista',
  modalidad: 'transcripcion',
  titulo: 'Entrevista con el recepcionista',
  entrevistador: 'Consultora',
  texto: [
    'Consultora: ¿Qué le dicen los huéspedes?',
    'Recepcionista: Las quejas por baños sucios empezaron a llegar en junio.',
    'Recepcionista: Me han contado que en limpieza hubo recorte de personal, pero no sé si es cierto.',
    'Recepcionista: De las suites casi no hay quejas, esas las limpia otro equipo.',
  ].join('\n'),
};

export const CASO_HOTEL: CasoEvaluacion = {
  id: 'hotel',
  titulo: 'Hotel Marisal: quejas de limpieza',
  objetivo: 'Entender por qué bajaron las calificaciones de limpieza del hotel.',
  fuentes: [E1, E2, E3],
  patrones: {
    causa: /cuartos|habitaciones|carga|turno|recorte|personal de limpieza insuficiente|dieciocho|18/i,
    distractores: /vocaci|s[aá]banas|toallas|proveedor|hu[eé]spedes/i,
  },
  verdad: {
    causa:
      'Según una sola camarista, desde junio a cada una le tocan dieciocho cuartos por turno en vez de doce y no alcanza el tiempo para tallar los baños. Coincide en fecha con las quejas, pero nadie más lo dice de primera mano y no hay documento de turnos: queda en N2 y solo admite verificación (pedir la asignación de cuartos por turno al ama de llaves).',
    oracionesClave: [
      { fuente: 'E1', fragmento: 'ya no tiene vocación de servicio', tipo: 'opinion', primeraMano: false, nivelEsperado: 1, papel: 'Hipótesis de la gerente: juicio sobre las personas.' },
      { fuente: 'E1', fragmento: 'Las calificaciones de limpieza en las reseñas bajaron desde junio', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 3, papel: 'Fecha de inicio.' },
      { fuente: 'E2', fragmento: 'nos tocan dieciocho cuartos por turno en vez de doce', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 2, papel: 'La causa probable, de una sola fuente.' },
      { fuente: 'E2', fragmento: 'No alcanza el tiempo para tallar los baños', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 2, papel: 'Mecanismo, misma fuente.' },
      { fuente: 'E3', fragmento: 'Las quejas por baños sucios empezaron a llegar en junio', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 3, papel: 'Fecha de inicio desde recepción.' },
      { fuente: 'E3', fragmento: 'De las suites casi no hay quejas', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 2, papel: 'Contraste.' },
      { fuente: 'E3', fragmento: 'hubo recorte de personal, pero no sé si es cierto', tipo: 'opinion', primeraMano: false, nivelEsperado: 1, papel: 'De oídas: no corrobora a la camarista.' },
    ],
    distractores: [
      { fuente: 'E1', fragmento: 'En mayo cambiamos de proveedor de sábanas y toallas', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 2, papel: 'Las quejas son por baños, y la camarista no ve diferencia.' },
      { fuente: 'E1', fragmento: 'los huéspedes de ahora se quejan de todo', tipo: 'opinion', primeraMano: false, nivelEsperado: 1, papel: 'Juicio sin hechos.' },
    ],
    corroboraciones: [
      { a: { fuente: 'E1', fragmento: 'Las calificaciones de limpieza en las reseñas bajaron desde junio' }, b: { fuente: 'E3', fragmento: 'Las quejas por baños sucios empezaron a llegar en junio' }, nota: 'Inicio en junio, desde gerencia y recepción.' },
    ],
    fueraDeAlcance: [
      'Intervenir sobre la carga de cuartos como si estuviera corroborada.',
      'Presentar como verificado lo que dijo solo la camarista.',
      'Culpar a las sábanas nuevas o a la vocación del personal.',
      'Afirmar que hubo un recorte de personal: solo es un rumor.',
    ],
  },
};
