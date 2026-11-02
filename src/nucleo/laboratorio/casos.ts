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
      { tipo: 'sintoma', texto: 'De cada diez citas de la mañana, tres o cuatro quedan vacías desde marzo.', dueno: 'Recepcionista', revelacion: 'siempre', distractor: null, terminos: ['tres o cuatro quedan vacías', 'citas de la mañana'] },
      { tipo: 'contexto', texto: 'Antes lo normal era que casi todas las personas confirmadas ocuparan su sillón.', dueno: 'Recepcionista', revelacion: 'siempre', distractor: null, terminos: ['casi todas las personas confirmadas', 'ocuparan su sillón'] },
      { tipo: 'contexto', texto: 'Las citas que se apartan el mismo día en ventanilla casi siempre se cumplen.', dueno: 'Recepcionista', revelacion: 'siempre', distractor: null, terminos: ['mismo día en ventanilla', 'casi siempre se cumplen'] },
      { tipo: 'contexto', texto: 'Yo anoto en la libreta del mostrador el nombre de quien falta y la hora de su cita.', dueno: 'Recepcionista', revelacion: 'siempre', distractor: null, terminos: ['libreta del mostrador', 'hora de su cita'] },
      { tipo: 'causa', texto: 'Cuando reviso, el aviso de la plataforma Avisamed salió al teléfono viejo de la ficha y por eso el aviso no llega.', dueno: 'Recepcionista', revelacion: 'incidente', distractor: null, terminos: ['plataforma Avisamed', 'teléfono viejo'] },
      { tipo: 'causa', texto: 'Renglón tras renglón, el registro marca envío al teléfono viejo de la ficha en la plataforma Avisamed.', dueno: 'Registro de citas y avisos de marzo', revelacion: 'documental', distractor: null, terminos: ['registro de envíos', 'plataforma Avisamed'] },
      { tipo: 'sintoma', texto: 'Yo armo la agenda y los huecos aparecen sobre todo en citas apartadas con mucha anticipación.', dueno: 'Coordinadora', revelacion: 'siempre', distractor: null, terminos: ['citas anticipadas', 'huecos aparecen'] },
      { tipo: 'sintoma', texto: 'Desde marzo aparto dos sillones extra porque cuento con que alguien va a faltar.', dueno: 'Coordinadora', revelacion: 'siempre', distractor: null, terminos: ['aparto dos sillones extra', 'alguien va a faltar'] },
      { tipo: 'contexto', texto: 'Mi meta al cerrar la agenda es dejar los seis sillones ocupados sin huecos entre consultas.', dueno: 'Coordinadora', revelacion: 'siempre', distractor: null, terminos: ['seis sillones ocupados', 'huecos entre consultas'] },
      { tipo: 'contexto', texto: 'Cuando un hueco queda libre lo ofrezco por teléfono a quien está en lista de espera.', dueno: 'Coordinadora', revelacion: 'siempre', distractor: null, terminos: ['lista de espera', 'ofrezco por teléfono'] },
      { tipo: 'distractor', texto: 'Yo creo que los pacientes se volvieron irresponsables y apartan sin compromiso.', dueno: 'Coordinadora', revelacion: 'siempre', distractor: 'Los pacientes se volvieron irresponsables', terminos: ['pacientes irresponsables', 'sin compromiso'] },
      { tipo: 'sintoma', texto: 'A mí me quedan tiempos muertos entre un paciente y otro casi todos los días.', dueno: 'Dentista titular', revelacion: 'siempre', distractor: null, terminos: ['tiempos muertos', 'entre pacientes'] },
      { tipo: 'sintoma', texto: 'En una jornada reviso la agenda y encuentro dos o tres espacios vacíos que nadie ocupó.', dueno: 'Dentista titular', revelacion: 'siempre', distractor: null, terminos: ['dos o tres espacios vacíos', 'nadie ocupó'] },
      { tipo: 'contexto', texto: 'Antes de marzo mi consulta iba encadenada y apenas tenía diez minutos entre pacientes.', dueno: 'Dentista titular', revelacion: 'siempre', distractor: null, terminos: ['consulta iba encadenada', 'diez minutos entre pacientes'] },
      { tipo: 'contexto', texto: 'Los pacientes que ya están en tratamiento y vienen cada semana casi nunca faltan.', dueno: 'Dentista titular', revelacion: 'siempre', distractor: null, terminos: ['ya están en tratamiento', 'casi nunca faltan'] },
      { tipo: 'contexto', texto: 'Yo anoto en mi hoja clínica los espacios que quedaron sin atender cada día.', dueno: 'Dentista titular', revelacion: 'siempre', distractor: null, terminos: ['hoja clínica', 'espacios que quedaron sin atender'] },
      { tipo: 'distractor', texto: 'Desde que abrieron la avenida nueva, todo el mundo tarda más en llegar.', dueno: 'Dentista titular', revelacion: 'temporal', distractor: 'El tráfico de la avenida nueva hace llegar tarde a todos', terminos: ['avenida nueva', 'tráfico pesado'] },
      { tipo: 'contexto', texto: 'Contraté el sistema de agenda en febrero porque el anterior se quedaba corto.', dueno: 'Administradora', revelacion: 'siempre', distractor: null, terminos: ['sistema de agenda', 'se quedaba corto'] },
      { tipo: 'contexto', texto: 'La clínica tiene seis sillones y trabajamos de lunes a sábado con dos dentistas por turno.', dueno: 'Administradora', revelacion: 'siempre', distractor: null, terminos: ['trabajamos de lunes a sábado', 'dos dentistas por turno'] },
      { tipo: 'sintoma', texto: 'En marzo la recepción contó cuarenta y dos inasistencias en el mes y antes rondaban ocho.', dueno: 'Administradora', revelacion: 'siempre', distractor: null, terminos: ['cuarenta y dos inasistencias', 'antes rondaban ocho'] },
      { tipo: 'distractor', texto: 'Hay quien dice que la avenida recién abierta complica el traslado de los pacientes de la tarde.', dueno: 'Administradora', revelacion: 'siempre', distractor: 'El tráfico de la avenida nueva hace llegar tarde a todos', terminos: ['avenida recién abierta', 'pacientes de la tarde'] },
      { tipo: 'contexto', texto: 'Yo pago el servicio de agenda cada mes y reviso la factura en la oficina.', dueno: 'Administradora', revelacion: 'siempre', distractor: null, terminos: ['pago el servicio de agenda', 'reviso la factura'] },
      { tipo: 'contexto', texto: 'Los pacientes que confirman por teléfono en mostrador casi siempre sí llegan.', dueno: 'Coordinadora', revelacion: 'contraste', distractor: null, terminos: ['confirman en mostrador', 'sí llegan'] },
    ],
  },
  { giro: 'clínica dental', tamano: 'pequena', sintoma: 'los pacientes no llegan a sus citas', distractores: 2, documentoClave: true },
  {
    P1: 'Cada día veo huecos porque el paciente no llega y nunca avisó. De cada diez citas de la mañana, tres o cuatro quedan vacías desde marzo. Antes lo normal era que casi todas las personas confirmadas ocuparan su sillón. Las citas que se apartan el mismo día en ventanilla casi siempre se cumplen. Yo anoto en la libreta del mostrador el nombre de quien falta y la hora de su cita.',
    P2: 'Yo armo la agenda y los huecos aparecen sobre todo en citas apartadas con mucha anticipación. Desde marzo aparto dos sillones extra porque cuento con que alguien va a faltar. Mi meta al cerrar la agenda es dejar los seis sillones ocupados sin huecos entre consultas. Cuando un hueco queda libre lo ofrezco por teléfono a quien está en lista de espera. Yo creo que los pacientes se volvieron irresponsables y apartan sin compromiso.',
    P3: 'A mí me quedan tiempos muertos entre un paciente y otro casi todos los días. En una jornada reviso la agenda y encuentro dos o tres espacios vacíos que nadie ocupó. Antes de marzo mi consulta iba encadenada y apenas tenía diez minutos entre pacientes. Los pacientes que ya están en tratamiento y vienen cada semana casi nunca faltan. Yo anoto en mi hoja clínica los espacios que quedaron sin atender cada día.',
    P4: 'Contraté el sistema de agenda en febrero porque el anterior se quedaba corto. La clínica tiene seis sillones y trabajamos de lunes a sábado con dos dentistas por turno. En marzo la recepción contó cuarenta y dos inasistencias en el mes y antes rondaban ocho. Hay quien dice que la avenida recién abierta complica el traslado de los pacientes de la tarde. Yo pago el servicio de agenda cada mes y reviso la factura en la oficina.',
  },
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
      { tipo: 'sintoma', texto: 'Desde febrero registro entre quince y veinte devoluciones por semana en mi lista de casos.', dueno: 'Atención a clientes', revelacion: 'siempre', distractor: null, terminos: ['quince y veinte devoluciones', 'lista de casos'] },
      { tipo: 'contexto', texto: 'Antes lo habitual era recibir tres o cuatro devoluciones por semana y casi siempre por cambio de color.', dueno: 'Atención a clientes', revelacion: 'siempre', distractor: null, terminos: ['tres o cuatro devoluciones', 'antes lo habitual'] },
      { tipo: 'contexto', texto: 'Los pantalones del mismo pedido casi no se devuelven y las blusas concentran los regresos.', dueno: 'Atención a clientes', revelacion: 'siempre', distractor: null, terminos: ['los pantalones casi no se devuelven', 'las blusas concentran los regresos'] },
      { tipo: 'causa', texto: 'La semana pasada medí una blusa y la maquiladora Costura Loma la dejó con tallas salen una medida más chicas de lo marcado.', dueno: 'Atención a clientes', revelacion: 'incidente', distractor: null, terminos: ['maquiladora Costura Loma', 'medí una blusa'] },
      { tipo: 'distractor', texto: 'Mucha gente compra dos tallas y devuelve una, eso siempre ha pasado.', dueno: 'Atención a clientes', revelacion: 'siempre', distractor: 'La gente compra dos tallas y devuelve una', terminos: ['compra dos tallas', 'devuelve una'] },
      { tipo: 'sintoma', texto: 'En almacén las devoluciones ocupan ya dos anaqueles completos.', dueno: 'Encargado de almacén', revelacion: 'siempre', distractor: null, terminos: ['dos anaqueles', 'devoluciones ocupan'] },
      { tipo: 'sintoma', texto: 'Cada lunes cuento las cajas de regreso y el mes pasado sumaron ochenta y seis prendas.', dueno: 'Encargado de almacén', revelacion: 'siempre', distractor: null, terminos: ['cajas de regreso', 'ochenta y seis prendas'] },
      { tipo: 'contexto', texto: 'Mi tarea es despachar los pedidos del día antes de las cinco y antes lo lograba sin cajas acumuladas.', dueno: 'Encargado de almacén', revelacion: 'siempre', distractor: null, terminos: ['despachar los pedidos del día', 'sin cajas acumuladas'] },
      { tipo: 'contexto', texto: 'Los accesorios y las bolsas se venden sin regresos mientras las blusas vuelven seguido.', dueno: 'Encargado de almacén', revelacion: 'siempre', distractor: null, terminos: ['accesorios y las bolsas', 'se venden sin regresos'] },
      { tipo: 'contexto', texto: 'Yo reviso cada prenda que vuelve y la mayoría llega limpia, con etiqueta y sin daño visible.', dueno: 'Encargado de almacén', revelacion: 'siempre', distractor: null, terminos: ['llega limpia', 'sin daño visible'] },
      { tipo: 'distractor', texto: 'A veces la paquetería nos regresa cajas golpeadas y la prenda dañada.', dueno: 'Encargado de almacén', revelacion: 'incidente', distractor: 'La paquetería maltrata las prendas', terminos: ['cajas golpeadas', 'prenda dañada'] },
      { tipo: 'contexto', texto: 'Yo cambié de maquiladora en febrero buscando mejor precio por blusa.', dueno: 'Compradora', revelacion: 'siempre', distractor: null, terminos: ['cambié de maquiladora', 'mejor precio'] },
      { tipo: 'contexto', texto: 'Yo encargo blusas, pantalones y vestidos a tres talleres distintos según la prenda.', dueno: 'Compradora', revelacion: 'siempre', distractor: null, terminos: ['tres talleres distintos', 'según la prenda'] },
      { tipo: 'contexto', texto: 'Antes de febrero yo compraba las blusas al taller de siempre y las devoluciones eran pocas.', dueno: 'Compradora', revelacion: 'siempre', distractor: null, terminos: ['antes de febrero', 'las devoluciones eran pocas'] },
      { tipo: 'distractor', texto: 'Al abrir la tienda hubo reclamos porque una foto se veía más brillante que la blusa real.', dueno: 'Compradora', revelacion: 'siempre', distractor: 'Las fotos de la tienda engañan sobre el color', terminos: ['una foto se veía más brillante', 'que la blusa real'] },
      { tipo: 'contexto', texto: 'Desde febrero anoto en mi hoja de compras qué taller hizo cada lote que sale a la venta.', dueno: 'Compradora', revelacion: 'siempre', distractor: null, terminos: ['hoja de compras', 'qué taller hizo cada lote'] },
      { tipo: 'causa', texto: 'Costura Loma me confirmó que usa un patrón recortado para ahorrar tela desde febrero.', dueno: 'Compradora', revelacion: 'cuantitativa', distractor: null, terminos: ['patrón recortado', 'ahorrar tela'] },
      { tipo: 'distractor', texto: 'Al principio hubo fotos con el color más vivo que la prenda real.', dueno: 'Compradora', revelacion: 'temporal', distractor: 'Las fotos de la tienda engañan sobre el color', terminos: ['fotos con color', 'color más vivo'] },
    ],
  },
  { giro: 'tienda en línea de ropa', tamano: 'pequena', sintoma: 'aumentaron las devoluciones de prendas', distractores: 3, documentoClave: false },
  {
    P1: 'Me llegan devoluciones todos los días diciendo que la prenda aprieta. Desde febrero registro entre quince y veinte devoluciones por semana en mi lista de casos. Antes lo habitual era recibir tres o cuatro devoluciones por semana y casi siempre por cambio de color. Los pantalones del mismo pedido casi no se devuelven y las blusas concentran los regresos. Mucha gente compra dos tallas y devuelve una, eso siempre ha pasado.',
    P2: 'En almacén las devoluciones ocupan ya dos anaqueles completos. Cada lunes cuento las cajas de regreso y el mes pasado sumaron ochenta y seis prendas. Mi tarea es despachar los pedidos del día antes de las cinco y antes lo lograba sin cajas acumuladas. Los accesorios y las bolsas se venden sin regresos mientras las blusas vuelven seguido. Yo reviso cada prenda que vuelve y la mayoría llega limpia, con etiqueta y sin daño visible.',
    P3: 'Yo cambié de maquiladora en febrero buscando mejor precio por blusa. Yo encargo blusas, pantalones y vestidos a tres talleres distintos según la prenda. Antes de febrero yo compraba las blusas al taller de siempre y las devoluciones eran pocas. Al abrir la tienda hubo reclamos porque una foto se veía más brillante que la blusa real. Desde febrero anoto en mi hoja de compras qué taller hizo cada lote que sale a la venta.',
  },
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
      { tipo: 'sintoma', texto: 'Desde marzo termino mi jornada con seis o siete paquetes sin entregar en la mochila.', dueno: 'Repartidor', revelacion: 'siempre', distractor: null, terminos: ['seis o siete paquetes', 'sin entregar en la mochila'] },
      { tipo: 'contexto', texto: 'Antes yo cerraba mi recorrido a las cuatro y dejaba todo repartido en el día.', dueno: 'Repartidor', revelacion: 'siempre', distractor: null, terminos: ['cerraba mi recorrido', 'todo repartido en el día'] },
      { tipo: 'contexto', texto: 'Los sábados que salgo con menos paradas termino temprano y no regreso con nada.', dueno: 'Repartidor', revelacion: 'siempre', distractor: null, terminos: ['menos paradas termino temprano', 'no regreso con nada'] },
      { tipo: 'contexto', texto: 'Desde marzo mi recorrido pasa por calles que antes cubría otro compañero.', dueno: 'Repartidor', revelacion: 'siempre', distractor: null, terminos: ['calles que antes cubría', 'otro compañero'] },
      { tipo: 'distractor', texto: 'Mi motocicleta es la más antigua del patio y una vez se quedó sin arrancar en marzo.', dueno: 'Repartidor', revelacion: 'siempre', distractor: 'Las motocicletas ya están viejas y se descomponen', terminos: ['motocicleta es la más antigua', 'se quedó sin arrancar'] },
      { tipo: 'causa', texto: 'La ruta norte trae doce paradas en colonias separadas entre sí y el recorrido dura dos horas más que antes.', dueno: 'Repartidor', revelacion: 'cuantitativa', distractor: null, terminos: ['ruta norte', 'doce paradas'] },
      { tipo: 'distractor', texto: 'Mi moto es la más vieja de las tres y en marzo se quedó parada un día.', dueno: 'Repartidor', revelacion: 'temporal', distractor: 'Las motocicletas ya están viejas y se descomponen', terminos: ['moto más vieja', 'se quedó parada'] },
      { tipo: 'sintoma', texto: 'En la mañana armo las rutas y la del norte es la única que no cierra a tiempo.', dueno: 'Despachadora', revelacion: 'siempre', distractor: null, terminos: ['rutas de la mañana', 'no cierra a tiempo'] },
      { tipo: 'sintoma', texto: 'En abril conté dieciocho días en que una ruta volvió con paquetes para el día siguiente.', dueno: 'Despachadora', revelacion: 'siempre', distractor: null, terminos: ['dieciocho días', 'volvió con paquetes'] },
      { tipo: 'contexto', texto: 'Mi meta al repartir las paradas es que cada motocicleta regrese vacía antes de las cinco.', dueno: 'Despachadora', revelacion: 'siempre', distractor: null, terminos: ['cada motocicleta regrese vacía', 'antes de las cinco'] },
      { tipo: 'contexto', texto: 'Las rutas del centro y del sur cierran a su hora con el mismo número de repartidores.', dueno: 'Despachadora', revelacion: 'siempre', distractor: null, terminos: ['rutas del centro y del sur', 'cierran a su hora'] },
      { tipo: 'causa', texto: 'En marzo reordené las zonas y le pasé paradas de dos colonias lejanas a la ruta norte.', dueno: 'Despachadora', revelacion: 'temporal', distractor: null, terminos: ['reordené las zonas', 'colonias lejanas'] },
      { tipo: 'distractor', texto: 'Seguido el cliente no está y hay que volver al día siguiente.', dueno: 'Despachadora', revelacion: 'siempre', distractor: 'Los clientes nunca están en su casa', terminos: ['cliente no está', 'volver al día siguiente'] },
      { tipo: 'contexto', texto: 'Yo solo veo que los gastos de gasolina subieron desde marzo.', dueno: 'Dueño', revelacion: 'siempre', distractor: null, terminos: ['gastos de gasolina', 'subieron en marzo'] },
      { tipo: 'sintoma', texto: 'En marzo pagué tres tanques extra de gasolina por semana comparado con enero.', dueno: 'Dueño', revelacion: 'siempre', distractor: null, terminos: ['tres tanques extra', 'comparado con enero'] },
      { tipo: 'contexto', texto: 'Antes cada repartidor gastaba un tanque por semana y terminaba su zona en el día.', dueno: 'Dueño', revelacion: 'siempre', distractor: null, terminos: ['un tanque por semana', 'terminaba su zona'] },
      { tipo: 'contexto', texto: 'Yo reviso los vales de gasolina los viernes y los comparo con los paquetes entregados.', dueno: 'Dueño', revelacion: 'siempre', distractor: null, terminos: ['vales de gasolina los viernes', 'paquetes entregados'] },
      { tipo: 'distractor', texto: 'El repartidor que entró en marzo todavía está agarrando práctica.', dueno: 'Dueño', revelacion: 'siempre', distractor: 'El repartidor nuevo es lento', terminos: ['agarrando práctica', 'entró en marzo'] },
      { tipo: 'contexto', texto: 'La bitácora anota hora de salida y hora de regreso de cada ruta.', dueno: 'Bitácora de rutas de abril', revelacion: 'documental', distractor: null, terminos: ['bitácora de rutas', 'hora de regreso'] },
    ],
  },
  { giro: 'mensajería local', tamano: 'micro', sintoma: 'las entregas llegan al día siguiente', distractores: 3, documentoClave: false },
  {
    P1: 'Casi diario regreso con paquetes que ya no alcancé a entregar. Desde marzo termino mi jornada con seis o siete paquetes sin entregar en la mochila. Antes yo cerraba mi recorrido a las cuatro y dejaba todo repartido en el día. Los sábados que salgo con menos paradas termino temprano y no regreso con nada. Desde marzo mi recorrido pasa por calles que antes cubría otro compañero. Mi motocicleta es la más antigua del patio y una vez se quedó sin arrancar en marzo.',
    P2: 'En la mañana armo las rutas y la del norte es la única que no cierra a tiempo. En abril conté dieciocho días en que una ruta volvió con paquetes para el día siguiente. Mi meta al repartir las paradas es que cada motocicleta regrese vacía antes de las cinco. Las rutas del centro y del sur cierran a su hora con el mismo número de repartidores. Seguido el cliente no está y hay que volver al día siguiente.',
    P3: 'Yo solo veo que los gastos de gasolina subieron desde marzo. En marzo pagué tres tanques extra de gasolina por semana comparado con enero. Antes cada repartidor gastaba un tanque por semana y terminaba su zona en el día. Yo reviso los vales de gasolina los viernes y los comparo con los paquetes entregados. El repartidor que entró en marzo todavía está agarrando práctica.',
  },
  'La ruta norte trae doce paradas en colonias separadas entre sí y el recorrido dura dos horas más.',
);

export const CASOS_PREPARADOS: CasoPreparado[] = [dental, tienda, mensajeria];
