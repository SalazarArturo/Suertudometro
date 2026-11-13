/**
 * Cuenta caracteres como los ve una persona: "á" o un emoji valen uno,
 * aunque en UTF-16 ocupen más de una unidad.
 */
export function contarCaracteres(texto: string): number {
  return Array.from(texto).length;
}
