package com.crowdfunding.contribution.infrastructure.config;

import an.awesome.pipelinr.Command;
import an.awesome.pipelinr.CommandHandlers;
import an.awesome.pipelinr.Pipeline;
import an.awesome.pipelinr.Pipelinr;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.FilterType;

/**
 * Arma el mediador de CQRS (PipelinR). Los controladores y el consumidor de RabbitMQ envían un
 * comando o una consulta al {@link Pipeline}, y él encuentra su manejador.
 *
 * <p>El {@code @ComponentScan} registra como beans todos los manejadores de la capa de aplicación.
 * Así esa capa no necesita ninguna anotación de Spring.
 */
@Configuration
@ComponentScan(
    basePackages = "com.crowdfunding.contribution.application",
    useDefaultFilters = false,
    includeFilters =
        @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = Command.Handler.class))
public class ConfiguracionPipelinr {

  @Bean
  @SuppressWarnings("rawtypes")
  Pipeline pipeline(
      ObjectProvider<Command.Handler> manejadores, ObjectProvider<Command.Middleware> middlewares) {
    // Las variables dicen qué es cada cosa: Pipelinr tiene varios métodos `with` y, sin el tipo,
    // el compilador no sabe cuál elegir.
    CommandHandlers todosLosManejadores = manejadores::stream;
    Command.Middlewares todosLosMiddlewares = middlewares::orderedStream;
    return new Pipelinr().with(todosLosManejadores).with(todosLosMiddlewares);
  }
}
