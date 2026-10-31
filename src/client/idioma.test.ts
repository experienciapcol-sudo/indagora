import { describe, expect, it, vi } from 'vitest';
import { cambiarIdioma, detectarIdioma, normalizarIdioma, paramLangDeUrl } from './idioma';
import type { LectoresIdioma } from './idioma';

const lectores = (parcial: Partial<LectoresIdioma>): LectoresIdioma => ({
  url: () => '',
  almacenamiento: () => null,
  navegador: () => null,
  ...parcial,
});

describe('idioma', () => {
  it('normaliza variantes y rechaza valores desconocidos', () => {
    expect(normalizarIdioma('en')).toBe('en');
    expect(normalizarIdioma('EN-us')).toBe('en');
    expect(normalizarIdioma('es-MX')).toBe('es');
    expect(normalizarIdioma('fr')).toBeNull();
    expect(normalizarIdioma('')).toBeNull();
    expect(normalizarIdioma(null)).toBeNull();
  });

  it('lee ?lang= de una URL completa o de una consulta suelta', () => {
    expect(paramLangDeUrl('https://ejemplo.test/?lang=en#arriba')).toBe('en');
    expect(paramLangDeUrl('?lang=es')).toBe('es');
    expect(paramLangDeUrl('https://ejemplo.test/')).toBeNull();
  });

  it('la URL manda sobre lo guardado y sobre el navegador', () => {
    expect(
      detectarIdioma(lectores({ url: () => '?lang=en', almacenamiento: () => 'es', navegador: () => 'es' })),
    ).toBe('en');
  });

  it('lo guardado manda sobre el navegador cuando la URL no trae lang', () => {
    expect(detectarIdioma(lectores({ almacenamiento: () => 'en', navegador: () => 'es-ES' }))).toBe('en');
  });

  it('usa el navegador si no hay URL ni guardado válido, y español si nada sirve', () => {
    expect(detectarIdioma(lectores({ navegador: () => 'en-GB' }))).toBe('en');
    expect(detectarIdioma(lectores({ almacenamiento: () => 'fr', navegador: () => 'fr-FR' }))).toBe('es');
  });

  it('tolera lectores que lanzan (almacenamiento bloqueado, por ejemplo)', () => {
    expect(
      detectarIdioma(
        lectores({
          url: () => {
            throw new Error('sin url');
          },
          almacenamiento: () => {
            throw new Error('bloqueado');
          },
          navegador: () => 'en',
        }),
      ),
    ).toBe('en');
  });

  it('cambiarIdioma guarda y recarga con los efectos inyectados', () => {
    const guardar = vi.fn();
    const recargar = vi.fn();
    cambiarIdioma('en', { guardar, recargar });
    expect(guardar).toHaveBeenCalledWith('en');
    expect(recargar).toHaveBeenCalledTimes(1);
  });
});
