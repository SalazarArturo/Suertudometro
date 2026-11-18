package com.crowdfunding.campaign.domain.valueobject;

import com.crowdfunding.campaign.sharedkernel.ObjetoDeValor;
import java.time.Instant;
import java.util.Objects;

public record PlazoCampana(Instant fechaLimite) implements ObjetoDeValor {

  public PlazoCampana {
    Objects.requireNonNull(fechaLimite, "La fecha limite de la campana es obligatoria");
  }

  public boolean estaVencidoEn(Instant momentoActual) {

    Objects.requireNonNull(momentoActual, "El momento actual es obligatorio");
    return !momentoActual.isBefore(this.fechaLimite);
  }
}
