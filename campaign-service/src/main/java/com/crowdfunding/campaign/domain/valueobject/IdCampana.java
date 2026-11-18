package com.crowdfunding.campaign.domain.valueobject;

import com.crowdfunding.campaign.sharedkernel.ObjetoDeValor;
import java.util.Objects;
import java.util.UUID;

public record IdCampana(UUID valor)
    implements ObjetoDeValor { // esto es directamente un constructor ?

  // y estos metodos validan las properties que asignamos al constructor ????
  // debo entender mejor la anatomia de un record
  public IdCampana {
    Objects.requireNonNull(valor, "El identificador de la campana es obligatorio");
  }

  public static IdCampana nuevo() {
    return new IdCampana(UUID.randomUUID());
  }

  public static IdCampana de(UUID valor) {
    return new IdCampana(valor);
  }
}
