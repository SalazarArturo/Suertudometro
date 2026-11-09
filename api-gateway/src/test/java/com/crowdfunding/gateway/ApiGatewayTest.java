package com.crowdfunding.gateway;

import static org.springframework.http.HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN;
import static org.springframework.http.HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS;
import static org.springframework.http.HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.springframework.http.HttpHeaders.ORIGIN;
import static org.springframework.http.HttpHeaders.WWW_AUTHENTICATE;

import com.crowdfunding.gateway.errores.Problemas;
import com.nimbusds.jwt.PlainJWT;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.netty.DisposableServer;

/** El gateway completo contra un servicio de prueba (api-gateway.md §10). */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApiGatewayTest {

  private static final String FRONTEND = "http://localhost:4200";
  private static final DisposableServer SERVICIO = ServicioDePrueba.iniciar();

  @DynamicPropertySource
  static void configurar(DynamicPropertyRegistry registro) {
    registro.add("JWT_SECRETO", () -> Tokens.SECRETO);
    registro.add("IDENTITY_URL", () -> "http://127.0.0.1:" + SERVICIO.port());
    // Menos que los 3 s que tarda la ruta lenta del servicio de prueba.
    registro.add("spring.cloud.gateway.server.webflux.httpclient.response-timeout", () -> "1s");
  }

  @AfterAll
  static void detenerServicio() {
    SERVICIO.disposeNow();
  }

  @LocalServerPort private int puerto;

  private WebTestClient cliente;

  @BeforeEach
  void crearCliente() {
    cliente =
        WebTestClient.bindToServer()
            .baseUrl("http://localhost:" + puerto)
            .responseTimeout(Duration.ofSeconds(10))
            .build();
  }

  @Test
  @DisplayName("una ruta pública pasa sin token, y los X-Usuario-* falsos del cliente no llegan")
  void rutaPublicaSinToken() {
    cliente
        .post()
        .uri("/api/identidad/sesiones")
        .header("X-Usuario-Id", "falso")
        .header("X-Usuario-Rol", "ADMINISTRADOR")
        .contentType(MediaType.APPLICATION_JSON)
        .bodyValue("{}")
        .exchange()
        .expectStatus()
        .isOk()
        .expectHeader()
        .valueEquals("eco-ruta", "POST /api/identidad/sesiones")
        .expectHeader()
        .doesNotExist("eco-x-usuario-id")
        .expectHeader()
        .doesNotExist("eco-x-usuario-rol");
  }

  @Test
  @DisplayName("sin token, una ruta protegida da 401 no-autenticado y no llega al servicio")
  void rutaProtegidaSinToken() {
    cliente
        .get()
        .uri("/api/identidad/perfil")
        .exchange()
        .expectStatus()
        .isUnauthorized()
        .expectHeader()
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .expectHeader()
        .valueEquals(WWW_AUTHENTICATE, "Bearer")
        .expectHeader()
        .doesNotExist("eco-ruta")
        .expectBody()
        .jsonPath("$.type")
        .isEqualTo(Problemas.BASE_TIPO + "no-autenticado")
        .jsonPath("$.title")
        .isEqualTo("No autenticado")
        .jsonPath("$.status")
        .isEqualTo(401)
        .jsonPath("$.detail")
        .isEqualTo("Hace falta iniciar sesión: falta el token.")
        .jsonPath("$.instance")
        .isEqualTo("/api/identidad/perfil");
  }

  @Test
  @DisplayName(
      "con un token válido llegan los tres headers, el rol del token y no el Authorization")
  void rutaProtegidaConTokenValido() {
    cliente
        .get()
        .uri("/api/identidad/perfil")
        .header(AUTHORIZATION, "Bearer " + Tokens.valido())
        .header("X-Usuario-Rol", "ADMINISTRADOR")
        .exchange()
        .expectStatus()
        .isOk()
        .expectHeader()
        .valueEquals("eco-x-usuario-id", Tokens.ID_USUARIO)
        .expectHeader()
        .valueEquals("eco-x-usuario-rol", "USUARIO")
        .expectHeader()
        .valueEquals("eco-x-usuario-nombre", "Ana%20P%C3%A9rez")
        .expectHeader()
        .doesNotExist("eco-authorization");
  }

  @Test
  @DisplayName("en una ruta pública con un token válido también agrega la identidad")
  void rutaPublicaConTokenValido() {
    cliente
        .post()
        .uri("/api/identidad/sesiones")
        .header(AUTHORIZATION, "Bearer " + Tokens.valido())
        .exchange()
        .expectStatus()
        .isOk()
        .expectHeader()
        .valueEquals("eco-x-usuario-id", Tokens.ID_USUARIO);
  }

  static Stream<Arguments> tokensInvalidos() {
    Instant haceDosHoras = Instant.now().minusSeconds(7200);
    return Stream.of(
        Arguments.of(
            "vencido",
            Tokens.firmar(
                Tokens.SECRETO,
                Tokens.claims()
                    .issueTime(Date.from(haceDosHoras))
                    .expirationTime(Date.from(haceDosHoras.plusSeconds(3600)))
                    .build())),
        Arguments.of(
            "firmado con otro secreto",
            Tokens.firmar("otro-secreto-de-prueba-de-al-menos-32-bytes", Tokens.claims().build())),
        Arguments.of(
            "sin rol", Tokens.firmar(Tokens.SECRETO, Tokens.claims().claim("rol", null).build())),
        Arguments.of(
            "con un rol desconocido",
            Tokens.firmar(Tokens.SECRETO, Tokens.claims().claim("rol", "ORGANIZADOR").build())),
        Arguments.of(
            "sin nombre",
            Tokens.firmar(Tokens.SECRETO, Tokens.claims().claim("nombre", null).build())),
        Arguments.of(
            "sin vencimiento",
            Tokens.firmar(Tokens.SECRETO, Tokens.claims().expirationTime(null).build())),
        Arguments.of("sin firma", new PlainJWT(Tokens.claims().build()).serialize()),
        Arguments.of("mal formado", "esto-no-es-un-jwt"));
  }

  @ParameterizedTest(name = "un token {0} da 401")
  @MethodSource("tokensInvalidos")
  void tokenInvalido(String caso, String token) {
    cliente
        .get()
        .uri("/api/identidad/perfil")
        .header(AUTHORIZATION, "Bearer " + token)
        .exchange()
        .expectStatus()
        .isUnauthorized()
        .expectHeader()
        .valueEquals(WWW_AUTHENTICATE, "Bearer error=\"invalid_token\"")
        .expectHeader()
        .doesNotExist("eco-ruta")
        .expectBody()
        .jsonPath("$.type")
        .isEqualTo(Problemas.BASE_TIPO + "no-autenticado")
        .jsonPath("$.detail")
        .isEqualTo("Hace falta iniciar sesión: el token no es válido o venció.");
  }

  @Test
  @DisplayName("un token inválido da 401 aunque la ruta sea pública")
  void tokenInvalidoEnRutaPublica() {
    cliente
        .post()
        .uri("/api/identidad/sesiones")
        .header(AUTHORIZATION, "Bearer esto-no-es-un-jwt")
        .exchange()
        .expectStatus()
        .isUnauthorized()
        .expectHeader()
        .doesNotExist("eco-ruta");
  }

  @Test
  @DisplayName("acepta el preflight del frontend sin llegar al servicio")
  void preflightDelFrontend() {
    cliente
        .options()
        .uri("/api/identidad/sesiones")
        .header(ORIGIN, FRONTEND)
        .header(ACCESS_CONTROL_REQUEST_METHOD, "POST")
        .header(ACCESS_CONTROL_REQUEST_HEADERS, "content-type")
        .exchange()
        .expectStatus()
        .isOk()
        .expectHeader()
        .valueEquals(ACCESS_CONTROL_ALLOW_ORIGIN, FRONTEND)
        .expectHeader()
        .doesNotExist("eco-ruta");
  }

  @Test
  @DisplayName("rechaza el preflight de otro origen")
  void preflightDeOtroOrigen() {
    cliente
        .options()
        .uri("/api/identidad/sesiones")
        .header(ORIGIN, "http://sitio-falso.com")
        .header(ACCESS_CONTROL_REQUEST_METHOD, "POST")
        .exchange()
        .expectStatus()
        .isForbidden()
        .expectHeader()
        .doesNotExist(ACCESS_CONTROL_ALLOW_ORIGIN);
  }

  @Test
  @DisplayName("el 401 lleva los headers de CORS, para que el frontend pueda leerlo")
  void corsEnEl401() {
    cliente
        .get()
        .uri("/api/identidad/perfil")
        .header(ORIGIN, FRONTEND)
        .exchange()
        .expectStatus()
        .isUnauthorized()
        .expectHeader()
        .valueEquals(ACCESS_CONTROL_ALLOW_ORIGIN, FRONTEND);
  }

  @Test
  @DisplayName("la respuesta del servicio lleva los headers de CORS")
  void corsEnLaRespuestaDelServicio() {
    cliente
        .post()
        .uri("/api/identidad/sesiones")
        .header(ORIGIN, FRONTEND)
        .exchange()
        .expectStatus()
        .isOk()
        .expectHeader()
        .valueEquals(ACCESS_CONTROL_ALLOW_ORIGIN, FRONTEND);
  }

  @Test
  @DisplayName("una ruta que no existe da 404 about:blank")
  void rutaInexistente() {
    cliente
        .get()
        .uri("/api/nada")
        .header(AUTHORIZATION, "Bearer " + Tokens.valido())
        .exchange()
        .expectStatus()
        .isNotFound()
        .expectHeader()
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .expectBody()
        .jsonPath("$.type")
        .isEqualTo("about:blank")
        .jsonPath("$.title")
        .isEqualTo("No encontrado")
        .jsonPath("$.instance")
        .isEqualTo("/api/nada");
  }

  @Test
  @DisplayName("un servicio que tarda demasiado da 504 servicio-sin-respuesta")
  void servicioLento() {
    cliente
        .get()
        .uri("/api/identidad/lento")
        .header(AUTHORIZATION, "Bearer " + Tokens.valido())
        .exchange()
        .expectStatus()
        .isEqualTo(504)
        .expectBody()
        .jsonPath("$.type")
        .isEqualTo(Problemas.BASE_TIPO + "servicio-sin-respuesta")
        .jsonPath("$.title")
        .isEqualTo("Tiempo de espera agotado");
  }

  @Test
  @DisplayName("GET /salud responde sin token")
  void salud() {
    cliente
        .get()
        .uri("/salud")
        .exchange()
        .expectStatus()
        .isOk()
        .expectBody()
        .jsonPath("$.status")
        .isEqualTo("UP");
  }
}
