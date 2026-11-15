package com.crowdfunding.contribution.application.port;

import java.util.UUID;

/** Puerto de salida: recuerda qué eventos ya se aplicaron, para no aplicarlos dos veces. */
public interface EventosProcesadosPuerto {

  /**
   * Anota el evento como procesado.
   *
   * @return {@code true} si es la primera vez que llega; {@code false} si ya se había procesado
   */
  boolean registrarSiEsNuevo(UUID idEvento, String tipoEvento);
}
