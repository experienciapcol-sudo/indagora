// Normalización común: minúsculas, sin acentos y espacios colapsados.
export function normalizarTexto(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
export function contieneTermino(textoNorm: string, termino: string): boolean {
  const t = normalizarTexto(termino.replace(/^=/, ''));
  return t.length > 0 && textoNorm.includes(t);
}
