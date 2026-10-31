// Tres empresas preparadas, ficticias. Pasan por validarCaso al cargarse: si dejan
// de cumplir las reglas, la importación falla y las pruebas lo cazan.
import type { CasoCrudo, CasoPreparado, Intercambio, ParametrosLaboratorio } from './tipos';
import { validarCaso } from './validar';
import { fuentesDeIntercambios } from './entrevistas';
import { comparar } from './comparar';

function construir(crudo: CasoCrudo, p: ParametrosLaboratorio, respuestas: Record<string, string>, causaAgente: string): CasoPreparado {
  const r = validarCaso(crudo, p);
  if ('errores' in r) throw new Error(`Caso preparado inválido ${crudo.id}: ${r.errores.join(' ')}`);
  const { caso, verdad } = r;
  const intercambios: Intercambio[] = caso.personas.map((persona, i) => ({
    n: i + 1,
    persona: persona.id,
    tipoPregunta: 'abierta',
    pregunta: 'Para empezar, ¿me cuenta qué está pasando?',
    respuesta: respuestas[persona.id] ?? 'Eso es lo que estamos viendo en el día a día.',
    hechosRevelados: verdad.hechos.filter((h) => h.dueno === persona.id && h.revelacion === 'siempre').map((h) => h.id),
    fuga: false,
  }));
  return {
    caso, verdad, intercambios,
    fuentes: fuentesDeIntercambios(caso, intercambios, []),
    comparacionReferencia: comparar(verdad, causaAgente),
  };
}

