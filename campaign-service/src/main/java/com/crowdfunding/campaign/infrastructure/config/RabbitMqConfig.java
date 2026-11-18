package com.crowdfunding.campaign.infrastructure.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

  public static final String ROUTING_KEY_APORTE_REGISTRADO = "aporte.registrado";

  @Bean
  public TopicExchange exchangeEventos(
      @Value("${campana.mensajeria.exchange:suertudometro.events}") String nombreExchange) {
    return new TopicExchange(nombreExchange, true, false);
  }

  @Bean
  public DirectExchange exchangeDlx(
      @Value("${campana.mensajeria.dlx:suertudometro.events.dlx}") String nombreDlx) {
    return new DirectExchange(nombreDlx, true, false);
  }

  @Bean
  public Queue colaDlq(
      @Value("${campana.mensajeria.cola-dlq:campaign-service.dlq}") String nombreColaDlq) {
    return QueueBuilder.durable(nombreColaDlq).build();
  }

  @Bean
  public Binding enlaceDlq(
      Queue colaDlq,
      DirectExchange exchangeDlx,
      @Value("${campana.mensajeria.dlq-routing-key:campaign-service}") String claveDlq) {
    return BindingBuilder.bind(colaDlq).to(exchangeDlx).with(claveDlq);
  }

  @Bean
  public Queue colaAportes(
      @Value("${campana.mensajeria.cola-aportes:campaign-service.aportes}") String nombreCola,
      @Value("${campana.mensajeria.dlx:suertudometro.events.dlx}") String nombreDlx,
      @Value("${campana.mensajeria.dlq-routing-key:campaign-service}") String claveDlq) {
    return QueueBuilder.durable(nombreCola)
        .deadLetterExchange(nombreDlx)
        .deadLetterRoutingKey(claveDlq)
        .build();
  }

  @Bean
  public Binding enlaceAporteRegistrado(Queue colaAportes, TopicExchange exchangeEventos) {
    return BindingBuilder.bind(colaAportes).to(exchangeEventos).with(ROUTING_KEY_APORTE_REGISTRADO);
  }
}
