package com.crowdfunding.contribution.api.exception;

import java.net.URI;
import java.util.Map;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;

/**
 * Arma los errores en RFC 9457 ({@code application/problem+json}) con el mismo formato que el
 * gateway e identity-service (docs/stack-y-convenciones.md §5.6).
 */
public final class Problemas {

  public static final String BASE_TIPO = "https://api.suertudometro.com/errores/";

  /** El mismo {@code title} en español que usan el gateway e identity-service. */
  private static final Map<Integer, String> TITULO_POR_ESTADO =
      Map.ofEntries(
          Map.entry(400, "Solicitud incorrecta"),
          Map.entry(401, "No autenticado"),
          Map.entry(403, "Prohibido"),
          Map.entry(404, "No encontrado"),
          Map.entry(405, "Método no permitido"),
          Map.entry(409, "Conflicto"),
          Map.entry(413, "Contenido demasiado grande"),
          Map.entry(415, "Tipo de contenido no admitido"),
          Map.entry(500, "Error interno del servidor"));

  private Problemas() {}

  /**
   * @param codigo el código del error (el final del {@code type}), o {@code null} para un error
   *     HTTP sin significado propio, que lleva {@code type: about:blank} (RFC 9457 §4.2.1)
   * @param detalle texto para la persona
   * @param instancia la ruta de la petición
   */
  public static ProblemDetail crear(
      HttpStatusCode estado, String codigo, String detalle, String instancia) {
    ProblemDetail problema = ProblemDetail.forStatus(estado);
    problema.setType(URI.create(codigo == null ? "about:blank" : BASE_TIPO + codigo));
    problema.setTitle(tituloDe(estado.value()));
    problema.setDetail(detalle);
    problema.setInstance(URI.create(instancia));
    return problema;
  }

  static String tituloDe(int estado) {
    return TITULO_POR_ESTADO.getOrDefault(
        estado, estado >= 500 ? "Error del servidor" : "Error de la solicitud");
  }
}
