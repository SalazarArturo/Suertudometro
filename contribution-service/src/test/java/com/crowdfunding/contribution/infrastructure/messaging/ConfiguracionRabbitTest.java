package com.crowdfunding.contribution.infrastructure.messaging;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;

/** La topología que el servicio declara en RabbitMQ: exchange, cola, DLQ y sus enlaces. */
class ConfiguracionRabbitTest {

  private final Declarables topologia =
      new ConfiguracionRabbit()
          .topologiaDeMensajeria(
              new PropiedadesMensajeria(
                  "suertudometro.events",
                  "suertudometro.events.dlx",
                  "contribution-service.campanas",
                  "contribution-service.dlq"));

  @Test
  void declaraElExchangeTopicDelSistemaYElDeErrores() {
    assertThat(topologia.getDeclarablesByType(TopicExchange.class))
        .singleElement()
        .satisfies(exchange -> {
          assertThat(exchange.getName()).isEqualTo("suertudometro.events");
          assertThat(exchange.isDurable()).isTrue();
        });
    assertThat(topologia.getDeclarablesByType(DirectExchange.class))
        .singleElement()
        .satisfies(exchange -> {
          assertThat(exchange.getName()).isEqualTo("suertudometro.events.dlx");
          assertThat(exchange.isDurable()).isTrue();
        });
  }

  @Test
  void laColaDelServicioMandaLosRechazadosASuColaDeErrores() {
    List<Queue> colas = topologia.getDeclarablesByType(Queue.class);

    assertThat(colas)
        .extracting(Queue::getName)
        .containsExactlyInAnyOrder("contribution-service.campanas", "contribution-service.dlq");
    assertThat(colas).allMatch(Queue::isDurable);

    Queue cola =
        colas.stream()
            .filter(candidata -> candidata.getName().equals("contribution-service.campanas"))
            .findFirst()
            .orElseThrow();
    assertThat(cola.getArguments())
        .containsEntry("x-dead-letter-exchange", "suertudometro.events.dlx")
        .containsEntry("x-dead-letter-routing-key", "contribution-service");
  }

  @Test
  void laColaRecibeSoloLosDosEventosDeCampanasQueConsumeElServicio() {
    List<Binding> enlaces = topologia.getDeclarablesByType(Binding.class);

    assertThat(enlaces)
        .filteredOn(enlace -> enlace.getExchange().equals("suertudometro.events"))
        .allMatch(enlace -> enlace.getDestination().equals("contribution-service.campanas"))
        .extracting(Binding::getRoutingKey)
        .containsExactlyInAnyOrder("campana.publicada", "campana.cerrada");

    assertThat(enlaces)
        .filteredOn(enlace -> enlace.getExchange().equals("suertudometro.events.dlx"))
        .singleElement()
        .satisfies(enlace -> {
          assertThat(enlace.getDestination()).isEqualTo("contribution-service.dlq");
          assertThat(enlace.getRoutingKey()).isEqualTo("contribution-service");
        });
  }
}
