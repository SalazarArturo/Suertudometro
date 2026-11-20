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
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.netty.DisposableServer;

/** El gateway completo contra un servicio de prueba por cada ruta activa (api-gateway.md §10). */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApiGatewayTest {

  private static final String FRONTEND = "http://localhost:4200";
  private static final String ID_CAMPANA = "3f1c2a4e-8b7d-4c21-9f0e-5a6b7c8d9e01";
  private static final String ID_APORTE = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
  private static final DisposableServer IDENTIDAD = ServicioDePrueba.iniciar("identity-service");
  private static final DisposableServer APORTES = ServicioDePrueba.iniciar("contribution-service");
  private static final DisposableServer NOVEDADES = ServicioDePrueba.iniciar("update-service");
  private static final DisposableServer BUSQUEDA = ServicioDePrueba.iniciar("search-service");

  @DynamicPropertySource
  static void configurar(DynamicPropertyRegistry registro) {
    registro.add("JWT_SECRETO", () -> Tokens.SECRETO);
    registro.add("IDENTITY_URL", () -> url(IDENTIDAD));
    registro.add("CONTRIBUTION_URL", () -> url(APORTES));
    registro.add("UPDATE_URL", () -> url(NOVEDADES));
    registro.add("SEARCH_URL", () -> url(BUSQUEDA));
    // Menos que los 3 s que tarda la ruta lenta del servicio de prueba.
    registro.add("spring.cloud.gateway.server.webflux.httpclient.response-timeout", () -> "1s");
  }

  private static String url(DisposableServer servicio) {
    return "http://127.0.0.1:" + servicio.port();
  }

  @AfterAll
  static void detenerServicios() {
    Stream.of(IDENTIDAD, APORTES, NOVEDADES, BUSQUEDA).forEach(DisposableServer::disposeNow);
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

  static Stream<Arguments> rutasDeCadaServicio() {
    return Stream.of(
        Arguments.of("GET", "/api/identidad/perfil", "identity-service"),
        Arguments.of("POST", "/api/aportes", "contribution-service"),
        Arguments.of("GET", "/api/aportes/mios", "contribution-service"),
        Arguments.of("POST", "/api/novedades", "update-service"),
        Arguments.of("GET", "/api/novedades/campana/" + ID_CAMPANA, "update-service"),
        Arguments.of("GET", "/api/busqueda", "search-service"));
  }

  @ParameterizedTest(name = "{0} {1} llega a {2} sin reescribir la ruta")
  @MethodSource("rutasDeCadaServicio")
  void cadaPrefijoLlegaASuServicio(String metodo, String ruta, String servicio) {
    cliente
        .method(HttpMethod.valueOf(metodo))
        .uri(ruta)
        .header(AUTHORIZATION, "Bearer " + Tokens.valido())
        .exchange()
        .expectStatus()
        .isOk()
        .expectHeader()
        .valueEquals("eco-servicio", servicio)
        .expectHeader()
        .valueEquals("eco-ruta", metodo + " " + ruta);
  }

  static Stream<Arguments> lecturasPublicasDeLosServicios() {
    return Stream.of(
        Arguments.of("/api/aportes?idCampana=" + ID_CAMPANA, "contribution-service"),
        Arguments.of("/api/novedades/campana/" + ID_CAMPANA, "update-service"),
        Arguments.of("/api/novedades/esquema", "update-service"),
        Arguments.of("/api/novedades/documentacion", "update-service"),
        Arguments.of("/api/busqueda", "search-service"),
        Arguments.of(
            "/api/busqueda?texto=libros&estado=TODOS&orden=popularidad", "search-service"));
  }

  @ParameterizedTest(name = "GET {0} pasa sin token")
  @MethodSource("lecturasPublicasDeLosServicios")
  void lecturaPublicaSinToken(String ruta, String servicio) {
    cliente
        .get()
        .uri(ruta)
        .exchange()
        .expectStatus()
        .isOk()
        .expectHeader()
        .valueEquals("eco-servicio", servicio)
        .expectHeader()
        .valueEquals("eco-ruta", "GET " + ruta);
  }

  static Stream<Arguments> rutasProtegidasDeLosServicios() {
    return Stream.of(
        Arguments.of("POST", "/api/aportes"),
        Arguments.of("GET", "/api/aportes/mios"),
        Arguments.of("GET", "/api/aportes/recibidos?idCampana=" + ID_CAMPANA),
        Arguments.of("GET", "/api/aportes/" + ID_APORTE),
        Arguments.of("POST", "/api/busqueda"),
        Arguments.of("GET", "/api/busqueda/esquema"),
        Arguments.of("POST", "/api/novedades"),
        // Solo la lectura del historial es pública, no otro método sobre la misma ruta.
        Arguments.of("POST", "/api/novedades/campana/" + ID_CAMPANA));
  }

  @ParameterizedTest(name = "sin token, {0} {1} da 401")
  @MethodSource("rutasProtegidasDeLosServicios")
  void rutaProtegidaDeUnServicioSinToken(String metodo, String ruta) {
    cliente
        .method(HttpMethod.valueOf(metodo))
        .uri(ruta)
        .exchange()
        .expectStatus()
        .isUnauthorized()
        .expectHeader()
        .doesNotExist("eco-ruta");
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
