package com.crowdfunding.contribution.domain.valueobject;

import com.crowdfunding.contribution.sharedkernel.ObjetoDeValor;
import java.util.Objects;
import java.util.UUID;

/** Identificador de una campaña. La campaña vive en campaign-service: aquí solo se referencia. */
public record IdCampana(UUID valor) implements ObjetoDeValor {

  public IdCampana {
    Objects.requireNonNull(valor, "El id de la campaña es obligatorio");
  }
}
