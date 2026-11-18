package com.crowdfunding.campaign.domain.valueobject;

import com.crowdfunding.campaign.sharedkernel.ObjetoDeValor;
import java.util.Objects;
import java.util.UUID;

public record IdImagenCampana(UUID valor) implements ObjetoDeValor {

  public IdImagenCampana {
    Objects.requireNonNull(valor, "El identificador de la imagen es obligatorio");
  }

  public static IdImagenCampana nuevo() {
    return new IdImagenCampana(UUID.randomUUID());
  }

  public static IdImagenCampana de(UUID valor) {
    return new IdImagenCampana(valor);
  }
}
