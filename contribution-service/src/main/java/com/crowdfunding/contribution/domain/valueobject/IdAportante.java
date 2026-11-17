package com.crowdfunding.contribution.domain.valueobject;

import com.crowdfunding.contribution.sharedkernel.ObjetoDeValor;
import java.util.Objects;
import java.util.UUID;

/** Identificador del usuario que aporta. Es el {@code sub} del token, que llega en X-Usuario-Id. */
public record IdAportante(UUID valor) implements ObjetoDeValor {

  public IdAportante {
    Objects.requireNonNull(valor, "El id del aportante es obligatorio");
  }
}
