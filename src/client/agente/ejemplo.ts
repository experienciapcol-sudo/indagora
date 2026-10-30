// Vista ficticia del caso del taller (Carpintería Velandria) para desarrollo y pruebas.
// No se importa en producción: la interfaz recibe la vista real de /api/agente.
import type {
  Causa,
  CausaEvaluada,
  EstadoAgente,
  EventoTraza,
  FilaEsNoEs,
  Juicio,
  LecturaFuente,
  VistaAgente,
} from '../../nucleo/agente/tipos';
import { CASO_TALLER } from '../../nucleo/casos/taller';
import { calcularNiveles, clavePar } from '../../nucleo/niveles';
import type { Afirmacion } from '../../nucleo/tipos';
import { nivelMaximo } from './logica';

// ---------- afirmaciones ----------

function af(id: string, rol: string, hablante: string, oraciones: string[], cita: string, resumen: string, tema: string, extra: Partial<Afirmacion> = {}): Afirmacion {
  const fuente = id.split('-')[0];
  return {
    id,
    fuente,
    tipoFuente: fuente.startsWith('D') ? 'documento' : 'entrevista',
    rol,
    modalidad: 'transcripcion',
    hablante,
    turnos: [],
    oraciones,
    cita,
    resumen,
    tema,
    tipo: 'testimonio_especifico',
    primeraMano: true,
    rasgos: [],
    alertas: [],
    especificidad: [],
    corrobora: [],
    contradice: [],
    ...extra,
  };
}

