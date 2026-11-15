package com.crowdfunding.contribution.infrastructure.messaging;

/**
 * El mensaje recibido no cumple el contrato. Como cualquier mensaje que falla, pasa por los
 * reintentos y termina en la cola de errores (DLQ), donde se puede revisar.
 */
public class MensajeInvalidoExcepcion extends RuntimeException {

  public MensajeInvalidoExcepcion(String mensaje) {
    super(mensaje);
  }

  public MensajeInvalidoExcepcion(String mensaje, Throwable causa) {
    super(mensaje, causa);
  }
}
