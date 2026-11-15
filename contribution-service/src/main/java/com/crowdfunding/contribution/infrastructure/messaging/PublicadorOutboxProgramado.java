package com.crowdfunding.contribution.infrastructure.messaging;

import com.crowdfunding.contribution.infrastructure.persistence.EventoSalidaJpaEntity;
import com.crowdfunding.contribution.infrastructure.persistence.EventoSalidaJpaRepository;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Transactional Outbox, segunda mitad: cada pocos segundos envía a RabbitMQ los eventos pendientes
 * de {@code eventos_salida} y los marca como publicados.
 *
 * <p>Si RabbitMQ no responde, los eventos quedan pendientes y se reintentan en la siguiente vuelta.
 * Si el servicio se cae después de enviar y antes de marcar, el evento se envía otra vez: por eso
 * los consumidores son idempotentes por {@code idEvento}.
 */
@Component
public class PublicadorOutboxProgramado {

  private static final Logger LOG = LoggerFactory.getLogger(PublicadorOutboxProgramado.class);

  private final EventoSalidaJpaRepository eventosSalida;
  private final RabbitTemplate rabbit;
  private final PropiedadesMensajeria propiedades;
  private final Clock reloj;

  public PublicadorOutboxProgramado(
      EventoSalidaJpaRepository eventosSalida,
      RabbitTemplate rabbit,
      PropiedadesMensajeria propiedades,
      Clock reloj) {
    this.eventosSalida = eventosSalida;
    this.rabbit = rabbit;
    this.propiedades = propiedades;
    this.reloj = reloj;
  }

  @Scheduled(fixedDelayString = "${suertudometro.outbox.intervalo-ms:2000}")
  @Transactional
  public void publicarPendientes() {
    List<EventoSalidaJpaEntity> pendientes =
        eventosSalida.findTop50ByPublicadoEnIsNullOrderByOcurridoEnAsc();
    for (EventoSalidaJpaEntity evento : pendientes) {
      try {
        // La routing key es el tipo de evento: aporte.registrado.
        rabbit.send(propiedades.exchange(), evento.getTipoEvento(), aMensaje(evento));
      } catch (AmqpException error) {
        LOG.warn(
            "RabbitMQ no está disponible; los eventos pendientes se reintentan luego: {}",
            error.getMessage());
        return;
      }
      evento.marcarPublicado(reloj.instant());
    }
  }

  private static Message aMensaje(EventoSalidaJpaEntity evento) {
    return MessageBuilder.withBody(evento.getContenido().getBytes(StandardCharsets.UTF_8))
        .setContentType(MessageProperties.CONTENT_TYPE_JSON)
        .setContentEncoding(StandardCharsets.UTF_8.name())
        .setMessageId(evento.getIdEvento().toString())
        .setDeliveryMode(MessageDeliveryMode.PERSISTENT)
        .build();
  }
}
