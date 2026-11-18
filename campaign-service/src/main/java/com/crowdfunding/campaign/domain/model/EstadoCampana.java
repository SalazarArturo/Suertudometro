package com.crowdfunding.campaign.domain.model;

public enum EstadoCampana {
  BORRADOR,
  EN_REVISION,
  PUBLICADA,
  FINALIZADA,
  CANCELADA;

  public boolean esTerminal() {
    return this == FINALIZADA || this == CANCELADA;
  }
}
