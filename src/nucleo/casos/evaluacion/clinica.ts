// Caso F7 ficticio: una clínica dental con más inasistencias desde mayo. Ruta aguda.
// Causa plantada: el sistema de agenda nuevo (abril) solo manda recordatorios por correo.
import type { CasoEvaluacion } from '../../../../scripts/arnes/tipos';
import type { FuenteEntrada } from '../../tipos';

const E1: FuenteEntrada = {
  id: 'E1',
  tipo: 'entrevista',
  rol: 'Director de la clínica',
  modalidad: 'transcripcion',
  titulo: 'Entrevista con el director',
  entrevistador: 'Consultor',
  texto: [
    'Consultor: Gracias por recibirme. ¿Qué le preocupa de la clínica?',
    'Director de la clínica: Los pacientes ya no tienen palabra, apartan su cita y no llegan.',
    'Consultor: ¿Desde cuándo lo nota?',
    'Director de la clínica: Las inasistencias se dispararon desde mayo, se nota en la agenda vacía de las tardes.',
    'Consultor: ¿Qué cambió en la clínica en esos meses?',
    'Director de la clínica: Contratamos a una recepcionista nueva en marzo y me dicen que no les cae bien a los pacientes.',
    'Director de la clínica: También subimos los precios de limpieza en enero.',
    'Consultor: ¿Algún cambio en la forma de agendar?',
    'Director de la clínica: En abril cambiamos el sistema de agenda por uno más barato, pero eso es pura computadora.',
    'Consultor: ¿Qué espera del diagnóstico?',
    'Director de la clínica: Que me diga cómo hacer que los pacientes cumplan.',
  ].join('\n'),
};

const E2: FuenteEntrada = {
  id: 'E2',
  tipo: 'entrevista',
  rol: 'Coordinadora de agenda',
  modalidad: 'transcripcion',
  titulo: 'Entrevista con la coordinadora de agenda',
  entrevistador: 'Consultor',
  texto: [
    'Consultor: ¿Cómo funciona la confirmación de citas?',
    'Coordinadora de agenda: El sistema nuevo solo manda el recordatorio por correo electrónico.',
    'Coordinadora de agenda: El anterior mandaba un mensaje de texto al celular un día antes de la cita.',
    'Consultor: ¿Qué le dicen los pacientes que faltan?',
    'Coordinadora de agenda: Cuando les hablo, muchos me dicen que no les llegó ningún aviso.',
    'Coordinadora de agenda: Faltan sobre todo los pacientes mayores, que casi no revisan el correo.',
    'Consultor: ¿Hay pacientes que no falten?',
    'Coordinadora de agenda: Los de ortodoncia casi no faltan porque la asistente les llama por teléfono.',
    'Consultor: ¿Y la recepcionista nueva?',
    'Coordinadora de agenda: Yo la veo amable, nadie se me ha quejado de ella.',
  ].join('\n'),
};

const E3: FuenteEntrada = {
  id: 'E3',
  tipo: 'entrevista',
  rol: 'Asistente de ortodoncia',
  modalidad: 'transcripcion',
  titulo: 'Entrevista con la asistente de ortodoncia',
  entrevistador: 'Consultor',
  texto: [
    'Consultor: ¿Cómo confirma las citas de sus pacientes?',
    'Asistente de ortodoncia: Yo les llamo un día antes a todos mis pacientes, desde siempre.',
    'Consultor: ¿Notó cambios con el sistema nuevo?',
    'Asistente de ortodoncia: A mis pacientes no les afectó, siguen llegando igual que antes.',
    'Asistente de ortodoncia: El correo del sistema nuevo a veces cae en la carpeta de no deseados.',
  ].join('\n'),
};

// Sin dos puntos en los renglones, para que ninguno se confunda con un hablante.
const D1: FuenteEntrada = {
  id: 'D1',
  tipo: 'documento',
  rol: 'Reporte mensual de inasistencias',
  modalidad: 'transcripcion',
  titulo: 'Inasistencias por mes, enero a julio',
  entrevistador: null,
  texto: [
    'Reporte mensual de inasistencias de la clínica, de enero a julio.',
    'Odontología general registró 6 por ciento de inasistencias en enero, 7 en febrero, 6 en marzo y 7 en abril.',
    'Odontología general registró 18 por ciento de inasistencias en mayo, 21 en junio y 19 en julio.',
    'Ortodoncia registró entre 4 y 6 por ciento de inasistencias en todos los meses, de enero a julio.',
    'El sistema de agenda nuevo entró en operación el 22 de abril.',
    'Desde el 22 de abril el sistema envió 0 recordatorios por mensaje de texto y 2140 por correo.',
  ].join('\n'),
};

