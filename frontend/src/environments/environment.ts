/**
 * Configuración de build (docs/frontend.md §7). No va nada secreto: todo lo
 * que está aquí termina en el bundle que descarga el navegador.
 */
export const environment = {
  /**
   * El api-gateway publicado en el host. Es el mismo valor con `ng serve` y en
   * Docker, porque en los dos casos el navegador corre en el host.
   */
  urlApi: 'http://localhost:8080/api',
};
