package com.crowdfunding.contribution.domain.valueobject;

import com.crowdfunding.contribution.sharedkernel.ObjetoDeValor;
import java.util.Objects;
import java.util.UUID;

/** Identificador de un aporte. Lo genera este servicio. */
public record IdAporte(UUID valor) implements ObjetoDeValor {

  public IdAporte {
    Objects.requireNonNull(valor, "El id del aporte es obligatorio");
  }

  public static IdAporte nuevo() {
    return new IdAporte(UUID.randomUUID());
  }
}