const dental = construir(
  {
    id: 'lab-clinica-dental',
    origen: 'preparado',
    empresa: { nombre: 'Clínica Dental Brisa', descripcion: 'Clínica dental ficticia con seis sillones. Desde hace unos meses muchos pacientes no llegan a su cita.' },
    objetivo: 'Entender por qué los pacientes no llegan a sus citas desde hace unos meses.',
    personas: [
      { rol: 'Recepcionista', presentacion: 'Atiende el mostrador y confirma las citas.' },
      { rol: 'Coordinadora', presentacion: 'Organiza la agenda de los dentistas.' },
      { rol: 'Dentista titular', presentacion: 'Atiende pacientes y revisa los huecos de la agenda.' },
      { rol: 'Administradora', presentacion: 'Contrata los servicios de la clínica.' },
    ],
    documentos: [{ titulo: 'Registro de citas y avisos de marzo', esClave: true }],
    causa: {
      enunciado: 'El cambio a la plataforma Avisamed dejó los recordatorios saliendo al número anterior de muchos pacientes.',
      mecanismo: 'Al migrar, la plataforma Avisamed tomó el teléfono viejo de la ficha y no el actualizado, así que el aviso no llega.',
      marcadores: ['plataforma Avisamed', 'teléfono viejo de la ficha', 'aviso no llega'],
      duenos: ['Recepcionista', 'Registro de citas y avisos de marzo'],
    },
    distractores: [
      { enunciado: 'Los pacientes se volvieron irresponsables', porQueEngana: 'Es la explicación más cómoda en recepción.' },
      { enunciado: 'El tráfico de la avenida nueva hace llegar tarde a todos', porQueEngana: 'La avenida se inauguró casi al mismo tiempo.' },
    ],
    hechos: [
      { tipo: 'sintoma', texto: 'Cada día veo huecos porque el paciente no llega y nunca avisó.', dueno: 'Recepcionista', revelacion: 'siempre', distractor: null, terminos: ['huecos en la agenda', 'nunca avisó'] },
      { tipo: 'causa', texto: 'Cuando reviso, el aviso de la plataforma Avisamed salió al teléfono viejo de la ficha y por eso el aviso no llega.', dueno: 'Recepcionista', revelacion: 'incidente', distractor: null, terminos: ['plataforma Avisamed', 'teléfono viejo'] },
      { tipo: 'causa', texto: 'Renglón tras renglón, el registro marca envío al teléfono viejo de la ficha en la plataforma Avisamed.', dueno: 'Registro de citas y avisos de marzo', revelacion: 'documental', distractor: null, terminos: ['registro de envíos', 'plataforma Avisamed'] },
      { tipo: 'sintoma', texto: 'Yo armo la agenda y los huecos aparecen sobre todo en citas apartadas con mucha anticipación.', dueno: 'Coordinadora', revelacion: 'siempre', distractor: null, terminos: ['citas anticipadas', 'huecos aparecen'] },
      { tipo: 'distractor', texto: 'Yo creo que los pacientes se volvieron irresponsables y apartan sin compromiso.', dueno: 'Coordinadora', revelacion: 'siempre', distractor: 'Los pacientes se volvieron irresponsables', terminos: ['pacientes irresponsables', 'sin compromiso'] },
      { tipo: 'sintoma', texto: 'A mí me quedan tiempos muertos entre un paciente y otro casi todos los días.', dueno: 'Dentista titular', revelacion: 'siempre', distractor: null, terminos: ['tiempos muertos', 'entre pacientes'] },
      { tipo: 'distractor', texto: 'Desde que abrieron la avenida nueva, todo el mundo tarda más en llegar.', dueno: 'Dentista titular', revelacion: 'temporal', distractor: 'El tráfico de la avenida nueva hace llegar tarde a todos', terminos: ['avenida nueva', 'tráfico pesado'] },
      { tipo: 'contexto', texto: 'Contraté el sistema de agenda en febrero porque el anterior se quedaba corto.', dueno: 'Administradora', revelacion: 'siempre', distractor: null, terminos: ['sistema de agenda', 'se quedaba corto'] },
      { tipo: 'contexto', texto: 'Los pacientes que confirman por teléfono en mostrador casi siempre sí llegan.', dueno: 'Coordinadora', revelacion: 'contraste', distractor: null, terminos: ['confirman en mostrador', 'sí llegan'] },
    ],
  },
  { giro: 'clínica dental', tamano: 'pequena', sintoma: 'los pacientes no llegan a sus citas', distractores: 2, documentoClave: true },
  { P1: 'Cada día veo huecos porque el paciente no llega y nunca avisó.', P2: 'Yo armo la agenda y los huecos aparecen sobre todo en citas apartadas con mucha anticipación.', P3: 'A mí me quedan tiempos muertos entre un paciente y otro casi todos los días.', P4: 'Contraté el sistema de agenda en febrero porque el anterior se quedaba corto.' },
  'El aviso no llega porque la plataforma Avisamed lo manda al teléfono viejo de la ficha.',
);

