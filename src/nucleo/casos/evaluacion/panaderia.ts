// Caso F7 ficticio: una panadería con más devoluciones de pan dulce desde agosto. Ruta aguda.
// Causa plantada: en agosto se juntaron dos rutas de reparto del norte y el pan llega tarde.
import type { CasoEvaluacion } from '../../../../scripts/arnes/tipos';
import type { FuenteEntrada } from '../../tipos';

const E1: FuenteEntrada = {
  id: 'E1',
  tipo: 'entrevista',
  rol: 'Gerente general',
  modalidad: 'transcripcion',
  titulo: 'Entrevista con el gerente general',
  entrevistador: 'Consultora',
  texto: [
    'Consultora: ¿Qué problema quiere que revisemos?',
    'Gerente general: El pan de ahora ya no es como antes, se nota que nadie le pone cariño.',
    'Consultora: ¿Cómo lo ve en los números?',
    'Gerente general: Desde agosto las tiendas nos regresan mucho pan dulce sin vender.',
    'Consultora: ¿Qué cambió en esos meses?',
    'Gerente general: En julio cambiamos de harina porque la otra subió de precio.',
    'Gerente general: Y el panadero nuevo del turno de noche todavía no sabe hornear bien.',
    'Consultora: ¿Hubo cambios en el reparto?',
    'Gerente general: Reorganizamos las rutas para ahorrar gasolina, pero eso lo ve el jefe de reparto.',
  ].join('\n'),
};

const E2: FuenteEntrada = {
  id: 'E2',
  tipo: 'entrevista',
  rol: 'Jefe de reparto',
  modalidad: 'transcripcion',
  titulo: 'Entrevista con el jefe de reparto',
  entrevistador: 'Consultora',
  texto: [
    'Consultora: ¿Cómo se reparte el pan a las tiendas?',
    'Jefe de reparto: En agosto juntamos las dos rutas del norte en una sola con un solo camión.',
    'Jefe de reparto: Ahora el camión llega a las últimas tiendas pasadas las diez de la mañana.',
    'Jefe de reparto: Antes llegábamos a todas antes de las siete y media.',
    'Consultora: ¿Y las tiendas del sur?',
    'Jefe de reparto: Las tiendas del sur siguen con la misma ruta de siempre y el mismo horario.',
  ].join('\n'),
};

const E3: FuenteEntrada = {
  id: 'E3',
  tipo: 'entrevista',
  rol: 'Encargada de tienda',
  modalidad: 'transcripcion',
  titulo: 'Entrevista con la encargada de una tienda del norte',
  entrevistador: 'Consultora',
  texto: [
    'Consultora: ¿Qué pasa con el pan dulce en su tienda?',
    'Encargada de tienda: El pan llega cuando ya pasó la hora del café.',
    'Encargada de tienda: La gente compra el pan dulce temprano, antes de irse a trabajar.',
    'Encargada de tienda: Lo que queda a mediodía se devuelve a la panadería.',
    'Consultora: ¿Y el sabor del pan?',
    'Encargada de tienda: El pan sabe igual, los clientes no se quejan del sabor.',
  ].join('\n'),
};

const D1: FuenteEntrada = {
  id: 'D1',
  tipo: 'documento',
  rol: 'Registro de devoluciones por zona',
  modalidad: 'transcripcion',
  titulo: 'Devoluciones de pan dulce por zona, junio a septiembre',
  entrevistador: null,
  texto: [
    'Registro de devoluciones de pan dulce por zona, de junio a septiembre.',
    'Zona norte devolvió 4 por ciento en junio y 5 por ciento en julio.',
    'Zona norte devolvió 15 por ciento en agosto y 17 por ciento en septiembre.',
    'Zona sur devolvió entre 4 y 5 por ciento en cada mes de junio a septiembre.',
    'En septiembre la hora promedio de llegada a las tiendas del norte fue a las diez con veinte.',
  ].join('\n'),
};

