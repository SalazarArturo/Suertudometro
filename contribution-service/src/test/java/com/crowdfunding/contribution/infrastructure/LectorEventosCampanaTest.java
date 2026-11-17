package com.crowdfunding.contribution.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import an.awesome.pipelinr.Command;
import an.awesome.pipelinr.Voidy;
import com.crowdfunding.contribution.application.eventhandler.CampanaCerrada;
import com.crowdfunding.contribution.application.eventhandler.CampanaPublicada;
import com.crowdfunding.contribution.domain.model.EstadoCampanaAportable;
import com.crowdfunding.contribution.infrastructure.messaging.LectorEventosCampana;
import com.crowdfunding.contribution.infrastructure.messaging.MensajeInvalidoExcepcion;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Lee los mensajes de campaign-service tal como están en las fichas {@code CampanaPublicada} y
 * {@code CampanaCerrada} de docs/contratos-de-eventos.md. Mientras campaign-service no exista,
 * estos ejemplos son la garantía de que los dos servicios van a encajar.
 */
class LectorEventosCampanaTest {

  /** El ejemplo completo de la ficha CampanaPublicada. */
  private static final String CAMPANA_PUBLICADA =
      """
      {
        "idEvento": "c2b5d4e1-789a-4c12-9b2e-f1a234567890",
        "tipoEvento": "campana.publicada",
        "version": 1,
        "ocurridoEn": "2026-11-07T14:00:00Z",
        "datos": {
          "idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
          "idOrganizador": "e3b68016-9750-41b3-9e34-762dd8346001",
          "titulo": "Libros para la biblioteca",
          "historia": "Queremos ampliar la colección de la biblioteca del barrio.",
          "categoria": "EDUCACION",
          "rutaPortada": "/imagenes/biblioteca.jpg",
          "metaFinanciera": "5000.00",
          "moneda": "BOB",
          "fechaLimite": "2026-12-01T00:00:00Z"
        }
      }
      """;

  private final LectorEventosCampana lector = new LectorEventosCampana();

  @Test
  void leeElEjemploDeLaFichaCampanaPublicada() {
    CampanaPublicada evento = (CampanaPublicada) leer(CAMPANA_PUBLICADA);

    assertThat(evento.idEvento())
        .isEqualTo(UUID.fromString("c2b5d4e1-789a-4c12-9b2e-f1a234567890"));
    assertThat(evento.idCampana())
        .isEqualTo(UUID.fromString("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"));
    assertThat(evento.idOrganizador())
        .isEqualTo(UUID.fromString("e3b68016-9750-41b3-9e34-762dd8346001"));
    assertThat(evento.titulo()).isEqualTo("Libros para la biblioteca");
    assertThat(evento.moneda()).isEqualTo("BOB");
    assertThat(evento.fechaLimite()).isEqualTo(Instant.parse("2026-12-01T00:00:00Z"));
  }

  @Test
  void aceptaLaFechaLimiteConDesplazamientoEnVezDeZ() {
    CampanaPublicada evento =
        (CampanaPublicada)
            leer(CAMPANA_PUBLICADA.replace("2026-12-01T00:00:00Z", "2026-11-30T20:00:00-04:00"));

    assertThat(evento.fechaLimite()).isEqualTo(Instant.parse("2026-12-01T00:00:00Z"));
  }

  @ParameterizedTest
  @CsvSource({
    "FINALIZADA, META_ALCANZADA, FINALIZADA",
    "FINALIZADA, PLAZO_VENCIDO, FINALIZADA",
    "CANCELADA, CANCELACION, CANCELADA"
  })
  void leeLaFichaCampanaCerradaConSuEstadoFinal(
      String estadoFinal, String motivoCierre, EstadoCampanaAportable esperado) {
    CampanaCerrada evento =
        (CampanaCerrada)
            leer(
                campanaCerrada(
                    """
                    "idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
                    "estadoFinal": "%s",
                    "motivoCierre": "%s"
                    """
                        .formatted(estadoFinal, motivoCierre)));

    assertThat(evento.idEvento())
        .isEqualTo(UUID.fromString("7f1c2a90-6f0e-4d0b-9a57-3d1f1f6f2b11"));
    assertThat(evento.idCampana())
        .isEqualTo(UUID.fromString("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"));
    assertThat(evento.estadoFinal()).isEqualTo(esperado);
  }

