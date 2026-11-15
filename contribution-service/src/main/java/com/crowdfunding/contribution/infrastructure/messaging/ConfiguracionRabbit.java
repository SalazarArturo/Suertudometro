package com.crowdfunding.contribution.infrastructure.messaging;

import com.crowdfunding.contribution.application.eventhandler.CampanaCerrada;
import com.crowdfunding.contribution.application.eventhandler.CampanaPublicada;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Declara en RabbitMQ lo que necesita este servicio (docs/stack-y-convenciones.md §5.5): el
 * exchange topic del sistema, su cola para los eventos de campañas y su cola de errores (DLQ).
 * Declarar algo que ya existe con las mismas características no hace nada, así que no importa qué
 * servicio arranque primero.
 */
@Configuration
@EnableConfigurationProperties(PropiedadesMensajeria.class)
public class ConfiguracionRabbit {

  /** Routing key con la que los mensajes rechazados de este servicio llegan a su DLQ. */
  static final String CLAVE_ERRORES = "contribution-service";

  @Bean
  Declarables topologiaDeMensajeria(PropiedadesMensajeria propiedades) {
    TopicExchange eventos = new TopicExchange(propiedades.exchange(), true, false);
    DirectExchange errores = new DirectExchange(propiedades.exchangeErrores(), true, false);

    Queue cola =
        QueueBuilder.durable(propiedades.cola())
            .deadLetterExchange(propiedades.exchangeErrores())
            .deadLetterRoutingKey(CLAVE_ERRORES)
            .build();
    Queue colaErrores = QueueBuilder.durable(propiedades.colaErrores()).build();

    return new Declarables(
        eventos,
        errores,
        cola,
        colaErrores,
        BindingBuilder.bind(cola).to(eventos).with(CampanaPublicada.TIPO_EVENTO),
        BindingBuilder.bind(cola).to(eventos).with(CampanaCerrada.TIPO_EVENTO),
        BindingBuilder.bind(colaErrores).to(errores).with(CLAVE_ERRORES));
  }
}
