package com.crowdfunding.campaign.infrastructure.messaging;

import com.crowdfunding.campaign.infrastructure.persistence.EventoSalidaJpaEntity;
import com.crowdfunding.campaign.infrastructure.persistence.SpringDataEventoSalidaJpaRepository;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageBuilder;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(
    name = "campana.mensajeria.publicador-habilitado",
    havingValue = "true",
    matchIfMissing = true)
public class PublicadorOutboxRabbitMq {

  private static final Logger log = LoggerFactory.getLogger(PublicadorOutboxRabbitMq.class);

  private final SpringDataEventoSalidaJpaRepository eventoSalidaRepository;
  private final RabbitTemplate rabbitTemplate;
  private final String nombreExchange;

  public PublicadorOutboxRabbitMq(
      SpringDataEventoSalidaJpaRepository eventoSalidaRepository,
      RabbitTemplate rabbitTemplate,
      @Value("${campana.mensajeria.exchange:suertudometro.events}") String nombreExchange) {
    this.eventoSalidaRepository = Objects.requireNonNull(eventoSalidaRepository);
    this.rabbitTemplate = Objects.requireNonNull(rabbitTemplate);
    this.nombreExchange = Objects.requireNonNull(nombreExchange);
  }

  @Scheduled(fixedDelayString = "${campana.mensajeria.intervalo-outbox-ms:2000}")
  @Transactional
  public int publicarPendientes() {
    List<EventoSalidaJpaEntity> pendientes =
        eventoSalidaRepository.findTop50ByPublicadoEnIsNullOrderByOcurridoEnAsc();

    int publicados = 0;
    for (EventoSalidaJpaEntity evento : pendientes) {
      try {
        Message mensaje =
            MessageBuilder.withBody(evento.obtenerContenido().getBytes(StandardCharsets.UTF_8))
                .setContentType(MessageProperties.CONTENT_TYPE_JSON)
                .setContentEncoding(StandardCharsets.UTF_8.name())
                .setDeliveryMode(MessageDeliveryMode.PERSISTENT)
                .setMessageId(evento.obtenerIdEvento().toString())
                .build();

        rabbitTemplate.send(nombreExchange, evento.obtenerRoutingKey(), mensaje);
        evento.marcarComoPublicado(Instant.now());
        eventoSalidaRepository.save(evento);
        publicados++;
      } catch (Exception ex) {
        log.warn(
            "No se pudo publicar el evento {} ({}); se reintentara en el siguiente ciclo: {}",
            evento.obtenerIdEvento(),
            evento.obtenerTipoEvento(),
            ex.getMessage());
        break;
      }
    }
    return publicados;
  }
}
