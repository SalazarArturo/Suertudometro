package com.crowdfunding.campaign.domain.rule;

import com.crowdfunding.campaign.domain.model.EstadoCampana;
import com.crowdfunding.campaign.sharedkernel.ReglaDeNegocio;

public record CampanaDebeEstarPublicadaRegla(EstadoCampana estadoActual, String accion)
    implements ReglaDeNegocio {

  @Override
  public boolean esInvalida() {
    return estadoActual != EstadoCampana.PUBLICADA;
  }

  @Override
  public String obtenerMensaje() {
    return "Solo se puede " + accion + " cuando la campana esta PUBLICADA";
  }

  @Override
  public String obtenerCodigo() {
    return "campana-no-esta-publicada";
  }
}
