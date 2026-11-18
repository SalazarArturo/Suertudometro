package com.crowdfunding.campaign.domain.valueobject;

import com.crowdfunding.campaign.sharedkernel.Dinero;
import com.crowdfunding.campaign.sharedkernel.ObjetoDeValor;
import java.util.Objects;

public record MetaFinanciera(Dinero dinero) implements ObjetoDeValor {

  public static final Dinero MINIMO_BOB = Dinero.de("100.00", Dinero.MONEDA_BOB);

  public MetaFinanciera {

    Objects.requireNonNull(dinero, "La meta financiera es obligatoria");
    if (!dinero.esMayorOIgualQue(MINIMO_BOB)) {
      throw new IllegalArgumentException("La meta financiera minima permitida es de 100.00 BOB");
    }
  }

  public static MetaFinanciera de(Dinero dinero) {
    return new MetaFinanciera(dinero);
  }

  public boolean fueAlcanzadaPor(Dinero montoRecaudado) {
    return montoRecaudado.esMayorOIgualQue(this.dinero);
  }
}
