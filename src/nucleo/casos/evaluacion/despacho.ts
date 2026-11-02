// Caso F7 ficticio y crónico: un despacho contable con rotación alta de auxiliares de siempre.
// Sin fecha de inicio ni contraste: debe tomar la ruta crónica (Weisbord).
// Causa plantada: los auxiliares no tienen a dónde ascender; las plazas de senior van a externos.
import type { CasoEvaluacion } from '../../../../scripts/arnes/tipos';
import type { FuenteEntrada } from '../../tipos';

const E1: FuenteEntrada = {
  id: 'E1',
  tipo: 'entrevista',
  rol: 'Socia directora',
  modalidad: 'transcripcion',
  titulo: 'Entrevista con la socia directora',
  entrevistador: 'Consultor',
  texto: [
    'Consultor: ¿Qué le preocupa del despacho?',
    'Socia directora: Los jóvenes de ahora no aguantan nada, al primer cierre difícil se van.',
    'Socia directora: Siempre hemos tenido mucha rotación de auxiliares, no recuerdo un año tranquilo.',
    'Consultor: ¿Cómo cubren los puestos de contador senior?',
    'Socia directora: Las plazas de senior las cubrimos con gente de fuera porque traen clientes.',
    'Consultor: ¿Por qué cree que se van los auxiliares?',
    'Socia directora: Seguro otros despachos pagan más, y la oficina queda lejos para muchos.',
  ].join('\n'),
};

const E2: FuenteEntrada = {
  id: 'E2',
  tipo: 'entrevista',
  rol: 'Auxiliar contable',
  modalidad: 'transcripcion',
  titulo: 'Entrevista con un auxiliar contable',
  entrevistador: 'Consultor',
  texto: [
    'Consultor: ¿Cómo es trabajar aquí?',
    'Auxiliar contable: Se aprende mucho, pero aquí nadie ha pasado de auxiliar a senior.',
    'Auxiliar contable: El sueldo no está mal, lo que falta es a dónde subir.',
    'Auxiliar contable: Me voy a ir en cuanto encuentre un lugar donde pueda crecer.',
    'Consultor: ¿Alguien les habla de su desarrollo?',
    'Auxiliar contable: Nadie nos ha explicado qué hace falta para ser senior.',
  ].join('\n'),
};

const E3: FuenteEntrada = {
  id: 'E3',
  tipo: 'entrevista',
  rol: 'Coordinadora de personal',
  modalidad: 'transcripcion',
  titulo: 'Entrevista con la coordinadora de personal',
  entrevistador: 'Consultor',
  texto: [
    'Consultor: ¿Qué dicen los auxiliares cuando renuncian?',
    'Coordinadora de personal: En la entrevista de salida casi todos dicen que no ven crecimiento.',
    'Coordinadora de personal: Los últimos tres seniors vinieron de otros despachos.',
    'Coordinadora de personal: No tenemos plan de carrera ni evaluación para los auxiliares.',
    'Coordinadora de personal: Sobre el sueldo, estamos en el promedio de la zona según la encuesta que compramos.',
  ].join('\n'),
};

const D1: FuenteEntrada = {
  id: 'D1',
  tipo: 'documento',
  rol: 'Resumen de entrevistas de salida',
  modalidad: 'transcripcion',
  titulo: 'Motivos de salida de auxiliares, últimos tres años',
  entrevistador: null,
  texto: [
    'Resumen de entrevistas de salida de auxiliares contables de los últimos tres años.',
    'Falta de crecimiento fue el motivo principal en 9 de 12 salidas.',
    'Mejor sueldo en otro lugar fue el motivo principal en 2 de 12 salidas.',
    'Distancia a la oficina fue el motivo principal en 1 de 12 salidas.',
    'Las 3 plazas de senior abiertas en esos años se cubrieron con candidatos externos.',
  ].join('\n'),
};