export const CASO_CLINICA: CasoEvaluacion = {
  id: 'clinica',
  titulo: 'Clínica dental Sorvane: inasistencias a citas',
  objetivo: 'Entender por qué los pacientes faltan más a sus citas en los últimos meses.',
  fuentes: [E1, E2, E3, D1],
  patrones: {
    causa: /recordatorio|aviso|mensaje|SMS|agenda|correo/i,
    distractores: /recepcionista|precio|palabra|compromiso|cumpl/i,
  },
  verdad: {
    causa:
      'El 22 de abril la clínica cambió a un sistema de agenda que solo manda recordatorios por correo; el anterior mandaba un mensaje de texto un día antes. Desde mayo las inasistencias de odontología general pasaron de 6 a 7 por ciento a 18 a 21 por ciento. Ortodoncia, donde la asistente confirma por teléfono, no cambió, lo que descarta una causa general de los pacientes.',
    oracionesClave: [
      { fuente: 'E1', fragmento: 'Los pacientes ya no tienen palabra', tipo: 'opinion', primeraMano: false, nivelEsperado: 1, papel: 'Hipótesis del director: juicio sobre los pacientes, sin hechos.' },
      { fuente: 'E1', fragmento: 'Las inasistencias se dispararon desde mayo', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'Fecha de inicio; el reporte la respalda.' },
      { fuente: 'E1', fragmento: 'En abril cambiamos el sistema de agenda', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'El cambio previo a la desviación.' },
      { fuente: 'E2', fragmento: 'solo manda el recordatorio por correo electrónico', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'La distinción del sistema nuevo; el reporte la documenta.' },
      { fuente: 'E2', fragmento: 'mandaba un mensaje de texto al celular', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 2, papel: 'Cómo era antes.' },
      { fuente: 'E2', fragmento: 'muchos me dicen que no les llegó ningún aviso', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 2, papel: 'Mecanismo visto por quien llama a los pacientes.' },
      { fuente: 'E2', fragmento: 'Los de ortodoncia casi no faltan', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'Contraste: lo comparable que sí funciona.' },
      { fuente: 'E3', fragmento: 'Yo les llamo un día antes', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 3, papel: 'Por qué ortodoncia no cambió.' },
      { fuente: 'D1', fragmento: '18 por ciento de inasistencias en mayo', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'Magnitud documentada.' },
      { fuente: 'D1', fragmento: '0 recordatorios por mensaje de texto', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'Prueba documental del cambio.' },
    ],
    distractores: [
      { fuente: 'E1', fragmento: 'me dicen que no les cae bien', tipo: 'opinion', primeraMano: false, nivelEsperado: 1, papel: 'De oídas; la coordinadora lo contradice.' },
      { fuente: 'E1', fragmento: 'subimos los precios de limpieza en enero', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 2, papel: 'Cambio de enero: no explica el salto de mayo ni por qué ortodoncia no cambió.' },
    ],
    corroboraciones: [
      { a: { fuente: 'E1', fragmento: 'Las inasistencias se dispararon desde mayo' }, b: { fuente: 'D1', fragmento: '18 por ciento de inasistencias en mayo' }, nota: 'Inicio de la desviación.' },
      { a: { fuente: 'E2', fragmento: 'solo manda el recordatorio por correo electrónico' }, b: { fuente: 'D1', fragmento: '0 recordatorios por mensaje de texto' }, nota: 'El sistema nuevo no manda mensajes de texto.' },
      { a: { fuente: 'E2', fragmento: 'Los de ortodoncia casi no faltan' }, b: { fuente: 'E3', fragmento: 'Yo les llamo un día antes' }, nota: 'El contraste y su razón, desde dos roles.' },
      { a: { fuente: 'E2', fragmento: 'Los de ortodoncia casi no faltan' }, b: { fuente: 'D1', fragmento: 'Ortodoncia registró entre 4 y 6 por ciento' }, nota: 'El contraste documentado.' },
    ],
    fueraDeAlcance: [
      'Concluir que los pacientes son irresponsables.',
      'Culpar a la recepcionista nueva.',
      'Atribuir el problema a la subida de precios de enero.',
      'Dar cifras de ingresos perdidos que ninguna fuente menciona.',
    ],
  },
};
