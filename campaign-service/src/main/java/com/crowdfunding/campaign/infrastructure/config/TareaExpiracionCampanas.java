package com.crowdfunding.campaign.infrastructure.config;

import an.awesome.pipelinr.Pipeline;
import com.crowdfunding.campaign.application.command.CerrarCampanasVencidasComando;
import java.time.Instant;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(
    name = "campana.tareas.expiracion-habilitada",
    havingValue = "true",
    matchIfMissing = true)
public class TareaExpiracionCampanas {

  private static final Logger log = LoggerFactory.getLogger(TareaExpiracionCampanas.class);

  private final Pipeline pipeline;

  public TareaExpiracionCampanas(Pipeline pipeline) {
    this.pipeline = Objects.requireNonNull(pipeline);
  }

  @Scheduled(fixedDelayString = "${campana.tareas.intervalo-expiracion-ms:60000}")
  public int ejecutarCierreDeVencidas() {
    int cerradas = pipeline.send(new CerrarCampanasVencidasComando(Instant.now()));
    if (cerradas > 0) {
      log.info("Se cerraron automaticamente {} campanas por vencimiento de plazo.", cerradas);
    }
    return cerradas;
  }
}