const tienda = construir(
  {
    id: 'lab-tienda-linea',
    origen: 'preparado',
    empresa: { nombre: 'Ropa Andariega', descripcion: 'Tienda en línea ficticia de ropa. Desde hace unos meses devuelven muchas prendas.' },
    objetivo: 'Entender por qué aumentaron las devoluciones de prendas desde hace unos meses.',
    personas: [
      { rol: 'Atención a clientes', presentacion: 'Recibe las devoluciones y las quejas.' },
      { rol: 'Encargado de almacén', presentacion: 'Prepara y despacha los pedidos.' },
      { rol: 'Compradora', presentacion: 'Elige proveedores y maquiladores.' },
    ],
    documentos: [],
    causa: {
      enunciado: 'La maquiladora Costura Loma cambió el patrón y las tallas salen una medida más chicas.',
      mecanismo: 'Costura Loma recortó el patrón en febrero; la etiqueta dice la talla de siempre pero la prenda mide menos.',
      marcadores: ['maquiladora Costura Loma', 'tallas salen una medida más chicas', 'patrón recortado'],
      duenos: ['Atención a clientes', 'Compradora'],
    },
    distractores: [
      { enunciado: 'La gente compra dos tallas y devuelve una', porQueEngana: 'Es una práctica conocida del comercio en línea.' },
      { enunciado: 'La paquetería maltrata las prendas', porQueEngana: 'Algunas cajas llegan golpeadas.' },
      { enunciado: 'Las fotos de la tienda engañan sobre el color', porQueEngana: 'Hubo quejas de color al principio.' },
    ],
    hechos: [
      { tipo: 'sintoma', texto: 'Me llegan devoluciones todos los días diciendo que la prenda aprieta.', dueno: 'Atención a clientes', revelacion: 'siempre', distractor: null, terminos: ['prenda aprieta', 'devoluciones diarias'] },
      { tipo: 'causa', texto: 'La semana pasada medí una blusa y la maquiladora Costura Loma la dejó con tallas salen una medida más chicas de lo marcado.', dueno: 'Atención a clientes', revelacion: 'incidente', distractor: null, terminos: ['maquiladora Costura Loma', 'medí una blusa'] },
      { tipo: 'distractor', texto: 'Mucha gente compra dos tallas y devuelve una, eso siempre ha pasado.', dueno: 'Atención a clientes', revelacion: 'siempre', distractor: 'La gente compra dos tallas y devuelve una', terminos: ['compra dos tallas', 'devuelve una'] },
      { tipo: 'sintoma', texto: 'En almacén las devoluciones ocupan ya dos anaqueles completos.', dueno: 'Encargado de almacén', revelacion: 'siempre', distractor: null, terminos: ['dos anaqueles', 'devoluciones ocupan'] },
      { tipo: 'distractor', texto: 'A veces la paquetería nos regresa cajas golpeadas y la prenda dañada.', dueno: 'Encargado de almacén', revelacion: 'incidente', distractor: 'La paquetería maltrata las prendas', terminos: ['cajas golpeadas', 'prenda dañada'] },
      { tipo: 'contexto', texto: 'Yo cambié de maquiladora en febrero buscando mejor precio por blusa.', dueno: 'Compradora', revelacion: 'siempre', distractor: null, terminos: ['cambié de maquiladora', 'mejor precio'] },
      { tipo: 'causa', texto: 'Costura Loma me confirmó que usa un patrón recortado para ahorrar tela desde febrero.', dueno: 'Compradora', revelacion: 'cuantitativa', distractor: null, terminos: ['patrón recortado', 'ahorrar tela'] },
      { tipo: 'distractor', texto: 'Al principio hubo fotos con el color más vivo que la prenda real.', dueno: 'Compradora', revelacion: 'temporal', distractor: 'Las fotos de la tienda engañan sobre el color', terminos: ['fotos con color', 'color más vivo'] },
    ],
  },
  { giro: 'tienda en línea de ropa', tamano: 'pequena', sintoma: 'aumentaron las devoluciones de prendas', distractores: 3, documentoClave: false },
  { P1: 'Me llegan devoluciones todos los días diciendo que la prenda aprieta.', P2: 'En almacén las devoluciones ocupan ya dos anaqueles completos.', P3: 'Yo cambié de maquiladora en febrero buscando mejor precio por blusa.' },
  'La maquiladora Costura Loma usa un patrón recortado y las tallas salen una medida más chicas.',
);

