// Verdad plantada del caso del taller. Solo la leen las pruebas y el arnés de evaluación;
// la interfaz nunca la importa. Cada fragmento es un trozo literal de 4 a 10 palabras que
// aparece una sola vez en el texto de su fuente (lo comprueba la validación del caso).

export type TipoVerdad = 'opinion' | 'testimonio_especifico';

export interface OracionVerdad {
  fuente: string; // E1, E2, E3, D1
  fragmento: string;
  tipo: TipoVerdad;
  primeraMano: boolean;
  nivelEsperado: 1 | 2 | 3 | 4;
  papel: string;
}

export interface Referencia {
  fuente: string;
  fragmento: string;
}

export interface CorroboracionVerdad {
  a: Referencia;
  b: Referencia;
  nota: string;
}

export interface VerdadCaso {
  causa: string;
  oracionesClave: OracionVerdad[];
  distractores: OracionVerdad[];
  corroboraciones: CorroboracionVerdad[];
  fueraDeAlcance: string[];
}

export const VERDAD_TALLER: VerdadCaso = {
  causa:
    'En febrero compras cambió de proveedor de herraje (bisagras, correderas y jaladeras) por precio. Con el proveedor nuevo el herraje tarda en promedio 9.4 días en llegar, contra 3.1 días con el anterior, y los muebles que lo llevan (closets, cómodas, cocinas) se quedan armados esperando. Los muebles sin herraje (mesas, bancas, sillas) siguen saliendo a tiempo, lo que descarta una causa general del taller.',

  oracionesClave: [
    {
      fuente: 'E1',
      fragmento: 'el taller es flojo, así de simple',
      tipo: 'opinion',
      primeraMano: false,
      nivelEsperado: 1,
      papel: 'Hipótesis inicial de la dueña. Es un juicio sobre las personas, sin hechos, y la evidencia no lo sostiene.',
    },
    {
      fuente: 'E1',
      fragmento: 'Las quejas de clientes empezaron en marzo',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 3,
      papel: 'Cuándo empezó el problema, visto desde las quejas. Coincide con lo que dice el jefe de taller.',
    },
    {
      fuente: 'E1',
      fragmento: 'Las mesas sí salen, pero eso es porque son fáciles',
      tipo: 'opinion',
      primeraMano: false,
      nivelEsperado: 1,
      papel: 'Pista de Es/No Es dicha de pasada: la dueña nota que las mesas no se atrasan pero lo explica con una opinión.',
    },
    {
      fuente: 'E1',
      fragmento: 'En febrero compras cambió de proveedor de herraje',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 4,
      papel: 'La dueña menciona el cambio de proveedor y lo descarta. Es una pieza de la causa que ella no conecta.',
    },
    {
      fuente: 'E2',
      fragmento: 'Desde principios de marzo empezamos a quedar mal',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 3,
      papel: 'Cuándo empezó el problema (Es/No Es en el tiempo): antes de marzo salían bien.',
    },
    {
      fuente: 'E2',
      fragmento: 'se quedan parados esperando el herraje',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 2,
      papel: 'Dónde se detiene el proceso: al final, en el armado, por falta de herraje.',
    },
    {
      fuente: 'E2',
      fragmento: 'Ahorita llega en nueve o diez días',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 4,
      papel: 'Plazo actual del herraje, de primera mano. Lo corroboran compras y el registro.',
    },
    {
      fuente: 'E2',
      fragmento: 'Antes llegaba en tres días, a veces en dos',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 4,
      papel: 'Plazo anterior del herraje. Permite comparar antes y después del cambio.',
    },
    {
      fuente: 'E2',
      fragmento: 'Las mesas de comedor y las bancas salen',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 3,
      papel: 'Lo que No Es: hay muebles que salen a tiempo con la misma gente y el mismo taller.',
    },
    {
      fuente: 'E2',
      fragmento: 'Esas no llevan herraje, nada más tornillería y pegamento',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 3,
      papel: 'La distinción que explica el Es/No Es: lo que sale a tiempo no lleva herraje.',
    },
    {
      fuente: 'E2',
      fragmento: 'Dicen que en compras cambiaron de proveedor',
      tipo: 'testimonio_especifico',
      primeraMano: false,
      nivelEsperado: 1,
      papel: 'Pista de oídas. No cuenta como testimonio del jefe de taller; hay que confirmarla con compras.',
    },
    {
      fuente: 'E3',
      fragmento: 'Desde febrero se lo compramos a Brevánez',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 4,
      papel: 'El cambio de proveedor y su fecha, de primera mano. El registro lo documenta.',
    },
    {
      fuente: 'E3',
      fragmento: 'Por precio, Brevánez nos dio como doce por ciento menos',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 3,
      papel: 'Por qué se cambió de proveedor. La dueña confirma el ahorro desde otro rol.',
    },
    {
      fuente: 'E3',
      fragmento: 'Con Tlalmerin el herraje llegaba en tres días',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 4,
      papel: 'Plazo del proveedor anterior visto desde compras.',
    },
    {
      fuente: 'E3',
      fragmento: 'Brevánez se tarda entre ocho y doce días',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 4,
      papel: 'Plazo del proveedor nuevo visto desde compras. Corrobora al jefe de taller desde otro rol.',
    },
    {
      fuente: 'E3',
      fragmento: 'Las mesas y las sillas las despacho en su fecha',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 3,
      papel: 'Lo que No Es, visto desde el almacén que despacha.',
    },
    {
      fuente: 'E3',
      fragmento: 'Para esas no me piden herraje',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 3,
      papel: 'Confirma desde compras que los muebles que salen a tiempo no usan herraje.',
    },
    {
      fuente: 'D1',
      fragmento: 'Pedido 111, proveedor Brevánez, pedido el 13 de febrero',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 4,
      papel: 'Primer pedido con el proveedor nuevo: documenta la fecha del cambio.',
    },
    {
      fuente: 'D1',
      fragmento: 'El promedio de Tlalmerin en los pedidos 101 a 110',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 4,
      papel: 'Promedio documentado antes del cambio: 3.1 días.',
    },
    {
      fuente: 'D1',
      fragmento: 'El promedio de Brevánez en los pedidos 111 a 125',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 4,
      papel: 'Promedio documentado después del cambio: 9.4 días.',
    },
  ],

  distractores: [
    {
      fuente: 'E1',
      fragmento: 'Siempre tienen una excusa y nunca terminan cuando dicen',
      tipo: 'opinion',
      primeraMano: false,
      nivelEsperado: 1,
      papel: 'Generalización ("siempre", "nunca") que culpa a otra área. No trae ningún hecho verificable.',
    },
    {
      fuente: 'E1',
      fragmento: 'La semana pasada un cliente me canceló un closet',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 2,
      papel: 'Recencia: un caso reciente y llamativo que pesa más de lo que explica. Es un efecto, no una causa.',
    },
    {
      fuente: 'E1',
      fragmento: 'Contraté a un muchacho nuevo en marzo',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 3,
      papel: 'Coincide en fecha, pero trabaja en lijado y lija todos los muebles por igual; no explica por qué las mesas salen a tiempo.',
    },
    {
      fuente: 'E1',
      fragmento: 'en abril se nos descompuso la sierra grande',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 3,
      papel: 'Evento puntual de abril, posterior al inicio de los atrasos y ya resuelto.',
    },
    {
      fuente: 'E2',
      fragmento: 'La sierra escuadradora estuvo parada tres días en abril',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 3,
      papel: 'Precisa la falla de la sierra: tres días, recuperados esa semana. No explica meses de atraso.',
    },
    {
      fuente: 'E1',
      fragmento: 'Ya les estoy pagando horas extra los sábados',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 3,
      papel: 'Respuesta al problema, no causa. Las horas extra no sirven si falta el herraje.',
    },
    {
      fuente: 'E1',
      fragmento: 'Me contaron que algunos se salen temprano los viernes',
      tipo: 'opinion',
      primeraMano: false,
      nivelEsperado: 1,
      papel: 'De oídas, de una fuente que la dueña no recuerda. Refuerza su hipótesis sin sostenerla.',
    },
    {
      fuente: 'E2',
      fragmento: 'Mi gente trabaja duro, eso se lo firmo',
      tipo: 'opinion',
      primeraMano: true,
      nivelEsperado: 1,
      papel: 'Opinión defensiva de quien habla de su propia área.',
    },
    {
      fuente: 'E3',
      fragmento: 'en el taller también se tardan en armar',
      tipo: 'opinion',
      primeraMano: false,
      nivelEsperado: 1,
      papel: 'Culpa a otra área. La misma encargada dice después que el taller recoge el herraje el mismo día.',
    },
    {
      fuente: 'E3',
      fragmento: 'eso nadie me lo puede negar',
      tipo: 'opinion',
      primeraMano: true,
      nivelEsperado: 1,
      papel: 'Opinión defensiva sobre la decisión de su propia área.',
    },
    {
      fuente: 'E3',
      fragmento: 'La semana pasada me llegó un pedido incompleto',
      tipo: 'testimonio_especifico',
      primeraMano: true,
      nivelEsperado: 4,
      papel: 'Recencia: un solo pedido incompleto (el 125 del registro). El problema de fondo es el plazo, no las piezas faltantes.',
    },
    {
      fuente: 'E3',
      fragmento: 'Me contaron que a otros talleres les pasa lo mismo',
      tipo: 'opinion',
      primeraMano: false,
      nivelEsperado: 1,
      papel: 'De oídas sobre terceros; no se puede verificar dentro del caso.',
    },
  ],

  corroboraciones: [
    {
      a: { fuente: 'E2', fragmento: 'Ahorita llega en nueve o diez días' },
      b: { fuente: 'E3', fragmento: 'Brevánez se tarda entre ocho y doce días' },
      nota: 'Plazo actual del herraje, desde el taller y desde compras.',
    },
    {
      a: { fuente: 'E2', fragmento: 'Ahorita llega en nueve o diez días' },
      b: { fuente: 'D1', fragmento: 'El promedio de Brevánez en los pedidos 111 a 125' },
      nota: 'El registro documenta 9.4 días en promedio con el proveedor nuevo.',
    },
    {
      a: { fuente: 'E2', fragmento: 'Antes llegaba en tres días, a veces en dos' },
      b: { fuente: 'E3', fragmento: 'Con Tlalmerin el herraje llegaba en tres días' },
      nota: 'Plazo anterior del herraje, desde dos roles.',
    },
    {
      a: { fuente: 'E3', fragmento: 'Con Tlalmerin el herraje llegaba en tres días' },
      b: { fuente: 'D1', fragmento: 'El promedio de Tlalmerin en los pedidos 101 a 110' },
      nota: 'El registro documenta 3.1 días en promedio con el proveedor anterior.',
    },
    {
      a: { fuente: 'E3', fragmento: 'Brevánez se tarda entre ocho y doce días' },
      b: { fuente: 'D1', fragmento: 'El promedio de Brevánez en los pedidos 111 a 125' },
      nota: 'El rango que da compras coincide con el registro (de 7 a 12 días, 9.4 en promedio).',
    },
    {
      a: { fuente: 'E3', fragmento: 'Desde febrero se lo compramos a Brevánez' },
      b: { fuente: 'D1', fragmento: 'Pedido 111, proveedor Brevánez, pedido el 13 de febrero' },
      nota: 'Fecha del cambio de proveedor, documentada.',
    },
    {
      a: { fuente: 'E1', fragmento: 'En febrero compras cambió de proveedor de herraje' },
      b: { fuente: 'E3', fragmento: 'Desde febrero se lo compramos a Brevánez' },
      nota: 'El cambio de proveedor, desde la dueña y desde compras.',
    },
    {
      a: { fuente: 'E1', fragmento: 'En febrero compras cambió de proveedor de herraje' },
      b: { fuente: 'E3', fragmento: 'Por precio, Brevánez nos dio como doce por ciento menos' },
      nota: 'El motivo del cambio fue el precio: la dueña habla de ahorro y compras da la cifra.',
    },
    {
      a: { fuente: 'E2', fragmento: 'Las mesas de comedor y las bancas salen' },
      b: { fuente: 'E3', fragmento: 'Las mesas y las sillas las despacho en su fecha' },
      nota: 'Lo que No Es: los muebles sin herraje salen a tiempo, desde el taller y desde el almacén.',
    },
    {
      a: { fuente: 'E2', fragmento: 'Esas no llevan herraje, nada más tornillería y pegamento' },
      b: { fuente: 'E3', fragmento: 'Para esas no me piden herraje' },
      nota: 'La distinción entre lo que se atrasa y lo que no es el herraje.',
    },
    {
      a: { fuente: 'E2', fragmento: 'Desde principios de marzo empezamos a quedar mal' },
      b: { fuente: 'E1', fragmento: 'Las quejas de clientes empezaron en marzo' },
      nota: 'Inicio del problema en marzo, poco después del primer pedido al proveedor nuevo.',
    },
    {
      a: { fuente: 'E1', fragmento: 'Contraté a un muchacho nuevo en marzo' },
      b: { fuente: 'E2', fragmento: 'Está en lijado y va aprendiendo' },
      nota: 'Distractor corroborado: el empleado nuevo existe, pero lija todos los muebles por igual.',
    },
    {
      a: { fuente: 'E1', fragmento: 'en abril se nos descompuso la sierra grande' },
      b: { fuente: 'E2', fragmento: 'La sierra escuadradora estuvo parada tres días en abril' },
      nota: 'Distractor corroborado: la falla de la sierra ocurrió, pero duró tres días y se recuperó.',
    },
    {
      a: { fuente: 'E1', fragmento: 'Ya les estoy pagando horas extra los sábados' },
      b: { fuente: 'E2', fragmento: 'si no hay herraje los sábados no sirven de mucho' },
      nota: 'Distractor corroborado: hay horas extra, pero sin herraje no destraban los pedidos.',
    },
    {
      a: { fuente: 'E3', fragmento: 'La semana pasada me llegó un pedido incompleto' },
      b: { fuente: 'D1', fragmento: 'llegó incompleto y sin jaladeras' },
      nota: 'Distractor documentado: un solo pedido incompleto, el 125.',
    },
  ],

  fueraDeAlcance: [
    'Concluir que el personal del taller es flojo o le falta compromiso.',
    'Atribuir los atrasos a la falla de la sierra o al empleado nuevo de lijado.',
    'Recomendar despidos, sanciones o más supervisión sobre el taller.',
    'Afirmar que el proveedor nuevo incumple un contrato: no hay contrato en las fuentes.',
    'Dar cifras de costo de los atrasos o del ahorro total que ninguna fuente menciona.',
    'Afirmar que a otros talleres les pasa lo mismo con el proveedor nuevo.',
    'Recomendar regresar al proveedor anterior como hecho decidido sin comparar costo y plazo.',
    'Presentar como verificado algo que dijo una sola persona.',
  ],
};