const AFIRMACIONES: Afirmacion[] = [
  af('E1-A01', 'Dueña', 'Dueña', ['E1-003'], 'Pues que el taller es flojo, así de simple.', 'La dueña cree que el taller no se esfuerza.', 'causa atribuida', {
    tipo: 'opinion',
    primeraMano: false,
    rasgos: ['defensa'],
    alertas: [{ tipo: 'generalizacion', marcador: 'así de simple' }],
  }),
  af('E1-A02', 'Dueña', 'Dueña', ['E1-007'], 'Las quejas de clientes empezaron en marzo, más o menos.', 'Las quejas de clientes empezaron en marzo.', 'inicio del problema', { especificidad: ['marzo'] }),
  af('E1-A03', 'Dueña', 'Dueña', ['E1-033'], 'En febrero compras cambió de proveedor de herraje y nos ahorramos un buen dinero.', 'En febrero compras cambió de proveedor de herraje para ahorrar.', 'cambio de proveedor', { especificidad: ['febrero'] }),
  af('E1-A04', 'Dueña', 'Dueña', ['E1-015'], 'Contraté a un muchacho nuevo en marzo y todavía no agarra el ritmo.', 'Un empleado nuevo entró en marzo y aún está aprendiendo.', 'personal nuevo', { especificidad: ['marzo'] }),
  af('E1-A05', 'Dueña', 'Dueña', ['E1-016'], 'En abril se nos descompuso la sierra grande.', 'La sierra grande se descompuso en abril.', 'maquinaria', { especificidad: ['abril'] }),
  af('E1-A06', 'Dueña', 'Dueña', ['E1-027'], 'Las mesas sí salen, pero eso es porque son fáciles.', 'Las mesas salen a tiempo, según la dueña porque son fáciles.', 'muebles a tiempo', { tipo: 'opinion', primeraMano: false }),

  af('E2-A01', 'Jefe de taller', 'Jefe de taller', ['E2-002'], 'Desde principios de marzo empezamos a quedar mal con las fechas.', 'Los atrasos empezaron a principios de marzo.', 'inicio del problema', { especificidad: ['principios de marzo'], corrobora: ['E1-A02'] }),
  af('E2-A02', 'Jefe de taller', 'Jefe de taller', ['E2-005'], 'Salíamos bien, uno que otro pedido se pasaba un día o dos.', 'Antes de marzo las entregas salían bien, con retrasos de uno o dos días.', 'antes del problema', { especificidad: ['un día o dos'] }),
  af('E2-A03', 'Jefe de taller', 'Jefe de taller', ['E2-010'], 'Los cuerpos de los closets y las cómodas quedan listos y se quedan parados esperando el herraje.', 'Closets y cómodas esperan armados la llegada del herraje.', 'cuello de botella', {}),
  af('E2-A04', 'Jefe de taller', 'Jefe de taller', ['E2-018', 'E2-019'], 'Ahorita llega en nueve o diez días desde que se pide. Antes llegaba en tres días, a veces en dos.', 'El herraje tarda 9 o 10 días; antes tardaba 3.', 'plazo del herraje', { especificidad: ['nueve o diez días', 'tres días'], corrobora: ['E3-A03'] }),
  af('E2-A05', 'Jefe de taller', 'Jefe de taller', ['E2-022'], 'En la última semana tenía once muebles parados por correderas.', 'Once muebles parados por correderas en la última semana.', 'cuello de botella', { especificidad: ['once muebles'] }),
  af('E2-A06', 'Jefe de taller', 'Jefe de taller', ['E2-026'], 'Las mesas de comedor y las bancas salen en su fecha.', 'Mesas y bancas, sin herraje, salen a tiempo.', 'muebles a tiempo', { corrobora: ['E3-A04'] }),
  af('E2-A07', 'Jefe de taller', 'Jefe de taller', ['E2-032'], 'La sierra escuadradora estuvo parada tres días en abril y quedó bien.', 'La sierra estuvo parada tres días en abril y se recuperó esa semana.', 'maquinaria', { especificidad: ['tres días', 'abril'] }),
  af('E2-A08', 'Jefe de taller', 'Jefe de taller', ['E2-036'], 'Está en lijado y va aprendiendo.', 'El empleado nuevo está en lijado y aprende; lija mesas y closets por igual.', 'personal nuevo', {}),

  af('E3-A01', 'Encargada de compras y almacén', 'Encargada de compras', ['E3-007'], 'Desde febrero se lo compramos a Brevánez.', 'Desde febrero el herraje se compra a Brevánez; antes a Tlalmerin.', 'cambio de proveedor', { especificidad: ['febrero'], corrobora: ['E1-A03'] }),
  af('E3-A02', 'Encargada de compras y almacén', 'Encargada de compras', ['E3-009'], 'Por precio, Brevánez nos dio como doce por ciento menos en bisagras y correderas.', 'Se cambió de proveedor por precio, con un descuento de alrededor de 12 por ciento.', 'cambio de proveedor', { especificidad: ['doce por ciento'] }),
  af('E3-A03', 'Encargada de compras y almacén', 'Encargada de compras', ['E3-013'], 'Brevánez se tarda entre ocho y doce días, porque lo manda desde su bodega en otro estado.', 'Brevánez entrega entre 8 y 12 días desde otro estado.', 'plazo del herraje', { especificidad: ['ocho y doce días'] }),
  af('E3-A04', 'Encargada de compras y almacén', 'Encargada de compras', ['E3-021', 'E3-022'], 'Las mesas y las sillas las despacho en su fecha. Para esas no me piden herraje, nada más tornillería del almacén.', 'Mesas y sillas salen a tiempo porque no llevan herraje.', 'muebles a tiempo', { corrobora: ['E2-A06'] }),

  af('D1-A01', 'Registro de recepciones de herraje', 'Registro', ['D1-028'], 'El promedio de Brevánez en los pedidos 111 a 125 es de 9.4 días de espera.', 'El registro del almacén da 9.4 días de espera promedio con Brevánez.', 'plazo del herraje', { especificidad: ['9.4 días', 'pedidos 111 a 125'], corrobora: ['E2-A04'] }),
  af('D1-A02', 'Registro de recepciones de herraje', 'Registro', ['D1-027'], 'El promedio de Tlalmerin en los pedidos 101 a 110 es de 3.1 días de espera.', 'El registro del almacén da 3.1 días de espera promedio con Tlalmerin.', 'plazo del herraje', { especificidad: ['3.1 días', 'pedidos 101 a 110'] }),
];

// Una corroboración queda pendiente a propósito (E1-A03 con E3-A01) para mostrar el botón.
const CONFIRMADAS = [clavePar('E1-A02', 'E2-A01'), clavePar('E2-A04', 'E3-A03'), clavePar('D1-A01', 'E2-A04'), clavePar('E2-A06', 'E3-A04')];

const NIVELES = Object.fromEntries(calcularNiveles(AFIRMACIONES, new Set(CONFIRMADAS)));

// ---------- método ----------

