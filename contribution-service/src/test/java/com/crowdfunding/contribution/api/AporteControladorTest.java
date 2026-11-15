package com.crowdfunding.contribution.api;

import static com.crowdfunding.contribution.soporte.Ejemplos.AHORA;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_APORTANTE;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_CAMPANA;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_ORGANIZADOR;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_OTRO_USUARIO;
import static com.crowdfunding.contribution.soporte.Ejemplos.campanaCerrada;
import static com.crowdfunding.contribution.soporte.Ejemplos.campanaPublicada;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.crowdfunding.contribution.api.controller.AporteControlador;
import com.crowdfunding.contribution.domain.model.EstadoCampanaAportable;
import com.crowdfunding.contribution.infrastructure.config.ConfiguracionPipelinr;
import com.crowdfunding.contribution.soporte.AlmacenEnMemoria;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Prueba el API de punta a punta sin base de datos ni RabbitMQ: los controladores, el pipeline y
 * los manejadores son los reales, y los repositorios y puertos guardan en memoria. La identidad se
 * simula con los headers {@code X-Usuario-*}, como los manda el gateway.
 */
@WebMvcTest(AporteControlador.class)
@Import({ConfiguracionPipelinr.class, AporteControladorTest.DoblesEnMemoria.class})
class AporteControladorTest {

  private static final String PROBLEMA = "application/problem+json";
  private static final String TIPO = "https://api.suertudometro.com/errores/";

  @TestConfiguration
  static class DoblesEnMemoria {

    @Bean
    AlmacenEnMemoria almacen() {
      return new AlmacenEnMemoria();
    }

    @Bean
    Clock reloj() {
      return Clock.fixed(AHORA, ZoneOffset.UTC);
    }
  }

  @Autowired private MockMvc mvc;
  @Autowired private AlmacenEnMemoria almacen;

  @BeforeEach
  void prepararCampana() {
    almacen.vaciar();
    almacen.guardar(campanaPublicada());
  }

  // POST /api/aportes

