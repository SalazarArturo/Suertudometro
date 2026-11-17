package com.crowdfunding.contribution.api.dto;

import com.crowdfunding.contribution.application.query.AporteVista;
import com.crowdfunding.contribution.application.query.Pagina;
import java.util.List;

/**
 * Una página de aportes en las respuestas del API.
 *
 * @param pagina el número de página, desde 1
 * @param tamano cuántos elementos se pidieron por página
 */
public record PaginaRespuesta(
    List<AporteRespuesta> elementos,
    int pagina,
    int tamano,
    long totalElementos,
    int totalPaginas) {

  public static PaginaRespuesta desde(Pagina<AporteVista> pagina) {
    return new PaginaRespuesta(
        pagina.elementos().stream().map(AporteRespuesta::desde).toList(),
        pagina.pagina(),
        pagina.tamano(),
        pagina.totalElementos(),
        pagina.totalPaginas());
  }
}
