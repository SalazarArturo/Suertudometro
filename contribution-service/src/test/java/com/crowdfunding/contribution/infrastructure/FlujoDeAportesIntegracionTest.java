package com.crowdfunding.contribution.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.crowdfunding.contribution.domain.model.EstadoCampanaAportable;
import com.crowdfunding.contribution.infrastructure.messaging.PropiedadesMensajeria;
import com.crowdfunding.contribution.infrastructure.persistence.AporteJpaRepository;
import com.crowdfunding.contribution.infrastructure.persistence.CampanaAportableJpaEntity;
import com.crowdfunding.contribution.infrastructure.persistence.CampanaAportableJpaRepository;
import com.crowdfunding.contribution.infrastructure.persistence.EventoProcesadoJpaRepository;
import com.crowdfunding.contribution.infrastructure.persistence.EventoSalidaJpaRepository;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.AmqpAdmin;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.rabbitmq.RabbitMQContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Prueba de integración: el servicio completo contra un PostgreSQL y un RabbitMQ reales, en
 * contenedores efímeros (docs/stack-y-convenciones.md §5.9). Cubre lo que las pruebas en memoria no
 * pueden: las migraciones de Flyway, las entidades de JPA, el outbox y los consumidores.
 *
 * <p>Los eventos de campaign-service se simulan publicando en el exchange mensajes escritos según
 * docs/contratos-de-eventos.md.
 *
 * <p>Necesita Docker. Sin Docker se omite (no falla); en el CI corre siempre.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
@TestPropertySource(
    properties = {
      // Reintentos y outbox más rápidos, para que la prueba no espere de más.
      "spring.rabbitmq.listener.simple.retry.initial-interval=100ms",
      "suertudometro.outbox.intervalo-ms=200"
    })
class FlujoDeAportesIntegracionTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

  @Container @ServiceConnection
  static final RabbitMQContainer RABBIT = new RabbitMQContainer("rabbitmq:4.3-alpine");

  /** Hace de campaign-service, search-service o notification-service: recibe aporte.registrado. */
  private static final String COLA_DE_CONSUMIDOR = "pruebas.aporte-registrado";

  private static final Duration ESPERA = Duration.ofSeconds(20);
  private static final JsonMapper JSON = JsonMapper.builder().build();
  private static final UUID ID_ORGANIZADOR =
      UUID.fromString("e3b68016-9750-41b3-9e34-762dd8346001");
  private static final UUID ID_APORTANTE = UUID.fromString("dcfce0af-9a86-4d5c-b79a-4c4e206754f0");

  @Autowired private MockMvc mvc;
  @Autowired private RabbitTemplate rabbit;
  @Autowired private AmqpAdmin administradorRabbit;
  @Autowired private PropiedadesMensajeria mensajeria;
  @Autowired private CampanaAportableJpaRepository campanas;
  @Autowired private AporteJpaRepository aportes;
  @Autowired private EventoSalidaJpaRepository eventosSalida;
  @Autowired private EventoProcesadoJpaRepository eventosProcesados;

  @BeforeEach
  void declararColaDeConsumidor() {
    // Durable: RabbitMQ 4.3 ya no admite colas transitorias que no sean exclusivas.
    Queue cola = new Queue(COLA_DE_CONSUMIDOR, true, false, false);
    administradorRabbit.declareQueue(cola);
    // Cada prueba empieza sin mensajes de la anterior.
    administradorRabbit.purgeQueue(COLA_DE_CONSUMIDOR, false);
    administradorRabbit.declareBinding(
        BindingBuilder.bind(cola)
            .to(new TopicExchange(mensajeria.exchange()))
            .with("aporte.registrado"));
  }

  @Test
  void unaCampanaPublicadaRecibeUnAporteYElEventoSaleAlBus() throws Exception {
    UUID idCampana = UUID.randomUUID();
    publicar("campana.publicada", campanaPublicada(UUID.randomUUID(), idCampana));
    esperarCampana(idCampana, EstadoCampanaAportable.PUBLICADA);

    MvcResult creado =
        mvc.perform(
                post("/api/aportes")
                    .header("X-Usuario-Id", ID_APORTANTE.toString())
                    .header("X-Usuario-Rol", "USUARIO")
                    .header("X-Usuario-Nombre", "Ana%20P%C3%A9rez")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"idCampana": "%s", "monto": "150.00", "moneda": "BOB",
                         "mensajeApoyo": "¡Mucho éxito con la campaña!", "esAnonimo": false}
                        """
                            .formatted(idCampana)))
            .andExpect(status().isCreated())
            .andReturn();
    String idAporte =
        JSON.readTree(creado.getResponse().getContentAsString()).get("idAporte").asString();

    // El aporte quedó guardado con su monto exacto.
    assertThat(aportes.findById(UUID.fromString(idAporte)))
        .hasValueSatisfying(fila -> {
          assertThat(fila.getMonto()).isEqualByComparingTo("150.00");
          assertThat(fila.getNombreAportante()).isEqualTo("Ana Pérez");
        });

    // El outbox lo publicó: llega al bus con el sobre y los datos de la ficha AporteRegistrado.
    Message mensaje = rabbit.receive(COLA_DE_CONSUMIDOR, ESPERA.toMillis());
    assertThat(mensaje).as("aporte.registrado en el bus").isNotNull();
    assertThat(mensaje.getMessageProperties().getReceivedRoutingKey())
        .isEqualTo("aporte.registrado");
    JsonNode sobre = JSON.readTree(mensaje.getBody());
    assertThat(sobre.get("tipoEvento").asString()).isEqualTo("aporte.registrado");
    assertThat(sobre.get("version").asInt()).isEqualTo(1);
    assertThat(Instant.parse(sobre.get("ocurridoEn").asString())).isNotNull();
    JsonNode datos = sobre.get("datos");
    assertThat(datos.get("idAporte").asString()).isEqualTo(idAporte);
    assertThat(datos.get("idCampana").asString()).isEqualTo(idCampana.toString());
    assertThat(datos.get("monto").asString()).isEqualTo("150.00");
    assertThat(datos.get("moneda").asString()).isEqualTo("BOB");
    assertThat(datos.get("idAportante").asString()).isEqualTo(ID_APORTANTE.toString());
    assertThat(datos.get("esAnonimo").booleanValue()).isFalse();
    assertThat(datos.get("nombreAportante").asString()).isEqualTo("Ana Pérez");
    assertThat(datos.get("mensajeApoyo").asString()).isEqualTo("¡Mucho éxito con la campaña!");

    // Y la fila del outbox quedó marcada como publicada.
    UUID idEvento = UUID.fromString(sobre.get("idEvento").asString());
    await()
        .atMost(ESPERA)
        .untilAsserted(() ->
            assertThat(eventosSalida.findById(idEvento))
                .hasValueSatisfying(fila -> assertThat(fila.getPublicadoEn()).isNotNull()));

    // El historial público lo lee de la base, con el título de la proyección.
    mvc.perform(get("/api/aportes").param("idCampana", idCampana.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalElementos").value(1))
        .andExpect(jsonPath("$.elementos[0].idAporte").value(idAporte))
        .andExpect(jsonPath("$.elementos[0].tituloCampana").value("Libros para la biblioteca"))
        .andExpect(jsonPath("$.elementos[0].monto").value("150.00"));
  }

  @Test
  void unaCampanaCerradaRechazaLosAportes() throws Exception {
    UUID idCampana = UUID.randomUUID();
    publicar("campana.publicada", campanaPublicada(UUID.randomUUID(), idCampana));
    esperarCampana(idCampana, EstadoCampanaAportable.PUBLICADA);

    publicar("campana.cerrada", campanaCerrada(UUID.randomUUID(), idCampana, "CANCELADA"));
    esperarCampana(idCampana, EstadoCampanaAportable.CANCELADA);

    mvc.perform(
            post("/api/aportes")
                .header("X-Usuario-Id", ID_APORTANTE.toString())
                .header("X-Usuario-Rol", "USUARIO")
                .header("X-Usuario-Nombre", "Ana")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"idCampana": "%s", "monto": "150.00", "moneda": "BOB"}
                    """
                        .formatted(idCampana)))
        .andExpect(status().isConflict())
        .andExpect(
            jsonPath("$.type")
                .value("https://api.suertudometro.com/errores/campana-no-acepta-aportes"));
  }

  @Test
  void unEventoReentregadoNoSeAplicaDosVeces() {
    UUID idEvento = UUID.randomUUID();
    UUID idCampana = UUID.randomUUID();
    publicar("campana.publicada", campanaPublicada(idEvento, idCampana));
    esperarCampana(idCampana, EstadoCampanaAportable.PUBLICADA);
    publicar("campana.cerrada", campanaCerrada(UUID.randomUUID(), idCampana, "FINALIZADA"));
    esperarCampana(idCampana, EstadoCampanaAportable.FINALIZADA);

    // RabbitMQ reentrega la publicación con el mismo idEvento.
    publicar("campana.publicada", campanaPublicada(idEvento, idCampana));
    // Un evento posterior sirve de testigo: cuando se aplicó, el repetido ya había pasado.
    UUID idTestigo = UUID.randomUUID();
    publicar("campana.publicada", campanaPublicada(UUID.randomUUID(), idTestigo));
    esperarCampana(idTestigo, EstadoCampanaAportable.PUBLICADA);

    assertThat(campanas.findById(idCampana))
        .map(CampanaAportableJpaEntity::getEstado)
        .hasValue(EstadoCampanaAportable.FINALIZADA);
    assertThat(eventosProcesados.existsById(idEvento)).isTrue();
  }

  @Test
  void siElCierreLlegaAntesLaPublicacionNoReabreLaCampana() {
    UUID idCampana = UUID.randomUUID();
    publicar("campana.cerrada", campanaCerrada(UUID.randomUUID(), idCampana, "CANCELADA"));
    esperarCampana(idCampana, EstadoCampanaAportable.CANCELADA);

    publicar("campana.publicada", campanaPublicada(UUID.randomUUID(), idCampana));

    await()
        .atMost(ESPERA)
        .untilAsserted(() ->
            assertThat(campanas.findById(idCampana))
                .hasValueSatisfying(fila -> {
                  // Llegaron los datos de la publicación, pero sigue cancelada.
                  assertThat(fila.getTitulo()).isEqualTo("Libros para la biblioteca");
                  assertThat(fila.getEstado()).isEqualTo(EstadoCampanaAportable.CANCELADA);
                }));
  }

  @Test
  void unMensajeQueNoCumpleElContratoTerminaEnLaColaDeErrores() {
    publicar("campana.publicada", "{ esto no es json");

    Message rechazado = rabbit.receive(mensajeria.colaErrores(), ESPERA.toMillis());

    assertThat(rechazado).as("mensaje en la DLQ").isNotNull();
    assertThat(new String(rechazado.getBody(), StandardCharsets.UTF_8))
        .isEqualTo("{ esto no es json");
  }

  private void publicar(String tipoEvento, String json) {
    rabbit.send(
        mensajeria.exchange(),
        tipoEvento,
        MessageBuilder.withBody(json.getBytes(StandardCharsets.UTF_8))
            .setContentType(MessageProperties.CONTENT_TYPE_JSON)
            .build());
  }

  private void esperarCampana(UUID idCampana, EstadoCampanaAportable estado) {
    await()
        .atMost(ESPERA)
        .untilAsserted(() ->
            assertThat(campanas.findById(idCampana))
                .map(CampanaAportableJpaEntity::getEstado)
                .hasValue(estado));
  }

  /** Un {@code campana.publicada} como el de la ficha del contrato. */
  private static String campanaPublicada(UUID idEvento, UUID idCampana) {
    return """
    {
      "idEvento": "%s",
      "tipoEvento": "campana.publicada",
      "version": 1,
      "ocurridoEn": "2026-11-07T14:00:00Z",
      "datos": {
        "idCampana": "%s",
        "idOrganizador": "%s",
        "titulo": "Libros para la biblioteca",
        "historia": "Queremos ampliar la colección de la biblioteca del barrio.",
        "categoria": "EDUCACION",
        "rutaPortada": "/imagenes/biblioteca.jpg",
        "metaFinanciera": "5000.00",
        "moneda": "BOB",
        "fechaLimite": "2026-12-01T00:00:00Z"
      }
    }
    """
        .formatted(idEvento, idCampana, ID_ORGANIZADOR);
  }

  /** Un {@code campana.cerrada} como el de la ficha del contrato. */
  private static String campanaCerrada(UUID idEvento, UUID idCampana, String estadoFinal) {
    String motivoCierre = estadoFinal.equals("CANCELADA") ? "CANCELACION" : "META_ALCANZADA";
    return """
    {
      "idEvento": "%s",
      "tipoEvento": "campana.cerrada",
      "version": 1,
      "ocurridoEn": "2026-11-20T09:00:00Z",
      "datos": {
        "idCampana": "%s",
        "estadoFinal": "%s",
        "motivoCierre": "%s"
      }
    }
    """
        .formatted(idEvento, idCampana, estadoFinal, motivoCierre);
  }
}