const FILAS: FilaEsNoEs[] = [
  {
    id: 'R1',
    dimension: 'que',
    pregunta: '¿Qué muebles se entregan tarde?',
    es: { texto: 'Closets, cómodas y cocinas: los que llevan herraje.', evidencia: ['E2-A03', 'E2-A05'] },
    noEs: { texto: 'Mesas, bancas y sillas: los que no llevan herraje.', evidencia: ['E2-A06', 'E3-A04'] },
    distincion: { texto: 'Los primeros llevan bisagras, correderas o jaladeras; los segundos, solo tornillería y madera.', evidencia: ['E3-A04'] },
    cambio: { texto: 'Desde febrero el herraje lo surte otro proveedor.', evidencia: ['E3-A01', 'E1-A03'] },
  },
  {
    id: 'R2',
    dimension: 'donde',
    pregunta: '¿En qué parte del proceso se detienen?',
    es: { texto: 'En el armado, con el cuerpo listo y esperando el herraje.', evidencia: ['E2-A03'] },
    noEs: { texto: 'En corte, lijado ni acabado: la sierra se recuperó y el lijado avanza.', evidencia: ['E2-A07', 'E2-A08'] },
    distincion: { texto: 'Solo el armado depende de una pieza que llega de fuera del taller.', evidencia: ['E2-A04'] },
    cambio: { texto: 'La pieza que llega de fuera tarda más en llegar.', evidencia: ['D1-A01', 'D1-A02'] },
  },
  {
    id: 'R3',
    dimension: 'cuando',
    pregunta: '¿Desde cuándo?',
    es: { texto: 'Desde principios de marzo.', evidencia: ['E2-A01', 'E1-A02'] },
    noEs: { texto: 'Antes de marzo: las entregas salían bien, con uno o dos días de retraso.', evidencia: ['E2-A02'] },
    distincion: { texto: 'Los primeros pedidos al proveedor nuevo se hicieron a mediados de febrero y llegaron en marzo.', evidencia: ['E3-A01'] },
    cambio: { texto: 'En febrero compras cambió de proveedor por precio.', evidencia: ['E3-A01', 'E3-A02'] },
  },
  {
    id: 'R4',
    dimension: 'cuanto',
    pregunta: '¿Cuánto tarda el herraje?',
    es: { texto: '9.4 días en promedio con Brevánez, pedidos 111 a 125.', evidencia: ['D1-A01'] },
    noEs: { texto: '3.1 días en promedio con Tlalmerin, pedidos 101 a 110.', evidencia: ['D1-A02'] },
    distincion: { texto: 'Unos seis días más por pedido, con la misma forma de pedir.', evidencia: ['D1-A01', 'D1-A02'] },
    cambio: { texto: 'Brevánez surte desde una bodega en otro estado.', evidencia: ['E3-A03'] },
  },
];

const CAUSAS: Causa[] = [
  { id: 'C1', enunciado: 'El proveedor nuevo de herraje tarda 9.4 días contra 3.1 del anterior, y los muebles con herraje esperan armados.', espina: 'materiales', origen: ['R1', 'R2', 'R3', 'R4'], evidencia: ['D1-A01', 'D1-A02', 'E2-A04', 'E2-A03'] },
  { id: 'C2', enunciado: 'La gente del taller es floja y no se esfuerza.', espina: 'mano_de_obra', origen: ['R1'], evidencia: ['E1-A01'] },
  { id: 'C3', enunciado: 'La sierra escuadradora estuvo parada en abril.', espina: 'maquinaria', origen: ['R2'], evidencia: ['E2-A07', 'E1-A05'] },
  { id: 'C4', enunciado: 'El empleado nuevo en lijado no ha alcanzado el ritmo.', espina: 'mano_de_obra', origen: ['R3'], evidencia: ['E1-A04', 'E2-A08'] },
  { id: 'C5', enunciado: 'Compras eligió al proveedor solo por precio, sin medir el plazo de entrega.', espina: 'metodo', origen: ['R3', 'R4'], evidencia: ['E3-A02', 'E1-A03'] },
];

const juicio = (causa: string, fila: string, veredicto: Juicio['veredicto'], razon: string, evidencia: string[] = []): Juicio => ({ causa, fila, veredicto, razon, evidencia });

