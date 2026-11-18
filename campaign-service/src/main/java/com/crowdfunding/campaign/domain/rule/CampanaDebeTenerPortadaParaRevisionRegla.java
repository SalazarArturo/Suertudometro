package com.crowdfunding.campaign.domain.rule;

import com.crowdfunding.campaign.sharedkernel.ReglaDeNegocio;

public record CampanaDebeTenerPortadaParaRevisionRegla(boolean tienePortada)
    implements ReglaDeNegocio {

  @Override
  public boolean esInvalida() {
    return !tienePortada;
  }

  @Override
  public String obtenerMensaje() {
    return "La campana debe tener al menos una imagen de portada para enviarse a revision";
  }

  @Override
  public String obtenerCodigo() {
    return "campana-sin-portada";
  }
}
