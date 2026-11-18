package com.crowdfunding.campaign.sharedkernel;

public interface ReglaDeNegocio {

  boolean esInvalida();

  String obtenerMensaje();

  default String obtenerCodigo() { // esto como pa que ?
    return "regla-de-negocio-invalida";
  }
}