const JUICIOS: Juicio[] = [
  juicio('C1', 'R1', 'explica', 'Solo los muebles que llevan herraje salen tarde; los que no, salen a tiempo.', ['E2-A06', 'E3-A04']),
  juicio('C1', 'R2', 'explica', 'El armado es donde se espera la pieza que llega de fuera.', ['E2-A03']),
  juicio('C1', 'R3', 'explica', 'Los pedidos al proveedor nuevo empiezan a llegar tarde justo en marzo.', ['D1-A01', 'E2-A01']),
  juicio('C1', 'R4', 'explica', 'La diferencia de 9.4 contra 3.1 días es la demora observada.', ['D1-A01', 'D1-A02']),
  juicio('C2', 'R1', 'no_explica', 'Si el taller fuera flojo, tampoco saldrían mesas y bancas a tiempo.', ['E2-A06']),
  juicio('C2', 'R2', 'no_explica', 'No hay demora en corte, lijado ni acabado.', ['E2-A08']),
  juicio('C2', 'R3', 'sin_datos', 'Nadie describe un cambio de actitud en marzo.'),
  juicio('C2', 'R4', 'no_explica', 'La opinión no explica los días de espera del herraje.', ['D1-A01']),
  juicio('C3', 'R1', 'no_explica', 'La sierra sirve a todos los muebles, no solo a los de herraje.', ['E2-A07']),
  juicio('C3', 'R2', 'no_explica', 'La parada fue en corte y se recuperó esa misma semana.', ['E2-A07']),
  juicio('C3', 'R3', 'no_explica', 'La sierra se paró en abril; los atrasos empiezan en marzo.', ['E2-A07', 'E2-A01']),
  juicio('C3', 'R4', 'sin_datos', 'No hay cifras que relacionen la sierra con el herraje.'),
  juicio('C4', 'R1', 'no_explica', 'Lija mesas y closets por igual, y las mesas salen a tiempo.', ['E2-A08', 'E2-A06']),
  juicio('C4', 'R2', 'no_explica', 'El lijado no es donde se detienen los muebles.', ['E2-A03']),
  juicio('C4', 'R3', 'explica', 'Entró en marzo, cuando empiezan los atrasos.', ['E1-A04']),
  juicio('C4', 'R4', 'no_explica', 'No explica los días de espera del herraje.', ['D1-A01']),
  juicio('C5', 'R1', 'explica', 'Explica por qué cambió justo el herraje y no otros insumos.', ['E3-A02']),
  juicio('C5', 'R2', 'explica', 'La elección del proveedor afecta la pieza que llega al armado.', ['E3-A03']),
  juicio('C5', 'R3', 'explica', 'La decisión es de febrero, un mes antes de los atrasos.', ['E3-A01']),
  juicio('C5', 'R4', 'sin_datos', 'No consta si se preguntó el plazo de entrega antes de elegir.'),
];

const CAUSAS_EVALUADAS: CausaEvaluada[] = [
  { id: 'C1', nivel: nivelMaximo(CAUSAS[0].evidencia, NIVELES), estado: 'explica_todo', filasExplicadas: 4, filasTotales: 4, descartadaPor: [], contradicciones: [], verificacion: false, intervencion: true, principal: true },
  { id: 'C2', nivel: nivelMaximo(CAUSAS[1].evidencia, NIVELES), estado: 'descartada', filasExplicadas: 0, filasTotales: 4, descartadaPor: ['R1', 'R2', 'R4'], contradicciones: [], verificacion: false, intervencion: false, principal: false },
  { id: 'C3', nivel: nivelMaximo(CAUSAS[2].evidencia, NIVELES), estado: 'descartada', filasExplicadas: 0, filasTotales: 4, descartadaPor: ['R1', 'R2', 'R3'], contradicciones: [], verificacion: false, intervencion: false, principal: false },
  { id: 'C4', nivel: nivelMaximo(CAUSAS[3].evidencia, NIVELES), estado: 'descartada', filasExplicadas: 1, filasTotales: 4, descartadaPor: ['R1', 'R2', 'R4'], contradicciones: [], verificacion: false, intervencion: false, principal: false },
  { id: 'C5', nivel: nivelMaximo(CAUSAS[4].evidencia, NIVELES), estado: 'incompleta', filasExplicadas: 3, filasTotales: 4, descartadaPor: [], contradicciones: [], verificacion: true, intervencion: false, principal: false },
];

// ---------- traza ----------