  @Test
  void registraUnAporteYLoMuestraEnElHistorial() throws Exception {
    String idAporte = aportar(comoAna(), "150.00", "¡Mucho éxito con la campaña!", false);

    mvc.perform(get("/api/aportes").param("idCampana", ID_CAMPANA.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElementos").value(1))
        .andExpect(jsonPath("$.elementos[0].idAporte").value(idAporte))
        .andExpect(jsonPath("$.elementos[0].idCampana").value(ID_CAMPANA.toString()))
        .andExpect(jsonPath("$.elementos[0].tituloCampana").value("Libros para la biblioteca"))
        // El dinero viaja como texto con dos decimales, nunca como número.
        .andExpect(jsonPath("$.elementos[0].monto").value("150.00"))
        .andExpect(jsonPath("$.elementos[0].moneda").value("BOB"))
        .andExpect(jsonPath("$.elementos[0].esAnonimo").value(false))
        // El nombre llegó codificado en el header (Ana%20P%C3%A9rez) y se decodificó.
        .andExpect(jsonPath("$.elementos[0].nombreAportante").value("Ana Pérez"))
        .andExpect(jsonPath("$.elementos[0].mensajeApoyo").value("¡Mucho éxito con la campaña!"))
        .andExpect(jsonPath("$.elementos[0].registradoEn").value("2026-11-14T15:30:00Z"));
  }

  @Test
  void respondeCreadoConLaUbicacionDelAporte() throws Exception {
    mvc.perform(
            comoAna(post("/api/aportes"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo("20", null, false)))
        .andExpect(status().isCreated())
        .andExpect(header().string("Location", org.hamcrest.Matchers.startsWith("/api/aportes/")))
        .andExpect(jsonPath("$.idAporte").isString());

    assertThat(almacen.eventosPublicados()).hasSize(1);
  }

  @Test
  void unAporteAnonimoNoMuestraElNombreNiElIdDelAportante() throws Exception {
    aportar(comoAna(), "20.00", null, true);

    mvc.perform(get("/api/aportes").param("idCampana", ID_CAMPANA.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.elementos[0].esAnonimo").value(true))
        .andExpect(jsonPath("$.elementos[0].nombreAportante").value(nullValue()))
        .andExpect(jsonPath("$.elementos[0].mensajeApoyo").value(nullValue()))
        .andExpect(jsonPath("$.elementos[0].idAportante").doesNotExist());
  }

  @Test
  void aportarRequiereSesion() throws Exception {
    mvc.perform(
            post("/api/aportes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo("150.00", null, false)))
        .andExpect(status().isUnauthorized())
        .andExpect(content().contentTypeCompatibleWith(PROBLEMA))
        .andExpect(jsonPath("$.type").value(TIPO + "no-autenticado"))
        .andExpect(jsonPath("$.title").value("No autenticado"))
        .andExpect(jsonPath("$.status").value(401))
        .andExpect(jsonPath("$.detail").value("Hace falta iniciar sesión."))
        .andExpect(jsonPath("$.instance").value("/api/aportes"));

    assertThat(almacen.aportes()).isEmpty();
  }

  @ParameterizedTest
  @CsvSource({
    "no-es-un-uuid, USUARIO, Ana",
    "dcfce0af-9a86-4d5c-b79a-4c4e206754f0, ORGANIZADOR, Ana",
    "dcfce0af-9a86-4d5c-b79a-4c4e206754f0, USUARIO, %E0%A4%A",
    "dcfce0af-9a86-4d5c-b79a-4c4e206754f0, USUARIO, %20"
  })
  void unaIdentidadMalFormadaNoCuentaComoSesion(String id, String rol, String nombre)
      throws Exception {
    mvc.perform(
            post("/api/aportes")
                .header("X-Usuario-Id", id)
                .header("X-Usuario-Rol", rol)
                .header("X-Usuario-Nombre", nombre)
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo("150.00", null, false)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.type").value(TIPO + "no-autenticado"));
  }

  @Test
  void siFaltanCamposRespondeValidacionConElErrorDeCadaCampo() throws Exception {
    mvc.perform(comoAna(post("/api/aportes")).contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentTypeCompatibleWith(PROBLEMA))
        .andExpect(jsonPath("$.type").value(TIPO + "validacion"))
        .andExpect(jsonPath("$.title").value("Solicitud incorrecta"))
        .andExpect(jsonPath("$.errores", hasSize(3)))
        .andExpect(
            jsonPath("$.errores[*].campo", containsInAnyOrder("idCampana", "monto", "moneda")))
        .andExpect(
            jsonPath("$.errores[?(@.campo == 'monto')].mensaje").value("El monto es obligatorio."));
  }

  @ParameterizedTest
  @CsvSource({
    "abc, BOB, monto-invalido",
    "0.00, BOB, monto-invalido",
    "-5, BOB, monto-invalido",
    "150.123, BOB, monto-invalido",
    "150.00, USD, moneda-distinta-de-la-campana",
    "150.00, bob, moneda-invalida"
  })
  void unDatoQueIncumpleUnaReglaRespondeConElCodigoDeLaRegla(
      String monto, String moneda, String codigo) throws Exception {
    String cuerpo =
        """
        {"idCampana": "%s", "monto": "%s", "moneda": "%s"}
        """
            .formatted(ID_CAMPANA, monto, moneda);

    mvc.perform(
            comoAna(post("/api/aportes")).contentType(MediaType.APPLICATION_JSON).content(cuerpo))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentTypeCompatibleWith(PROBLEMA))
        .andExpect(jsonPath("$.type").value(TIPO + codigo))
        .andExpect(jsonPath("$.detail").isNotEmpty());

    assertThat(almacen.aportes()).isEmpty();
  }

  @Test
  void unMensajeDeMasDeTrescientosCaracteresSeRechaza() throws Exception {
    mvc.perform(
            comoAna(post("/api/aportes"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo("150.00", "a".repeat(301), false)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").value(TIPO + "mensaje-apoyo-demasiado-largo"));
  }

  @Test
  void unaCampanaDesconocidaNoSeEncuentra() throws Exception {
    almacen.vaciar();

    mvc.perform(
            comoAna(post("/api/aportes"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo("150.00", null, false)))
        .andExpect(status().isNotFound())
        .andExpect(content().contentTypeCompatibleWith(PROBLEMA))
        .andExpect(jsonPath("$.type").value(TIPO + "campana-no-encontrada"))
        .andExpect(jsonPath("$.title").value("No encontrado"));
  }

  @ParameterizedTest
  @CsvSource({"FINALIZADA", "CANCELADA"})
  void unaCampanaCerradaRespondeConflicto(EstadoCampanaAportable estadoFinal) throws Exception {
    almacen.guardar(campanaCerrada(ID_CAMPANA, estadoFinal));

    mvc.perform(
            comoAna(post("/api/aportes"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo("150.00", null, false)))
        .andExpect(status().isConflict())
        .andExpect(content().contentTypeCompatibleWith(PROBLEMA))
        .andExpect(jsonPath("$.type").value(TIPO + "campana-no-acepta-aportes"))
        .andExpect(jsonPath("$.title").value("Conflicto"))
        .andExpect(jsonPath("$.status").value(409));

    assertThat(almacen.aportes()).isEmpty();
  }

  @Test
  void unJsonIlegibleRespondeSolicitudIncorrecta() throws Exception {
    mvc.perform(
            comoAna(post("/api/aportes"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ esto no es json"))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentTypeCompatibleWith(PROBLEMA))
        .andExpect(jsonPath("$.type").value("about:blank"))
        .andExpect(jsonPath("$.title").value("Solicitud incorrecta"));
  }

  // GET /api/aportes?idCampana=

  @Test
  void elHistorialEsPublicoYUsaLaPaginacionPorDefecto() throws Exception {
    mvc.perform(get("/api/aportes").param("idCampana", ID_CAMPANA.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.elementos", hasSize(0)))
        .andExpect(jsonPath("$.pagina").value(1))
        .andExpect(jsonPath("$.tamano").value(20))
        .andExpect(jsonPath("$.totalElementos").value(0))
        .andExpect(jsonPath("$.totalPaginas").value(0));
  }

  @Test
  void elHistorialSePagina() throws Exception {
    aportar(comoAna(), "10.00", null, false);
    aportar(comoAna(), "20.00", null, false);
    aportar(comoAna(), "30.00", null, false);

    mvc.perform(
            get("/api/aportes")
                .param("idCampana", ID_CAMPANA.toString())
                .param("pagina", "2")
                .param("tamano", "2"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.elementos", hasSize(1)))
        .andExpect(jsonPath("$.pagina").value(2))
        .andExpect(jsonPath("$.tamano").value(2))
        .andExpect(jsonPath("$.totalElementos").value(3))
        .andExpect(jsonPath("$.totalPaginas").value(2));
  }

  @ParameterizedTest
  @CsvSource({"pagina, 0", "tamano, 0", "tamano, 101"})
  void unaPaginacionFueraDeRangoRespondeValidacion(String parametro, String valor)
      throws Exception {
    mvc.perform(
            get("/api/aportes").param("idCampana", ID_CAMPANA.toString()).param(parametro, valor))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").value(TIPO + "validacion"))
        .andExpect(jsonPath("$.errores[0].campo").value(parametro));
  }

  @Test
  void elHistorialNecesitaElIdDeLaCampana() throws Exception {
    mvc.perform(get("/api/aportes"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").value(TIPO + "validacion"))
        .andExpect(jsonPath("$.errores[0].campo").value("idCampana"));

    mvc.perform(get("/api/aportes").param("idCampana", "no-es-un-uuid"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").value(TIPO + "validacion"))
        .andExpect(jsonPath("$.errores[0].campo").value("idCampana"));
  }

  // GET /api/aportes/mios

  @Test
  void misAportesTraeSoloLosDelUsuarioConSesion() throws Exception {
    aportar(comoAna(), "150.00", null, true);
    aportar(como(ID_OTRO_USUARIO, "USUARIO", "Luis%20Roca"), "20.00", null, false);

    mvc.perform(comoAna(get("/api/aportes/mios")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElementos").value(1))
        .andExpect(jsonPath("$.elementos[0].monto").value("150.00"));
  }

  @Test
  void misAportesRequiereSesion() throws Exception {
    mvc.perform(get("/api/aportes/mios"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.type").value(TIPO + "no-autenticado"));
  }

  // GET /api/aportes/recibidos?idCampana=

  @Test
  void elOrganizadorYLaAdministracionVenLosAportesRecibidos() throws Exception {
    aportar(comoAna(), "150.00", null, true);

    mvc.perform(como(ID_ORGANIZADOR, "USUARIO", "Olga").apply(recibidos()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElementos").value(1))
        // Ni el organizador ve el nombre de un aporte anónimo.
        .andExpect(jsonPath("$.elementos[0].nombreAportante").value(nullValue()));

    mvc.perform(como(ID_OTRO_USUARIO, "ADMINISTRADOR", "Administrador").apply(recibidos()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElementos").value(1));
  }

  @Test
  void otroUsuarioNoVeLosAportesRecibidos() throws Exception {
    mvc.perform(comoAna(recibidos()))
        .andExpect(status().isForbidden())
        .andExpect(content().contentTypeCompatibleWith(PROBLEMA))
        .andExpect(jsonPath("$.type").value(TIPO + "acceso-denegado"))
        .andExpect(jsonPath("$.title").value("Prohibido"));
  }

  @Test
  void losAportesRecibidosRequierenSesion() throws Exception {
    mvc.perform(recibidos()).andExpect(status().isUnauthorized());
  }

  // GET /api/aportes/{idAporte}

  @Test
  void unAporteLoVeQuienLoHizoPeroNoOtroUsuario() throws Exception {
    String idAporte = aportar(comoAna(), "150.00", null, false);

    mvc.perform(comoAna(get("/api/aportes/" + idAporte)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.idAporte").value(idAporte))
        .andExpect(jsonPath("$.monto").value("150.00"));

    mvc.perform(como(ID_OTRO_USUARIO, "USUARIO", "Luis").apply(get("/api/aportes/" + idAporte)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.type").value(TIPO + "acceso-denegado"));
  }

  @Test
  void unAporteInexistenteNoSeEncuentra() throws Exception {
    mvc.perform(comoAna(get("/api/aportes/" + UUID.randomUUID())))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.type").value(TIPO + "aporte-no-encontrado"));

    mvc.perform(comoAna(get("/api/aportes/no-es-un-uuid")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.type").value(TIPO + "validacion"));
  }

  // Ayudas

  /** Registra un aporte y devuelve su id. */
  private String aportar(Identidad identidad, String monto, String mensaje, boolean esAnonimo)
      throws Exception {
    ResultActions respuesta =
        mvc.perform(
                identidad
                    .apply(post("/api/aportes"))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(cuerpo(monto, mensaje, esAnonimo)))
            .andExpect(status().isCreated());
    String ubicacion = respuesta.andReturn().getResponse().getHeader("Location");
    return ubicacion.substring(ubicacion.lastIndexOf('/') + 1);
  }

  private static String cuerpo(String monto, String mensaje, boolean esAnonimo) {
    return """
    {"idCampana": "%s", "monto": "%s", "moneda": "BOB", "mensajeApoyo": %s, "esAnonimo": %s}
    """
        .formatted(ID_CAMPANA, monto, mensaje == null ? "null" : "\"" + mensaje + "\"", esAnonimo);
  }

  private static MockHttpServletRequestBuilder recibidos() {
    return get("/api/aportes/recibidos").param("idCampana", ID_CAMPANA.toString());
  }

  /** Los headers que el gateway agrega a partir del token. */
  @FunctionalInterface
  private interface Identidad {
    MockHttpServletRequestBuilder apply(MockHttpServletRequestBuilder peticion);
  }

  private static Identidad como(UUID id, String rol, String nombreCodificado) {
    return peticion ->
        peticion
            .header("X-Usuario-Id", id.toString())
            .header("X-Usuario-Rol", rol)
            .header("X-Usuario-Nombre", nombreCodificado);
  }

  private static Identidad comoAna() {
    return como(ID_APORTANTE, "USUARIO", "Ana%20P%C3%A9rez");
  }

  private static MockHttpServletRequestBuilder comoAna(MockHttpServletRequestBuilder peticion) {
    return comoAna().apply(peticion);
  }
}