  @ParameterizedTest
  @CsvSource({"CANCELACION, CANCELADA", "META_ALCANZADA, FINALIZADA", "PLAZO_VENCIDO, FINALIZADA"})
  void siSoloVieneElMotivoDeCierreDeduceElEstadoFinal(
      String motivoCierre, EstadoCampanaAportable esperado) {
    CampanaCerrada evento =
        (CampanaCerrada)
            leer(
                campanaCerrada(
                    """
                    "idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
                    "motivoCierre": "%s"
                    """
                        .formatted(motivoCierre)));

    assertThat(evento.estadoFinal()).isEqualTo(esperado);
  }

  @Test
  void unEstadoFinalQueElContratoNoAdmiteEsUnMensajeInvalido() {
    String mensaje =
        campanaCerrada(
            """
            "idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
            "estadoFinal": "PUBLICADA",
            "motivoCierre": "CANCELACION"
            """);

    assertThatThrownBy(() -> leer(mensaje)).isInstanceOf(MensajeInvalidoExcepcion.class);
  }

  @Test
  void unCierreSinEstadoFinalNiMotivoEsUnMensajeInvalido() {
    String mensaje =
        campanaCerrada(
            """
            "idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
            """);

    assertThatThrownBy(() -> leer(mensaje)).isInstanceOf(MensajeInvalidoExcepcion.class);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "esto no es json",
        "[]",
        "{}",
        // Sin datos.
        """
        {"idEvento": "c2b5d4e1-789a-4c12-9b2e-f1a234567890", "tipoEvento": "campana.publicada"}
        """,
        // Un tipo de evento que este servicio no consume.
        """
        {"idEvento": "c2b5d4e1-789a-4c12-9b2e-f1a234567890", "tipoEvento": "meta.alcanzada",
         "datos": {"idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"}}
        """,
        // El idEvento no es un UUID.
        """
        {"idEvento": "abc", "tipoEvento": "campana.cerrada",
         "datos": {"idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", "estadoFinal": "CANCELADA"}}
        """,
        // Falta el organizador.
        """
        {"idEvento": "c2b5d4e1-789a-4c12-9b2e-f1a234567890", "tipoEvento": "campana.publicada",
         "datos": {"idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", "titulo": "Libros",
                   "moneda": "BOB", "fechaLimite": "2026-12-01T00:00:00Z"}}
        """,
        // La fecha límite no es una fecha.
        """
        {"idEvento": "c2b5d4e1-789a-4c12-9b2e-f1a234567890", "tipoEvento": "campana.publicada",
         "datos": {"idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
                   "idOrganizador": "e3b68016-9750-41b3-9e34-762dd8346001", "titulo": "Libros",
                   "moneda": "BOB", "fechaLimite": "mañana"}}
        """
      })
  void unMensajeQueNoCumpleElContratoSeRechaza(String mensaje) {
    assertThatThrownBy(() -> leer(mensaje)).isInstanceOf(MensajeInvalidoExcepcion.class);
  }

  private Command<Voidy> leer(String mensaje) {
    return lector.leer(mensaje.getBytes(StandardCharsets.UTF_8));
  }

  /** El sobre de un {@code campana.cerrada} con esos campos en {@code datos}. */
  private static String campanaCerrada(String datos) {
    return """
    {
      "idEvento": "7f1c2a90-6f0e-4d0b-9a57-3d1f1f6f2b11",
      "tipoEvento": "campana.cerrada",
      "version": 1,
      "ocurridoEn": "2026-11-20T09:00:00Z",
      "datos": { %s }
    }
    """
        .formatted(datos);
  }
}
