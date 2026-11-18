package com.crowdfunding.campaign.domain.valueobject;

import com.crowdfunding.campaign.sharedkernel.ObjetoDeValor;
import java.util.Objects;
import java.util.UUID;

public record IdOrganizador(UUID valor) implements ObjetoDeValor {

  public IdOrganizador {
    Objects.requireNonNull(valor, "El identificador del organizador es obligatorio");
  }

  public static IdOrganizador de(UUID valor) {
    return new IdOrganizador(valor);
  }
}
