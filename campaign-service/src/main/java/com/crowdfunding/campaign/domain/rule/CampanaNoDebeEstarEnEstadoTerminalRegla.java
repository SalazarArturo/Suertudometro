package com.crowdfunding.campaign.domain.rule;

import com.crowdfunding.campaign.domain.model.EstadoCampana;
import com.crowdfunding.campaign.sharedkernel.ReglaDeNegocio;

public record CampanaNoDebeEstarEnEstadoTerminalRegla(EstadoCampana estadoActual)
    implements ReglaDeNegocio {

  @Override
  public boolean esInvalida() {
    return estadoActual.esTerminal();
  }

  @Override
  public String obtenerMensaje() {
    return "La campana ya se encuentra en un estado terminal ("
        + estadoActual
        + ") y no puede modificarse";
  }

  @Override
  public String obtenerCodigo() {
    return "campana-en-estado-terminal";
  }
}
