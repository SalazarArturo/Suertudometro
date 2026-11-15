package com.crowdfunding.contribution.domain.valueobject;

import com.crowdfunding.contribution.sharedkernel.ObjetoDeValor;
import java.util.Objects;
import java.util.UUID;

/** Identificador del usuario que organiza una campaña. */
public record IdOrganizador(UUID valor) implements ObjetoDeValor {

  public IdOrganizador {
    Objects.requireNonNull(valor, "El id del organizador es obligatorio");
  }
}
