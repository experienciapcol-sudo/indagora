// Idioma de la interfaz: se decide una sola vez al cargar el módulo.
// Prioridad: ?lang= en la URL, luego lo guardado, luego el idioma del navegador.

export type Idioma = 'es' | 'en';

export const CLAVE_IDIOMA = 'indagora-idioma';

export function normalizarIdioma(valor: string | null | undefined): Idioma | null {
  if (!valor) return null;
  const v = valor.trim().toLowerCase().replace('_', '-');
  if (v === 'es' || v.startsWith('es-')) return 'es';
  if (v === 'en' || v.startsWith('en-')) return 'en';
  return null;
}

export function paramLangDeUrl(url: string): string | null {
  try {
    const sinFragmento = url.split('#')[0] ?? '';
    const consulta = sinFragmento.includes('?') ? sinFragmento.slice(sinFragmento.indexOf('?') + 1) : sinFragmento;
    return new URLSearchParams(consulta).get('lang');
  } catch {
    return null;
  }
}

export interface LectoresIdioma {
  url: () => string;
  almacenamiento: () => string | null;
  navegador: () => string | null;
}

function leerSeguro(lector: () => string | null): string | null {
  try {
    return lector();
  } catch {
    return null;
  }
}

export function detectarIdioma(lectores: LectoresIdioma): Idioma {
  const deUrl = normalizarIdioma(paramLangDeUrl(leerSeguro(lectores.url) ?? ''));
  if (deUrl) return deUrl;
  const guardado = normalizarIdioma(leerSeguro(lectores.almacenamiento));
  if (guardado) return guardado;
  const delNavegador = normalizarIdioma(leerSeguro(lectores.navegador));
  if (delNavegador) return delNavegador;
  return 'es';
}

function lectoresDelNavegador(): LectoresIdioma {
  return {
    url: () => (typeof window !== 'undefined' ? window.location.href : ''),
    almacenamiento: () => {
      try {
        return typeof window !== 'undefined' ? window.localStorage.getItem(CLAVE_IDIOMA) : null;
      } catch {
        return null;
      }
    },
    navegador: () => (typeof navigator !== 'undefined' ? navigator.language : null),
  };
}

export const idioma: Idioma = detectarIdioma(lectoresDelNavegador());

export interface EfectosCambioIdioma {
  guardar: (nuevo: Idioma) => void;
  recargar: () => void;
}

export function cambiarIdioma(nuevo: Idioma, efectos?: EfectosCambioIdioma): void {
  const guardar =
    efectos?.guardar ??
    ((valor: Idioma) => {
      try {
        window.localStorage.setItem(CLAVE_IDIOMA, valor);
      } catch {
        // Sin almacenamiento disponible: la recarga conserva ?lang= si estaba en la URL.
      }
    });
  const recargar = efectos?.recargar ?? (() => window.location.reload());
  try {
    guardar(nuevo);
  } catch {
    // Guardar es opcional; aun así se recarga para aplicar el idioma elegido.
  }
  recargar();
}
