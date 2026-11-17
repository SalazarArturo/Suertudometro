package com.crowdfunding.contribution.infrastructure.messaging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import an.awesome.pipelinr.Pipeline;
import com.crowdfunding.contribution.application.eventhandler.CampanaCerrada;
import com.crowdfunding.contribution.application.eventhandler.CampanaPublicada;
import com.crowdfunding.contribution.domain.model.EstadoCampanaAportable;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;

/** El consumidor, sin RabbitMQ: qué entrega a la capa de aplicación por cada mensaje. */
class ConsumidorEventosCampanaTest {

  private final Pipeline pipeline = mock(Pipeline.class);
  private final ConsumidorEventosCampana consumidor =
      new ConsumidorEventosCampana(new LectorEventosCampana(), pipeline);

  @Test
  void entregaLaPublicacionALaCapaDeAplicacion() {
    consumidor.recibir(
        mensaje(
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
                "moneda": "BOB",
                "fechaLimite": "2026-12-01T00:00:00Z"
              }
            }
            """));

    ArgumentCaptor<CampanaPublicada> evento = ArgumentCaptor.forClass(CampanaPublicada.class);
    verify(pipeline).send(evento.capture());
    assertThat(evento.getValue().idEvento())
        .isEqualTo(UUID.fromString("c2b5d4e1-789a-4c12-9b2e-f1a234567890"));
    assertThat(evento.getValue().titulo()).isEqualTo("Libros para la biblioteca");
  }

  @Test
  void entregaElCierreALaCapaDeAplicacion() {
    consumidor.recibir(
        mensaje(
            """
            {
              "idEvento": "7f1c2a90-6f0e-4d0b-9a57-3d1f1f6f2b11",
              "tipoEvento": "campana.cerrada",
              "version": 1,
              "ocurridoEn": "2026-11-20T09:00:00Z",
              "datos": {
                "idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
                "estadoFinal": "CANCELADA",
                "motivoCierre": "CANCELACION"
              }
            }
            """));

    ArgumentCaptor<CampanaCerrada> evento = ArgumentCaptor.forClass(CampanaCerrada.class);
    verify(pipeline).send(evento.capture());
    assertThat(evento.getValue().estadoFinal()).isEqualTo(EstadoCampanaAportable.CANCELADA);
  }

  @Test
  void unMensajeInvalidoSeRechazaSinLlegarALaAplicacion() {
    // La excepción hace que Spring AMQP rechace el mensaje y RabbitMQ lo mande a la DLQ.
    assertThatThrownBy(() -> consumidor.recibir(mensaje("{ esto no es json")))
        .isInstanceOf(MensajeInvalidoExcepcion.class);

    verifyNoInteractions(pipeline);
  }

  private static Message mensaje(String json) {
    return MessageBuilder.withBody(json.getBytes(StandardCharsets.UTF_8)).build();
  }
}
