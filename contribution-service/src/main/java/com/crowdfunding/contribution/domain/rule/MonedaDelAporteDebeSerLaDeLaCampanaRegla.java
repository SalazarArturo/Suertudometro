package com.crowdfunding.contribution.domain.rule;

import com.crowdfunding.contribution.domain.model.CampanaAportable;
import com.crowdfunding.contribution.sharedkernel.Dinero;
import com.crowdfunding.contribution.sharedkernel.ReglaDeNegocio;

/** R2: la moneda del aporte es la de la campaña. En la versión 1 siempre es BOB. */
public record MonedaDelAporteDebeSerLaDeLaCampanaRegla(Dinero monto, CampanaAportable campana)
    implements ReglaDeNegocio {

  @Override
  public boolean seCumple() {
    return monto.esDeMoneda(campana.moneda());
  }

  @Override
  public String codigo() {
    return "moneda-distinta-de-la-campana";
  }

  @Override
  public String mensaje() {
    return "La campaña recibe aportes en " + campana.moneda() + ", no en " + monto.moneda() + ".";
  }
}
