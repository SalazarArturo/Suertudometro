package com.crowdfunding.gateway.errores;

import java.net.ConnectException;
import java.net.UnknownHostException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.webflux.error.ErrorWebExceptionHandler;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Los errores del propio gateway, en RFC 9457 (api-gateway.md §5). Los errores que responde un
 * servicio no pasan por aquí: llegan al cliente tal cual.
 *
 * <p>Va antes que el manejador de Spring Boot ({@code @Order(-2)}), que respondería otro formato.
 */
@Component
@Order(-2)
public class ManejadorErrores implements ErrorWebExceptionHandler {

  static final String NO_DISPONIBLE =
      "El servicio no está disponible en este momento. Intenta de nuevo en unos minutos.";
  static final String SIN_RESPUESTA =
      "El servicio tardó demasiado en responder. Intenta de nuevo en unos minutos.";
  static final String INESPERADO = "Ocurrió un error inesperado. Intenta de nuevo más tarde.";

  private static final Logger log = LoggerFactory.getLogger(ManejadorErrores.class);

  private final Problemas problemas;

  public ManejadorErrores(Problemas problemas) {
    this.problemas = problemas;
  }

  @Override
  public Mono<Void> handle(ServerWebExchange intercambio, Throwable error) {
    if (intercambio.getResponse().isCommitted()) {
      return Mono.error(error);
    }
    // El servicio está caído, arrancando o su nombre no existe en la red de Docker.
    if (esFallaDeConexion(error)) {
      return problemas.escribir(
          intercambio, HttpStatus.SERVICE_UNAVAILABLE, "servicio-no-disponible", NO_DISPONIBLE);
    }
    if (error instanceof ResponseStatusException conEstado) {
      int estado = conEstado.getStatusCode().value();
      if (estado == HttpStatus.GATEWAY_TIMEOUT.value()) {
        return problemas.escribir(
            intercambio, conEstado.getStatusCode(), "servicio-sin-respuesta", SIN_RESPUESTA);
      }
      if (estado == HttpStatus.SERVICE_UNAVAILABLE.value()) {
        return problemas.escribir(
            intercambio, conEstado.getStatusCode(), "servicio-no-disponible", NO_DISPONIBLE);
      }
      if (estado < 500) {
        return problemas.escribir(intercambio, conEstado.getStatusCode(), null, detalleDe(estado));
      }
    }
    var peticion = intercambio.getRequest();
    log.error("Error inesperado en {} {}", peticion.getMethod(), peticion.getPath(), error);
    return problemas.escribir(intercambio, HttpStatus.INTERNAL_SERVER_ERROR, null, INESPERADO);
  }

  private static boolean esFallaDeConexion(Throwable error) {
    for (Throwable causa = error; causa != null; causa = causa.getCause()) {
      if (causa instanceof ConnectException || causa instanceof UnknownHostException) {
        return true;
      }
    }
    return false;
  }

  private static String detalleDe(int estado) {
    return switch (estado) {
      case 404 -> "La ruta no existe.";
      case 405 -> "La ruta no admite ese método.";
      case 413 -> "La petición es demasiado grande.";
      case 415 -> "El tipo de contenido no se admite.";
      default -> "La solicitud no es válida.";
    };
  }
}
