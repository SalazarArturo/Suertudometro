package com.crowdfunding.contribution.infrastructure.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Piezas técnicas comunes: el reloj y las tareas programadas (el publicador del outbox). */
@Configuration
@EnableScheduling
public class ConfiguracionGeneral {

  /** El reloj del servicio, siempre en UTC. Las pruebas lo reemplazan por uno fijo. */
  @Bean
  Clock reloj() {
    return Clock.systemUTC();
  }
}
