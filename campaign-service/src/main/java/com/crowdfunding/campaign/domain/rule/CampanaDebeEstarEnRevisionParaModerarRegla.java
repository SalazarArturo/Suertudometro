package com.crowdfunding.campaign.domain.rule;

import com.crowdfunding.campaign.domain.model.EstadoCampana;
import com.crowdfunding.campaign.sharedkernel.ReglaDeNegocio;

public record CampanaDebeEstarEnRevisionParaModerarRegla(EstadoCampana estadoActual)
    implements ReglaDeNegocio {

  @Override
  public boolean esInvalida() {
    return estadoActual != EstadoCampana.EN_REVISION;
  }

  @Override
  public String obtenerMensaje() {
    return "Solo se puede aprobar o rechazar una campana que este EN_REVISION";
  }

  @Override
  public String obtenerCodigo() {
    return "campana-no-esta-en-revision";
  }
}
