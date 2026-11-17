package com.crowdfunding.contribution.application.query;

import java.util.List;

/**
 * Una página de resultados.
 *
 * @param elementos los resultados de esta página
 * @param pagina el número de página, desde 1
 * @param tamano cuántos elementos se pidieron por página
 * @param totalElementos cuántos elementos hay en total
 */
public record Pagina<T>(List<T> elementos, int pagina, int tamano, long totalElementos) {

  public Pagina {
    elementos = List.copyOf(elementos);
  }

  public int totalPaginas() {
    return (int) Math.ceil((double) totalElementos / tamano);
  }
}