type SinNumeros<T> = T extends unknown ? Omit<T, 'n' | 'paso'> : never;
let contador = 0;
const ev = (paso: number, x: SinNumeros<EventoTraza>): EventoTraza => ({ n: ++contador, paso, ...x }) as EventoTraza;

const TRAZA: EventoTraza[] = [
  ev(1, { tipo: 'decision', accion: 'leer_fuentes', justificacion: 'Todavía no hay evidencia. Empiezo por leer las tres entrevistas y el registro del almacén.', punteros: [], parametros: '{"fuentes":["E1","E2","E3","D1"]}' }),
  ev(1, { tipo: 'rechazo', origen: 'verificador', accion: 'leer_fuentes', motivo: 'oracion_del_entrevistador', detalle: 'Afirmación propuesta n.º 9 de E3: apuntaba a una oración de la consultora.' }),
  ev(1, { tipo: 'resultado', accion: 'leer_fuentes', resumen: '4 fuentes leídas: 20 afirmaciones aceptadas por el código y 1 rechazada.', costoUsd: 0.007412, ms: 18400, demo: true }),
  ev(2, { tipo: 'decision', accion: 'enunciar_desviacion', justificacion: 'Hay fecha de inicio (marzo) y un contraste claro: los muebles sin herraje salen a tiempo.', punteros: ['E2-A01', 'E2-A03', 'E2-A06'], parametros: '' }),
  ev(2, { tipo: 'rechazo', origen: 'evidencia', accion: 'enunciar_desviacion', motivo: 'evidencia_ajena', detalle: 'La casilla «Contraste» apuntaba a E4-A02, de una fuente que no se ha leído.' }),
  ev(2, { tipo: 'decision', accion: 'enunciar_desviacion', justificacion: 'Corrijo el contraste con las afirmaciones de E2 y E3 sobre mesas, bancas y sillas.', punteros: ['E2-A06', 'E3-A04'], parametros: '' }),
  ev(2, { tipo: 'resultado', accion: 'enunciar_desviacion', resumen: 'Desviación enunciada. Ruta aguda: hay fecha de inicio y contraste.', costoUsd: 0.004935, ms: 9200, demo: true }),
  ev(3, { tipo: 'decision', accion: 'generar_causas', justificacion: 'Con la desviación clara, propongo las causas posibles.', punteros: ['E1-A01', 'E1-A04'], parametros: '' }),
  ev(3, { tipo: 'rechazo', origen: 'guarda', accion: 'generar_causas', motivo: 'fase_previa', detalle: 'Antes de generar causas hay que especificar Es / No Es.' }),
  ev(3, { tipo: 'decision', accion: 'especificar_es_no_es', justificacion: 'Armo la especificación en las cuatro dimensiones con lo que ya consta.', punteros: ['E2-A03', 'E2-A06', 'D1-A01', 'D1-A02'], parametros: '' }),
  ev(3, { tipo: 'resultado', accion: 'especificar_es_no_es', resumen: '4 filas Es / No Es con distinciones y cambios, todas con evidencia.', costoUsd: 0.008102, ms: 22800, demo: true }),
  ev(4, { tipo: 'decision', accion: 'generar_causas', justificacion: 'Cada cambio de la especificación es una causa posible, más las que mencionan los entrevistados.', punteros: ['E3-A01', 'E1-A03', 'E1-A04', 'E1-A05'], parametros: '' }),
  ev(4, { tipo: 'resultado', accion: 'generar_causas', resumen: '5 causas posibles colocadas en las espinas del Ishikawa.', costoUsd: 0.006377, ms: 14100, demo: true }),
  ev(5, { tipo: 'decision', accion: 'probar_causas', justificacion: 'Pruebo cada causa contra las cuatro filas: debe explicar lo que es y lo que no es.', punteros: ['D1-A01', 'E2-A06'], parametros: '' }),
  ev(5, { tipo: 'resultado', accion: 'probar_causas', resumen: 'C1 explica las 4 filas; C2, C3 y C4 quedan descartadas; C5 explica 3 de 4.', costoUsd: 0.011286, ms: 31500, demo: true }),
  ev(6, { tipo: 'decision', accion: 'detenerse', justificacion: 'Ya hay una causa que lo explica todo.', punteros: ['D1-A01'], parametros: '' }),
  ev(6, { tipo: 'rechazo', origen: 'guarda', accion: 'detenerse', motivo: 'criterio_no_cumplido', detalle: 'Faltan: verificación de la causa incompleta C5 y una dirección de intervención para C1.' }),
  ev(6, { tipo: 'decision', accion: 'disenar_verificacion', justificacion: 'C5 explica 3 de 4 filas y su evidencia es N2. Solo admite verificarse.', punteros: ['E3-A02'], parametros: '{"causa":"C5"}' }),
  ev(6, { tipo: 'resultado', accion: 'disenar_verificacion', resumen: 'Verificación de C5 diseñada: qué revisar, con quién y qué resultado decide.', costoUsd: 0.005621, ms: 11800, demo: true }),
  ev(7, { tipo: 'decision', accion: 'solicitar_documento', justificacion: 'Para cerrar C5 conviene comparar el plazo prometido con el real.', punteros: ['E3-A03'], parametros: '{"documento":"Registro de pedidos de Brevánez con fechas prometidas"}' }),
  ev(7, { tipo: 'resultado', accion: 'solicitar_documento', resumen: 'Documento solicitado S1. Cuesta un día de campo.', costoUsd: 0.003842, ms: 6400, demo: true }),
  ev(8, { tipo: 'decision', accion: 'proponer_intervencion', justificacion: 'C1 tiene evidencia documentada (N4): admite una dirección de intervención.', punteros: ['D1-A01', 'D1-A02', 'E2-A04'], parametros: '{"causa":"C1"}' }),
  ev(8, { tipo: 'resultado', accion: 'proponer_intervencion', resumen: 'Intervención propuesta para C1.', costoUsd: 0.006019, ms: 13300, demo: true }),
  ev(9, { tipo: 'decision', accion: 'detenerse', justificacion: 'La causa principal está documentada, las demás están descartadas o con verificación diseñada.', punteros: ['D1-A01'], parametros: '' }),
  ev(9, { tipo: 'fin', motivo: 'criterio', detalle: 'La causa C1 explica las cuatro filas con evidencia documentada y las demás quedaron descartadas o con verificación.' }),
];

