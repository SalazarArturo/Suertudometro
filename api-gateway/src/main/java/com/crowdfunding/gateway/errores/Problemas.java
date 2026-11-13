package com.crowdfunding.gateway.errores;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import tools.jackson.databind.json.JsonMapper;

/**
 * Respuestas de error del gateway en RFC 9457 ({@code application/problem+json}), con el mismo
 * formato que las de los servicios (docs/stack-y-convenciones.md §5.6 y api-gateway.md §5).
 */
@Component
public class Problemas {

  public static final String BASE_TIPO = "https://api.suertudometro.com/errores/";

  /** El mismo {@code title} en español que usa identity-service. */
  private static final Map<Integer, String> TITULO_POR_ESTADO =
      Map.ofEntries(
          Map.entry(400, "Solicitud incorrecta"),
          Map.entry(401, "No autenticado"),
          Map.entry(403, "Prohibido"),
          Map.entry(404, "No encontrado"),
          Map.entry(405, "Método no permitido"),
          Map.entry(413, "Contenido demasiado grande"),
          Map.entry(415, "Tipo de contenido no admitido"),
          Map.entry(500, "Error interno del servidor"),
          Map.entry(502, "Respuesta inválida del servicio"),
          Map.entry(503, "Servicio no disponible"),
          Map.entry(504, "Tiempo de espera agotado"));

  private final JsonMapper json;

  public Problemas(JsonMapper json) {
    this.json = json;
  }

  /**
   * Escribe el problema en la respuesta.
   *
   * @param codigo el código del error (el final del {@code type}), o {@code null} para un error
   *     HTTP sin significado propio, que lleva {@code type: about:blank} (RFC 9457 §4.2.1)
   */
  public Mono<Void> escribir(
      ServerWebExchange intercambio, HttpStatusCode estado, String codigo, String detalle) {
    Map<String, Object> cuerpo = new LinkedHashMap<>();
    cuerpo.put("type", codigo == null ? "about:blank" : BASE_TIPO + codigo);
    cuerpo.put("title", tituloDe(estado.value()));
    cuerpo.put("status", estado.value());
    cuerpo.put("detail", detalle);
    cuerpo.put("instance", intercambio.getRequest().getPath().value());

    ServerHttpResponse respuesta = intercambio.getResponse();
    respuesta.setStatusCode(estado);
    respuesta.getHeaders().setContentType(MediaType.APPLICATION_PROBLEM_JSON);
    byte[] bytes = json.writeValueAsBytes(cuerpo);
    return respuesta.writeWith(Mono.just(respuesta.bufferFactory().wrap(bytes)));
  }

  static String tituloDe(int estado) {
    return TITULO_POR_ESTADO.getOrDefault(
        estado, estado >= 500 ? "Error del servidor" : "Error de la solicitud");
  }
}
