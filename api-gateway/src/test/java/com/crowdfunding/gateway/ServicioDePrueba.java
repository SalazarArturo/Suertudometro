package com.crowdfunding.gateway;

import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import org.reactivestreams.Publisher;
import reactor.core.publisher.Mono;
import reactor.netty.DisposableServer;
import reactor.netty.http.server.HttpServer;
import reactor.netty.http.server.HttpServerRequest;
import reactor.netty.http.server.HttpServerResponse;

/**
 * Un servicio de destino para las pruebas: responde 200 y devuelve en headers {@code eco-*} los
 * {@code X-Usuario-*} y el {@code Authorization} que recibió, más el método y la ruta. La ruta
 * {@code /api/identidad/lento} tarda 3 segundos.
 */
final class ServicioDePrueba {

  private ServicioDePrueba() {}

  static DisposableServer iniciar() {
    return HttpServer.create()
        .host("127.0.0.1")
        .port(0)
        .route(rutas ->
            rutas
                .get(
                    "/api/identidad/lento",
                    (peticion, respuesta) ->
                        respuesta.sendString(Mono.just("{}").delayElement(Duration.ofSeconds(3))))
                .route(peticion -> true, ServicioDePrueba::eco))
        .bindNow();
  }

  private static Publisher<Void> eco(HttpServerRequest peticion, HttpServerResponse respuesta) {
    return peticion
        .receive()
        .then(
            Mono.defer(() -> {
              for (Map.Entry<String, String> cabecera : peticion.requestHeaders()) {
                String nombre = cabecera.getKey().toLowerCase(Locale.ROOT);
                if (nombre.startsWith("x-usuario-") || nombre.equals("authorization")) {
                  respuesta.addHeader("eco-" + nombre, cabecera.getValue());
                }
              }
              return respuesta
                  .header("eco-ruta", peticion.method().name() + " " + peticion.uri())
                  .header("content-type", "application/json")
                  .sendString(Mono.just("{}"))
                  .then();
            }));
  }
}