// ---------- estado y vista ----------

const lectura = (costoUsd: number, ms: number): LecturaFuente => ({ turnos: [], oraciones: [], rechazos: [], costoUsd, ms, demo: true });

const ESTADO: EstadoAgente = {
  version: 1,
  id: 'ejemplo-taller',
  titulo: CASO_TALLER.titulo,
  objetivo: CASO_TALLER.objetivo,
  fuentes: CASO_TALLER.fuentes,
  lecturas: { E1: lectura(0.0018, 4200), E2: lectura(0.0021, 4900), E3: lectura(0.002, 4600), D1: lectura(0.0015, 3800) },
  afirmaciones: AFIRMACIONES,
  confirmadas: CONFIRMADAS,
  desviacion: {
    esperado: { texto: 'Los muebles se entregan en la fecha prometida.', evidencia: ['E2-A02'] },
    ocurre: { texto: 'Los closets, cómodas y cocinas se entregan después de la fecha prometida.', evidencia: ['E2-A03', 'E2-A05'] },
    desdeCuando: { texto: 'Desde principios de marzo.', evidencia: ['E2-A01', 'E1-A02'] },
    cuanto: { texto: 'El herraje tarda 9.4 días contra 3.1 antes; once muebles parados en la última semana.', evidencia: ['D1-A01', 'D1-A02', 'E2-A05'] },
    contraste: { texto: 'Mesas, bancas y sillas, que no llevan herraje, salen en su fecha.', evidencia: ['E2-A06', 'E3-A04'] },
    ambito: 'operacion_fisica',
  },
  seleccion: {
    ruta: 'aguda',
    razones: [
      'Hay fecha de inicio: principios de marzo.',
      'Hay un contraste: los muebles sin herraje salen a tiempo.',
      'El problema es de operación física, no de reglas o relaciones: aplica Es / No Es.',
    ],
    espinas: 'seis_m',
    herramientas: [
      { herramienta: 'es_no_es', elegida: true, razon: 'Hay inicio fechado y un contraste que permiten especificar lo que es y lo que no es.' },
      { herramienta: 'ishikawa', elegida: true, razon: 'Ordena las causas posibles por espina antes de probarlas.' },
      { herramienta: 'weisbord', elegida: false, razon: 'Es para problemas crónicos o de organización; aquí hay una fecha de inicio.' },
      { herramienta: 'campo_de_fuerzas', elegida: false, razon: 'Sirve para mover un cambio ya decidido, no para hallar una causa.' },
      { herramienta: 'lienzo', elegida: false, razon: 'El problema no está en el modelo de negocio.' },
      { herramienta: 'cinco_porques', elegida: false, razon: 'Se usa para profundizar una causa confirmada; todavía no la había.' },
    ],
  },
  esNoEs: FILAS,
  weisbord: null,
  causas: CAUSAS,
  juicios: JUICIOS,
  verificaciones: [
    {
      causa: 'C5',
      queRevisar: 'Los criterios con los que compras eligió a Brevánez y si se preguntó el plazo de entrega.',
      conQuien: 'La encargada de compras y la dueña.',
      confirmaSi: 'Se eligió solo por precio y nadie pidió el plazo de entrega al proveedor.',
      descartaSi: 'Hay un acuerdo de plazo que Brevánez incumple, o se evaluó y se aceptó el riesgo.',
    },
  ],
  intervenciones: [
    {
      causa: 'C1',
      accion: 'Exigir a Brevánez un plazo de entrega por escrito, probar un segundo proveedor cercano para correderas y bisagras, y pedir el herraje el mismo día en que se acepta el pedido del cliente.',
      evidencia: ['D1-A01', 'D1-A02', 'E2-A04'],
    },
  ],
  solicitudes: [
    {
      id: 'S1',
      descripcion: 'Registro de pedidos de Brevánez con las fechas de entrega prometidas.',
      motivo: 'La encargada de compras dice que prometieron cinco días; el registro solo muestra los reales.',
    },
  ],
  presupuesto: { pasosMax: 14, pasos: 9, usdMax: 0.4, usd: 0.053594, diasMax: 3, dias: 1 },
  hechas: [
    { firma: 'leer_fuentes', leidas: 4 },
    { firma: 'enunciar_desviacion', leidas: 4 },
    { firma: 'especificar_es_no_es', leidas: 4 },
  ],
  traza: TRAZA,
  terminado: { motivo: 'criterio', detalle: 'La causa C1 explica las cuatro filas con evidencia documentada y las demás quedaron descartadas o con verificación.' },
};

