package com.crowdfunding.gateway;

import com.crowdfunding.gateway.errores.Problemas;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;

/** Con el servicio caído, el gateway responde 503 en RFC 9457 (api-gateway.md §5). */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ServicioCaidoTest {

  @DynamicPropertySource
  static void configurar(DynamicPropertyRegistry registro) {
    registro.add("JWT_SECRETO", () -> Tokens.SECRETO);
    // En el puerto 1 no escucha nadie: la conexión se rechaza enseguida.
    registro.add("IDENTITY_URL", () -> "http://127.0.0.1:1");
  }

  @LocalServerPort private int puerto;

  @Test
  @DisplayName("si el servicio no acepta la conexión, da 503 servicio-no-disponible")
  void servicioCaido() {
    WebTestClient.bindToServer()
        .baseUrl("http://localhost:" + puerto)
        .build()
        .post()
        .uri("/api/identidad/sesiones")
        .exchange()
        .expectStatus()
        .isEqualTo(503)
        .expectHeader()
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .expectBody()
        .jsonPath("$.type")
        .isEqualTo(Problemas.BASE_TIPO + "servicio-no-disponible")
        .jsonPath("$.instance")
        .isEqualTo("/api/identidad/sesiones");
  }
}
