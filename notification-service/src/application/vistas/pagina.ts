/** Una página de resultados. Las páginas se cuentan desde 1. */
export interface Pagina<T> {
  readonly elementos: readonly T[];
  readonly pagina: number;
  readonly tamano: number;
  readonly totalElementos: number;
}
