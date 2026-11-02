// Proyección pública de los casos preparados: SOLO lo que la interfaz necesita
// para ofrecerlos. Este archivo no importa casos.ts a propósito: si importara
// CASOS_PREPARADOS, la verdad (causa, marcadores, intercambios completos y
// comparación de referencia) viajaría en el paquete JS del navegador.
import type { CasoLaboratorio, CasoLaboratorioPublico, PersonaSimulada } from './tipos';

export interface CasoPreparadoPublico {
  caso: CasoLaboratorioPublico;
}

// Quita esClave (y cualquier campo interno futuro de DocumentoSimulado no público).
export function casoPublico(caso: CasoLaboratorio): CasoLaboratorioPublico {
  return {
    ...caso,
    documentos: caso.documentos.map((d) => ({ id: d.id, titulo: d.titulo, disponible: d.disponible })),
  };
}

const personas = (lista: [string, string][]): PersonaSimulada[] =>
  lista.map(([rol, presentacion], i) => ({ id: `P${i + 1}`, rol, presentacion }));

export const CASOS_PREPARADOS_PUBLICOS: CasoPreparadoPublico[] = [
  {
    caso: {
      id: 'lab-clinica-dental',
      origen: 'preparado',
      parametros: { giro: 'clínica dental', tamano: 'pequena', sintoma: 'los pacientes no llegan a sus citas', distractores: 2, documentoClave: true },
      empresa: { nombre: 'Clínica Dental Brisa', descripcion: 'Clínica dental ficticia con seis sillones. Desde hace unos meses muchos pacientes no llegan a su cita.' },
      objetivo: 'Entender por qué los pacientes no llegan a sus citas desde hace unos meses.',
      personas: personas([
        ['Recepcionista', 'Atiende el mostrador y confirma las citas.'],
        ['Coordinadora', 'Organiza la agenda de los dentistas.'],
        ['Dentista titular', 'Atiende pacientes y revisa los huecos de la agenda.'],
        ['Administradora', 'Contrata los servicios de la clínica.'],
      ]),
      documentos: [{ id: 'D1', titulo: 'Registro de citas y avisos de marzo', disponible: false }],
    },
  },
  {
    caso: {
      id: 'lab-tienda-linea',
      origen: 'preparado',
      parametros: { giro: 'tienda en línea de ropa', tamano: 'pequena', sintoma: 'aumentaron las devoluciones de prendas', distractores: 3, documentoClave: false },
      empresa: { nombre: 'Ropa Andariega', descripcion: 'Tienda en línea ficticia de ropa. Desde hace unos meses devuelven muchas prendas.' },
      objetivo: 'Entender por qué aumentaron las devoluciones de prendas desde hace unos meses.',
      personas: personas([
        ['Atención a clientes', 'Recibe las devoluciones y las quejas.'],
        ['Encargado de almacén', 'Prepara y despacha los pedidos.'],
        ['Compradora', 'Elige proveedores y maquiladores.'],
      ]),
      documentos: [],
    },
  },
  {
    caso: {
      id: 'lab-mensajeria',
      origen: 'preparado',
      parametros: { giro: 'mensajería local', tamano: 'micro', sintoma: 'las entregas llegan al día siguiente', distractores: 3, documentoClave: false },
      empresa: { nombre: 'Mensajería El Faro', descripcion: 'Mensajería local ficticia. Desde hace unos meses muchas entregas llegan al día siguiente.' },
      objetivo: 'Entender por qué las entregas llegan al día siguiente desde hace unos meses.',
      personas: personas([
        ['Repartidor', 'Recorre la zona norte en motocicleta.'],
        ['Despachadora', 'Arma las rutas de cada mañana.'],
        ['Dueño', 'Contrata al personal y revisa los gastos.'],
      ]),
      documentos: [{ id: 'D1', titulo: 'Bitácora de rutas de abril', disponible: false }],
    },
  },
];
