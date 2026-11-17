package com.crowdfunding.contribution.domain.model;

/**
 * Estados de una campaña que le importan a este servicio. Antes de publicarse (BORRADOR y
 * EN_REVISION) la campaña no llega aquí, porque campaign-service todavía no la anunció.
 */
public enum EstadoCampanaAportable {
  PUBLICADA,
  FINALIZADA,
  CANCELADA;

  /** FINALIZADA y CANCELADA son terminales: no admiten cambios ni aportes (ADR 0003). */
  public boolean esTerminal() {
    return this != PUBLICADA;
  }
}