export const CASO_DESPACHO: CasoEvaluacion = {
  id: 'despacho',
  titulo: 'Despacho contable Yarel: rotación de auxiliares',
  objetivo: 'Entender por qué el despacho pierde a sus auxiliares contables.',
  fuentes: [E1, E2, E3, D1],
  patrones: {
    causa: /crecimiento|crecer|ascen|carrera|promoci|senior|desarrollo/i,
    distractores: /j[oó]venes|aguant|lejos|distancia|pagan m[aá]s/i,
  },
  verdad: {
    causa:
      'Los auxiliares no tienen a dónde ascender: las plazas de senior se cubren con externos, no hay plan de carrera ni evaluación, y nadie les explica qué hace falta para subir. La falta de crecimiento es el motivo principal en 9 de 12 salidas; el sueldo está en el promedio de la zona y explica 2 de 12.',
    oracionesClave: [
      { fuente: 'E1', fragmento: 'Los jóvenes de ahora no aguantan nada', tipo: 'opinion', primeraMano: false, nivelEsperado: 1, papel: 'Hipótesis de la socia: juicio sobre las personas.' },
      { fuente: 'E1', fragmento: 'Las plazas de senior las cubrimos con gente de fuera', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'La práctica que cierra el ascenso.' },
      { fuente: 'E2', fragmento: 'nadie ha pasado de auxiliar a senior', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 3, papel: 'Visto desde abajo.' },
      { fuente: 'E2', fragmento: 'lo que falta es a dónde subir', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 3, papel: 'Motivo propio.' },
      { fuente: 'E2', fragmento: 'Nadie nos ha explicado qué hace falta para ser senior', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 3, papel: 'Sin criterios de ascenso.' },
      { fuente: 'E3', fragmento: 'casi todos dicen que no ven crecimiento', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'Motivo de salida, respaldado por el resumen.' },
      { fuente: 'E3', fragmento: 'No tenemos plan de carrera ni evaluación', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 3, papel: 'Recompensas y mecanismos de apoyo.' },
      { fuente: 'D1', fragmento: 'Falta de crecimiento fue el motivo principal en 9 de 12 salidas', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'Magnitud documentada.' },
      { fuente: 'D1', fragmento: 'se cubrieron con candidatos externos', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'La práctica documentada.' },
    ],
    distractores: [
      { fuente: 'E1', fragmento: 'Seguro otros despachos pagan más', tipo: 'opinion', primeraMano: false, nivelEsperado: 1, papel: 'Suposición; el sueldo explica 2 de 12 salidas.' },
      { fuente: 'E1', fragmento: 'la oficina queda lejos para muchos', tipo: 'opinion', primeraMano: false, nivelEsperado: 1, papel: 'Explica 1 de 12 salidas.' },
    ],
    corroboraciones: [
      { a: { fuente: 'E1', fragmento: 'Las plazas de senior las cubrimos con gente de fuera' }, b: { fuente: 'E3', fragmento: 'Los últimos tres seniors vinieron de otros despachos' }, nota: 'Plazas de senior a externos, desde dirección y personal.' },
      { a: { fuente: 'E2', fragmento: 'lo que falta es a dónde subir' }, b: { fuente: 'E3', fragmento: 'casi todos dicen que no ven crecimiento' }, nota: 'Falta de crecimiento, desde un auxiliar y desde personal.' },
      { a: { fuente: 'E3', fragmento: 'casi todos dicen que no ven crecimiento' }, b: { fuente: 'D1', fragmento: 'Falta de crecimiento fue el motivo principal en 9 de 12 salidas' }, nota: 'Motivo de salida documentado.' },
      { a: { fuente: 'E2', fragmento: 'El sueldo no está mal' }, b: { fuente: 'E3', fragmento: 'estamos en el promedio de la zona' }, nota: 'El sueldo no es el motivo principal.' },
    ],
    fueraDeAlcance: [
      'Concluir que los jóvenes no tienen tolerancia.',
      'Recomendar subir sueldos como solución principal.',
      'Dar el costo de la rotación: ninguna fuente lo da.',
    ],
  },
};