export const VISTA_EJEMPLO: VistaAgente = {
  estado: ESTADO,
  niveles: NIVELES,
  causas: CAUSAS_EVALUADAS,
  criterio: {
    cumplido: true,
    principal: 'C1',
    cumplidos: [
      'Una causa explica todas las filas de la especificación.',
      'La causa principal tiene evidencia documentada (N4).',
      'Las demás causas están descartadas o tienen una verificación diseñada.',
      'La causa principal tiene una dirección de intervención.',
    ],
    faltantes: [],
  },
  gasto: { sesionUsd: 0.053594, globalUsd: 0.053594, llamadasSesion: 9 },
};

// Misma vista, recortada a los primeros pasos: sirve para ver las secciones aún vacías.
export function vistaEjemploHasta(paso: number): VistaAgente {
  const traza = TRAZA.filter((e) => e.paso <= paso);
  return {
    ...VISTA_EJEMPLO,
    estado: {
      ...ESTADO,
      traza,
      terminado: null,
      desviacion: paso >= 2 ? ESTADO.desviacion : null,
      seleccion: paso >= 2 ? ESTADO.seleccion : null,
      esNoEs: paso >= 3 ? FILAS : null,
      causas: paso >= 4 ? CAUSAS : [],
      juicios: paso >= 5 ? JUICIOS : [],
      verificaciones: paso >= 6 ? ESTADO.verificaciones : [],
      intervenciones: paso >= 8 ? ESTADO.intervenciones : [],
      solicitudes: paso >= 7 ? ESTADO.solicitudes : [],
      presupuesto: { ...ESTADO.presupuesto, pasos: paso },
    },
    causas: paso >= 5 ? CAUSAS_EVALUADAS : paso >= 4 ? CAUSAS_EVALUADAS.map((c) => ({ ...c, estado: 'sin_probar' as const, filasExplicadas: 0, descartadaPor: [], principal: false, verificacion: false, intervencion: false })) : [],
    criterio: { cumplido: false, principal: null, cumplidos: [], faltantes: ['Probar las causas contra la especificación.'] },
  };
}
