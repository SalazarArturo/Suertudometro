package com.crowdfunding.campaign.domain.rule;

import com.crowdfunding.campaign.domain.valueobject.PlazoCampana;
import com.crowdfunding.campaign.sharedkernel.ReglaDeNegocio;
import java.time.Instant;

public record PlazoCampanaDebeSerFuturoRegla(PlazoCampana plazo, Instant momentoActual)
    implements ReglaDeNegocio {

  @Override
  public boolean esInvalida() {
    return plazo.estaVencidoEn(momentoActual);
  }

  @Override
  public String obtenerMensaje() {
    return "La fecha limite de la campana debe ser posterior a la fecha actual";
  }

  @Override
  public String obtenerCodigo() {
    return "fecha-limite-vencida";
  }
}
