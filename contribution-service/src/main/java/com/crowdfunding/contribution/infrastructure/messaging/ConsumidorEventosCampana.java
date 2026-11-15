package com.crowdfunding.contribution.infrastructure.messaging;

import an.awesome.pipelinr.Command;
import an.awesome.pipelinr.Pipeline;
import an.awesome.pipelinr.Voidy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Recibe de RabbitMQ los eventos {@code campana.publicada} y {@code campana.cerrada} y los entrega
 * a la capa de aplicación por el pipeline. Los manejadores son idempotentes por {@code idEvento}.
 *
 * <p>Si el manejo falla, Spring AMQP lo reintenta unas pocas veces (application.yml) y, si sigue
 * fallando, rechaza el mensaje sin reencolarlo: RabbitMQ lo deja en la cola de errores (DLQ).
 */
@Component
public class ConsumidorEventosCampana {

  private static final Logger LOG = LoggerFactory.getLogger(ConsumidorEventosCampana.class);

  private final LectorEventosCampana lector;
  private final Pipeline pipeline;

  public ConsumidorEventosCampana(LectorEventosCampana lector, Pipeline pipeline) {
    this.lector = lector;
    this.pipeline = pipeline;
  }

  @RabbitListener(queues = "${suertudometro.mensajeria.cola}")
  public void recibir(Message mensaje) {
    Command<Voidy> evento;
    try {
      evento = lector.leer(mensaje.getBody());
    } catch (MensajeInvalidoExcepcion error) {
      LOG.warn(
          "Mensaje que no cumple el contrato (routing key {}): {}",
          mensaje.getMessageProperties().getReceivedRoutingKey(),
          error.getMessage());
      throw error;
    }
    pipeline.send(evento);
  }
}
