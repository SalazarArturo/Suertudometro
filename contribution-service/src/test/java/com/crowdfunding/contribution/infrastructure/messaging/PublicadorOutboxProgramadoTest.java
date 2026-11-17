package com.crowdfunding.contribution.infrastructure.messaging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.crowdfunding.contribution.infrastructure.persistence.EventoSalidaJpaEntity;
import com.crowdfunding.contribution.infrastructure.persistence.EventoSalidaJpaRepository;
import java.net.ConnectException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.AmqpConnectException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

/**
 * La segunda mitad del outbox, con RabbitMQ simulado: qué se envía y qué pasa si el envío falla.
 */
class PublicadorOutboxProgramadoTest {

  private static final Instant AHORA = Instant.parse("2026-11-14T15:30:00Z");
  private static final String EXCHANGE = "suertudometro.events";

  private final EventoSalidaJpaRepository eventosSalida = mock(EventoSalidaJpaRepository.class);
  private final RabbitTemplate rabbit = mock(RabbitTemplate.class);
  private final PublicadorOutboxProgramado publicador =
      new PublicadorOutboxProgramado(
          eventosSalida,
          rabbit,
          new PropiedadesMensajeria(
              EXCHANGE,
              "suertudometro.events.dlx",
              "contribution-service.campanas",
              "contribution-service.dlq"),
          Clock.fixed(AHORA, ZoneOffset.UTC));

  @Test
  void enviaCadaEventoPendienteConSuTipoComoRoutingKeyYLoMarcaPublicado() {
    EventoSalidaJpaEntity evento = pendiente("{\"tipoEvento\":\"aporte.registrado\"}");
    when(eventosSalida.findTop50ByPublicadoEnIsNullOrderByOcurridoEnAsc())
        .thenReturn(List.of(evento));

    publicador.publicarPendientes();

    ArgumentCaptor<Message> mensaje = ArgumentCaptor.forClass(Message.class);
    verify(rabbit).send(eq(EXCHANGE), eq("aporte.registrado"), mensaje.capture());
    // El cuerpo es el sobre tal como se guardó en el outbox, en UTF-8.
    assertThat(new String(mensaje.getValue().getBody(), StandardCharsets.UTF_8))
        .isEqualTo("{\"tipoEvento\":\"aporte.registrado\"}");
    assertThat(mensaje.getValue().getMessageProperties().getContentType())
        .isEqualTo("application/json");
    assertThat(mensaje.getValue().getMessageProperties().getMessageId())
        .isEqualTo(evento.getIdEvento().toString());
    // Persistente: el mensaje sobrevive a un reinicio de RabbitMQ.
    assertThat(mensaje.getValue().getMessageProperties().getDeliveryMode())
        .isEqualTo(MessageDeliveryMode.PERSISTENT);
    assertThat(evento.getPublicadoEn()).isEqualTo(AHORA);
  }

  @Test
  void siRabbitNoRespondeLosEventosQuedanPendientesYNoFalla() {
    EventoSalidaJpaEntity primero = pendiente("{\"n\":1}");
    EventoSalidaJpaEntity segundo = pendiente("{\"n\":2}");
    when(eventosSalida.findTop50ByPublicadoEnIsNullOrderByOcurridoEnAsc())
        .thenReturn(List.of(primero, segundo));
    doThrow(new AmqpConnectException(new ConnectException("Connection refused")))
        .when(rabbit)
        .send(any(String.class), any(String.class), any(Message.class));

    assertThatCode(publicador::publicarPendientes).doesNotThrowAnyException();

    // No sigue intentando con el resto: se reintenta todo en la siguiente vuelta.
    verify(rabbit, times(1)).send(any(String.class), any(String.class), any(Message.class));
    assertThat(primero.getPublicadoEn()).isNull();
    assertThat(segundo.getPublicadoEn()).isNull();
  }

  @Test
  void siFallaAMitadDelLoteLosYaEnviadosQuedanMarcados() {
    EventoSalidaJpaEntity primero = pendiente("{\"n\":1}");
    EventoSalidaJpaEntity segundo = pendiente("{\"n\":2}");
    when(eventosSalida.findTop50ByPublicadoEnIsNullOrderByOcurridoEnAsc())
        .thenReturn(List.of(primero, segundo));
    doNothing()
        .doThrow(new AmqpConnectException(new ConnectException("Connection refused")))
        .when(rabbit)
        .send(any(String.class), any(String.class), any(Message.class));

    publicador.publicarPendientes();

    assertThat(primero.getPublicadoEn()).isEqualTo(AHORA);
    assertThat(segundo.getPublicadoEn()).isNull();
  }

  @Test
  void sinEventosPendientesNoTocaRabbit() {
    when(eventosSalida.findTop50ByPublicadoEnIsNullOrderByOcurridoEnAsc()).thenReturn(List.of());

    publicador.publicarPendientes();

    verify(rabbit, never()).send(any(String.class), any(String.class), any(Message.class));
  }

  private static EventoSalidaJpaEntity pendiente(String contenido) {
    return new EventoSalidaJpaEntity(UUID.randomUUID(), "aporte.registrado", contenido, AHORA);
  }
}
