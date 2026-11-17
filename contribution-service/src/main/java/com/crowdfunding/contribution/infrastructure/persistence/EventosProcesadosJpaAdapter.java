package com.crowdfunding.contribution.infrastructure.persistence;

import com.crowdfunding.contribution.application.port.EventosProcesadosPuerto;
import java.time.Clock;
import java.util.UUID;
import org.springframework.stereotype.Repository;

/** Idempotencia de los consumidores sobre la tabla {@code eventos_procesados}. */
@Repository
public class EventosProcesadosJpaAdapter implements EventosProcesadosPuerto {

  private final EventoProcesadoJpaRepository eventosProcesados;
  private final Clock reloj;

  public EventosProcesadosJpaAdapter(EventoProcesadoJpaRepository eventosProcesados, Clock reloj) {
    this.eventosProcesados = eventosProcesados;
    this.reloj = reloj;
  }

  @Override
  public boolean registrarSiEsNuevo(UUID idEvento, String tipoEvento) {
    return eventosProcesados.insertarSiNoExiste(idEvento, tipoEvento, reloj.instant()) == 1;
  }
}