export const CASO_PANADERIA: CasoEvaluacion = {
  id: 'panaderia',
  titulo: 'Panadería Corvén: devoluciones de pan dulce',
  objetivo: 'Entender por qué las tiendas regresan más pan dulce sin vender desde hace unos meses.',
  fuentes: [E1, E2, E3, D1],
  patrones: {
    causa: /ruta|reparto|cami[oó]n|llegada|llega tarde|entrega/i,
    distractores: /harina|panadero|hornea|cari[nñ]o|receta/i,
  },
  verdad: {
    causa:
      'En agosto la panadería juntó las dos rutas de reparto del norte en una con un solo camión. El pan llega a las últimas tiendas del norte después de las diez, cuando la gente ya compró su pan dulce, y lo que sobra se devuelve: el norte pasó de 4 a 5 por ciento de devoluciones a 15 a 17 por ciento. El sur, con la ruta de siempre, no cambió, lo que descarta la harina y el horneado, que son iguales para las dos zonas.',
    oracionesClave: [
      { fuente: 'E1', fragmento: 'El pan de ahora ya no es como antes', tipo: 'opinion', primeraMano: false, nivelEsperado: 1, papel: 'Hipótesis del gerente sobre la calidad, sin hechos.' },
      { fuente: 'E1', fragmento: 'Desde agosto las tiendas nos regresan mucho pan dulce', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'Inicio de la desviación.' },
      { fuente: 'E2', fragmento: 'En agosto juntamos las dos rutas del norte', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 2, papel: 'El cambio.' },
      { fuente: 'E2', fragmento: 'llega a las últimas tiendas pasadas las diez', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'La distinción, documentada en el registro.' },
      { fuente: 'E2', fragmento: 'Las tiendas del sur siguen con la misma ruta', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'Contraste.' },
      { fuente: 'E3', fragmento: 'El pan llega cuando ya pasó la hora del café', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 3, papel: 'El mecanismo desde la tienda.' },
      { fuente: 'E3', fragmento: 'La gente compra el pan dulce temprano', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 2, papel: 'Por qué la hora importa.' },
      { fuente: 'D1', fragmento: 'Zona norte devolvió 15 por ciento en agosto', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'Magnitud documentada.' },
      { fuente: 'D1', fragmento: 'Zona sur devolvió entre 4 y 5 por ciento', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'Contraste documentado.' },
    ],
    distractores: [
      { fuente: 'E1', fragmento: 'En julio cambiamos de harina', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 2, papel: 'La harina es la misma en el sur, que no cambió.' },
      { fuente: 'E1', fragmento: 'el panadero nuevo del turno de noche', tipo: 'opinion', primeraMano: false, nivelEsperado: 1, papel: 'Hornea para las dos zonas; no distingue norte de sur.' },
      { fuente: 'E3', fragmento: 'El pan sabe igual', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 2, papel: 'Contradice la hipótesis de calidad.' },
    ],
    corroboraciones: [
      { a: { fuente: 'E1', fragmento: 'Desde agosto las tiendas nos regresan mucho pan dulce' }, b: { fuente: 'D1', fragmento: 'Zona norte devolvió 15 por ciento en agosto' }, nota: 'Inicio de la desviación.' },
      { a: { fuente: 'E2', fragmento: 'llega a las últimas tiendas pasadas las diez' }, b: { fuente: 'D1', fragmento: 'a las diez con veinte' }, nota: 'Hora de llegada al norte.' },
      { a: { fuente: 'E2', fragmento: 'llega a las últimas tiendas pasadas las diez' }, b: { fuente: 'E3', fragmento: 'El pan llega cuando ya pasó la hora del café' }, nota: 'Llegada tarde desde reparto y desde la tienda.' },
      { a: { fuente: 'E2', fragmento: 'Las tiendas del sur siguen con la misma ruta' }, b: { fuente: 'D1', fragmento: 'Zona sur devolvió entre 4 y 5 por ciento' }, nota: 'Contraste del sur.' },
    ],
    fueraDeAlcance: [
      'Culpar a la harina nueva o al panadero nuevo.',
      'Concluir que el personal no le pone empeño.',
      'Dar el costo de las devoluciones o el ahorro de gasolina: ninguna fuente lo da.',
    ],
  },
};
