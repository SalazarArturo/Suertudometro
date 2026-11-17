package com.crowdfunding.contribution.domain.rule;

import com.crowdfunding.contribution.sharedkernel.Dinero;
import com.crowdfunding.contribution.sharedkernel.ReglaDeNegocio;

/**
 * R1: el monto de un aporte es mayor que cero. No hay monto mínimo de negocio. Los dos decimales y
 * el máximo técnico los garantiza {@link Dinero}.
 */
public record MontoDeAporteDebeSerMayorQueCeroRegla(Dinero monto) implements ReglaDeNegocio {

  @Override
  public boolean seCumple() {
    return monto != null && monto.esMayorQueCero();
  }

  @Override
  public String codigo() {
    return Dinero.CODIGO_MONTO_INVALIDO;
  }

  @Override
  public String mensaje() {
    return "El monto del aporte debe ser mayor que cero.";
  }
}
