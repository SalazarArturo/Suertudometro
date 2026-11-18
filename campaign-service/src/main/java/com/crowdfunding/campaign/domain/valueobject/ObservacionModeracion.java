package com.crowdfunding.campaign.domain.valueobject;

import com.crowdfunding.campaign.sharedkernel.ObjetoDeValor;
import java.util.Objects;

public record ObservacionModeracion(String detalle) implements ObjetoDeValor {

  public static final int LONGITUD_MINIMA = 10;

  public ObservacionModeracion {

    Objects.requireNonNull(detalle, "Las observaciones de moderacion son obligatorias");
    detalle = detalle.trim();
    if (detalle.length() < LONGITUD_MINIMA) {
      throw new IllegalArgumentException(
          "Las observaciones de rechazo deben tener al menos 10 caracteres");
    }
  }
}