const mensajeria = construir(
  {
    id: 'lab-mensajeria',
    origen: 'preparado',
    empresa: { nombre: 'Mensajería El Faro', descripcion: 'Mensajería local ficticia. Desde hace unos meses muchas entregas llegan al día siguiente.' },
    objetivo: 'Entender por qué las entregas llegan al día siguiente desde hace unos meses.',
    personas: [
      { rol: 'Repartidor', presentacion: 'Recorre la zona norte en motocicleta.' },
      { rol: 'Despachadora', presentacion: 'Arma las rutas de cada mañana.' },
      { rol: 'Dueño', presentacion: 'Contrata al personal y revisa los gastos.' },
    ],
    documentos: [{ titulo: 'Bitácora de rutas de abril', esClave: false }],
    causa: {
      enunciado: 'La reordenación de rutas juntó colonias lejanas y la ruta norte ya no se alcanza a terminar.',
      mecanismo: 'Desde marzo la ruta norte trae doce paradas más repartidas en colonias separadas; el recorrido dura dos horas más.',
      marcadores: ['ruta norte trae doce paradas', 'colonias separadas entre sí', 'recorrido dura dos horas más'],
      duenos: ['Repartidor', 'Despachadora'],
    },
    distractores: [
      { enunciado: 'Las motocicletas ya están viejas y se descomponen', porQueEngana: 'Una moto sí se descompuso en marzo.' },
      { enunciado: 'Los clientes nunca están en su casa', porQueEngana: 'Pasa a veces y es muy visible.' },
      { enunciado: 'El repartidor nuevo es lento', porQueEngana: 'Entró justo cuando empezó el problema.' },
    ],
    hechos: [
      { tipo: 'sintoma', texto: 'Casi diario regreso con paquetes que ya no alcancé a entregar.', dueno: 'Repartidor', revelacion: 'siempre', distractor: null, terminos: ['regreso con paquetes', 'no alcancé'] },
      { tipo: 'causa', texto: 'La ruta norte trae doce paradas en colonias separadas entre sí y el recorrido dura dos horas más que antes.', dueno: 'Repartidor', revelacion: 'cuantitativa', distractor: null, terminos: ['ruta norte', 'doce paradas'] },
      { tipo: 'distractor', texto: 'Mi moto es la más vieja de las tres y en marzo se quedó parada un día.', dueno: 'Repartidor', revelacion: 'temporal', distractor: 'Las motocicletas ya están viejas y se descomponen', terminos: ['moto más vieja', 'se quedó parada'] },
      { tipo: 'sintoma', texto: 'En la mañana armo las rutas y la del norte es la única que no cierra a tiempo.', dueno: 'Despachadora', revelacion: 'siempre', distractor: null, terminos: ['rutas de la mañana', 'no cierra a tiempo'] },
      { tipo: 'causa', texto: 'En marzo reordené las zonas y le pasé paradas de dos colonias lejanas a la ruta norte.', dueno: 'Despachadora', revelacion: 'temporal', distractor: null, terminos: ['reordené las zonas', 'colonias lejanas'] },
      { tipo: 'distractor', texto: 'Seguido el cliente no está y hay que volver al día siguiente.', dueno: 'Despachadora', revelacion: 'siempre', distractor: 'Los clientes nunca están en su casa', terminos: ['cliente no está', 'volver al día siguiente'] },
      { tipo: 'contexto', texto: 'Yo solo veo que los gastos de gasolina subieron desde marzo.', dueno: 'Dueño', revelacion: 'siempre', distractor: null, terminos: ['gastos de gasolina', 'subieron en marzo'] },
      { tipo: 'distractor', texto: 'El repartidor que entró en marzo todavía está agarrando práctica.', dueno: 'Dueño', revelacion: 'siempre', distractor: 'El repartidor nuevo es lento', terminos: ['agarrando práctica', 'entró en marzo'] },
      { tipo: 'contexto', texto: 'La bitácora anota hora de salida y hora de regreso de cada ruta.', dueno: 'Bitácora de rutas de abril', revelacion: 'documental', distractor: null, terminos: ['bitácora de rutas', 'hora de regreso'] },
    ],
  },
  { giro: 'mensajería local', tamano: 'micro', sintoma: 'las entregas llegan al día siguiente', distractores: 3, documentoClave: false },
  { P1: 'Casi diario regreso con paquetes que ya no alcancé a entregar.', P2: 'En la mañana armo las rutas y la del norte es la única que no cierra a tiempo.', P3: 'Yo solo veo que los gastos de gasolina subieron desde marzo.' },
  'La ruta norte trae doce paradas en colonias separadas entre sí y el recorrido dura dos horas más.',
);

export const CASOS_PREPARADOS: CasoPreparado[] = [dental, tienda, mensajeria];
